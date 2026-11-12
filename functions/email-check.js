"use strict";

const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;

function get(obj, path) {
  let cur = obj;
  for (const key of path) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = cur[key];
  }
  return cur;
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim() : "";
}

function looksLikeEmail(email) {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  if (/\s/.test(email)) return false;
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return false;
  if (email.indexOf("@") !== at) return false;
  if (at > MAX_LOCAL_LENGTH) return false;
  const domain = email.slice(at + 1);
  if (domain.indexOf(".") < 1 || domain.endsWith(".") || domain.includes("..")) return false;
  return true;
}

const accept = (checked) => ({ ok: true, checked });
const reject = (reason, checked) => ({ ok: false, reason, checked });

function interpretReacher(body, options) {
  const rejectDisposable = !options || options.rejectDisposable !== false;
  if (!body || typeof body !== "object") return null;
  const looksLikeResult =
    "is_reachable" in body || "syntax" in body || "mx" in body || "smtp" in body || "misc" in body;
  if (!looksLikeResult) return null;

  if (get(body, ["syntax", "is_valid_syntax"]) === false) return reject("invalid-syntax", "reacher");
  if (get(body, ["mx", "accepts_mail"]) === false) return reject("no-mail-server", "reacher");
  if (rejectDisposable && get(body, ["misc", "is_disposable"]) === true) return reject("disposable", "reacher");
  if (get(body, ["smtp", "is_disabled"]) === true) return reject("undeliverable", "reacher");
  if (get(body, ["smtp", "can_connect_smtp"]) === true && get(body, ["smtp", "is_deliverable"]) === false) {
    return reject("undeliverable", "reacher");
  }
  if (body.is_reachable === "invalid") return reject("undeliverable", "reacher");

  return accept("reacher");
}

async function checkWithReacher(email, opts) {
  const base = String((opts && opts.url) || "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("Reacher URL not configured");
  const fetchImpl = (opts && opts.fetchImpl) || fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), (opts && opts.timeoutMs) || 12000);
  try {
    const headers = { "Content-Type": "application/json" };
    if (opts && opts.secret) headers["x-reacher-secret"] = opts.secret;
    const res = await fetchImpl(base + "/v0/check_email", {
      method: "POST",
      headers,
      body: JSON.stringify({ to_email: email }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("Reacher HTTP " + res.status);
    const verdict = interpretReacher(await res.json(), opts);
    if (!verdict) throw new Error("Reacher returned an unreadable body");
    return verdict;
  } finally {
    clearTimeout(timer);
  }
}

async function checkWithDns(email, opts) {
  const dnsImpl = (opts && opts.dnsImpl) || require("dns").promises;
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  const isMissing = (err) => err && (err.code === "ENOTFOUND" || err.code === "ENODATA");

  try {
    const mx = await dnsImpl.resolveMx(domain);
    if (Array.isArray(mx) && mx.length > 0) {
      const nullMx = mx.length === 1 && (!mx[0].exchange || mx[0].exchange === ".");
      return nullMx ? reject("no-mail-server", "dns") : accept("dns");
    }
  } catch (err) {
    if (!isMissing(err)) return accept("skipped");
  }

  for (const lookup of ["resolve4", "resolve6"]) {
    try {
      const addrs = await dnsImpl[lookup](domain);
      if (Array.isArray(addrs) && addrs.length > 0) return accept("dns");
    } catch (err) {
      if (!isMissing(err)) return accept("skipped");
    }
  }
  return reject("no-mail-server", "dns");
}

async function checkEmailDeliverability(rawEmail, opts) {
  const email = normalizeEmail(rawEmail);
  if (!looksLikeEmail(email)) return reject("invalid-syntax", "syntax");

  const log = (opts && opts.log) || (() => {});
  let verdict = null;

  if (opts && opts.url) {
    try {
      verdict = await checkWithReacher(email, opts);
    } catch (err) {
      log("Reacher unavailable, falling back to DNS: " + (err && err.message));
    }
  }
  if (!verdict) verdict = await checkWithDns(email, opts);
  return verdict;
}

module.exports = {
  MAX_EMAIL_LENGTH,
  normalizeEmail,
  looksLikeEmail,
  interpretReacher,
  checkWithReacher,
  checkWithDns,
  checkEmailDeliverability,
};
