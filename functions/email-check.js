/**
 * functions/email-check.js — Email pre-validation logic (NEW, 2026-09-29)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Decide whether an address is worth creating a Firebase
 *            account for. Used ONLY by the `checkEmailDeliverability`
 *            Cloud Function in functions/index.js, which is what the
 *            browser (js/auth.js → register()) actually calls.
 *
 * WHY A SEPARATE FILE : this file has NO firebase-* imports on purpose,
 *   so js/_test_email-check.node.js can exercise every rule below with
 *   plain Node (mocked fetch / dns) — no emulator, no network.
 *
 * REACHER vs FIREBASE (do not conflate these):
 *   - Reacher (https://github.com/reacherhq/check-if-email-exists)
 *     answers "does this address LOOK usable?" — syntax, MX records,
 *     an SMTP probe, disposable-domain list. It can NOT prove that the
 *     person typing the address owns the mailbox.
 *   - Firebase's sendEmailVerification() link is the ONLY thing that
 *     proves ownership. `Reacher says safe` NEVER means `verified`;
 *     nothing in this file marks anyone verified.
 *
 * THE REACHER SECRET NEVER LEAVES THE SERVER. It is read from a Firebase
 *   secret (functions/index.js → defineSecret) and passed in here as the
 *   `secret` option; it is never returned to the browser, never logged.
 *
 * REJECT RULES (checkWithReacher → interpretReacher):
 *   Reject ONLY on a clear negative:
 *     syntax.is_valid_syntax === false        -> 'invalid-syntax'
 *     mx.accepts_mail        === false        -> 'no-mail-server'
 *     misc.is_disposable     === true         -> 'disposable'   (policy flag)
 *     smtp.is_disabled       === true         -> 'undeliverable'
 *     smtp.is_deliverable === false AND
 *       smtp.can_connect_smtp === true        -> 'undeliverable'
 *     is_reachable === 'invalid'              -> 'undeliverable'
 *   Everything else is ACCEPTED, deliberately — including
 *   is_reachable 'risky' and 'unknown', catch-all domains, role
 *   accounts (info@, admin@), full inboxes, and any sub-object that
 *   came back as an {error} instead of data. Big providers (Outlook /
 *   Hotmail / Yahoo) routinely answer 'unknown' to SMTP probes, and a
 *   catch-all domain is a real school/company mailbox; rejecting them
 *   would lock out real learners. The verification email is the
 *   backstop for all of those, and an unverified account gets no access.
 *   A missing field is "not established", never "false" — every check
 *   above uses === false / === true, not falsy/truthy tests.
 *
 * FALLBACK  : if Reacher is not configured, times out, errors, or
 *   returns something unreadable, checkWithDns() runs a free MX/A lookup
 *   instead (this is what the earlier, never-deployed `checkEmailDomain`
 *   idea in js/auth.js was for). If DNS itself is inconclusive
 *   (SERVFAIL/timeout) the result is ACCEPT with checked:'skipped' —
 *   fail OPEN, same reasoning as above.
 *
 * NOTE : Google Cloud blocks outbound port 25, so Reacher's SMTP probe
 *   can NOT run inside a Cloud Function. Reacher must run on its own
 *   host (Docker: reacherhq/backend) and this file only calls its HTTP
 *   API (POST {REACHER_URL}/v0/check_email).
 * ─────────────────────────────────────────────────────────────────
 */
"use strict";

const MAX_EMAIL_LENGTH = 254; // keep in sync with MAX_EMAIL_LENGTH in js/auth.js
const MAX_LOCAL_LENGTH = 64;

/** Safe nested read: get(obj, ['a','b']) -> obj.a.b or undefined. */
function get(obj, path) {
  let cur = obj;
  for (const key of path) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = cur[key];
  }
  return cur;
}

/** Same policy as js/auth.js: trim only. No lowercasing of the local part. */
function normalizeEmail(email) {
  return typeof email === "string" ? email.trim() : "";
}

/**
 * Cheap, network-free syntax gate. Deliberately permissive (Reacher/Firebase
 * do the strict work) — it only exists so obvious garbage never costs a
 * Reacher call. Returns true when the shape is plausible.
 */
function looksLikeEmail(email) {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  if (/\s/.test(email)) return false;
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return false;
  if (email.indexOf("@") !== at) return false; // exactly one @
  if (at > MAX_LOCAL_LENGTH) return false;
  const domain = email.slice(at + 1);
  if (domain.indexOf(".") < 1 || domain.endsWith(".") || domain.includes("..")) return false;
  return true;
}

const accept = (checked) => ({ ok: true, checked });
const reject = (reason, checked) => ({ ok: false, reason, checked });

/**
 * Turns a Reacher /v0/check_email response body into { ok, reason?, checked }.
 * Pure function — see the REJECT RULES block at the top of this file.
 * Returns null when the body isn't a Reacher result at all (caller then
 * treats Reacher as unavailable and falls back to DNS).
 */
function interpretReacher(body, options) {
  const rejectDisposable = !options || options.rejectDisposable !== false;
  if (!body || typeof body !== "object") return null;
  // A body with none of the fields we read (e.g. an error envelope) is not
  // a usable answer — don't accept-by-default on it, fall back instead.
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

  return accept("reacher"); // safe / risky / unknown / catch-all: allowed on purpose
}

/**
 * Calls the self-hosted Reacher backend. Throws on ANY problem (HTTP error,
 * timeout, bad JSON, unreadable body) so the caller can fall back to DNS.
 * @param {string} email        already-normalized address
 * @param {object} opts         { url, secret, timeoutMs, rejectDisposable, fetchImpl }
 */
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

/**
 * Free fallback: does the domain publish a mail exchanger?
 *   - MX records present            -> accept (unless it's the RFC 7505 "null MX")
 *   - no MX but an A/AAAA record    -> accept (RFC 5321 implicit-MX rule)
 *   - domain does not exist at all  -> reject 'no-mail-server'
 *   - anything else (timeout, SERVFAIL) -> accept, checked:'skipped' (fail open)
 * @param {object} opts { dnsImpl } — a `dns.promises`-shaped object (tests inject one)
 */
async function checkWithDns(email, opts) {
  const dnsImpl = (opts && opts.dnsImpl) || require("dns").promises;
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  const isMissing = (err) => err && (err.code === "ENOTFOUND" || err.code === "ENODATA");

  try {
    const mx = await dnsImpl.resolveMx(domain);
    if (Array.isArray(mx) && mx.length > 0) {
      // RFC 7505 null MX: a single "." exchanger = "this domain accepts no mail".
      const nullMx = mx.length === 1 && (!mx[0].exchange || mx[0].exchange === ".");
      return nullMx ? reject("no-mail-server", "dns") : accept("dns");
    }
  } catch (err) {
    if (!isMissing(err)) return accept("skipped"); // inconclusive -> fail open
  }

  // No MX. Per RFC 5321 a domain with just an address record can still receive mail.
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

/**
 * The whole pipeline: syntax gate -> Reacher (if configured) -> DNS fallback.
 * Never throws for infrastructure problems — those become accept/'skipped'.
 * @param {string} rawEmail
 * @param {object} opts { url, secret, timeoutMs, rejectDisposable, fetchImpl, dnsImpl, log }
 * @returns {Promise<{ok:boolean, reason?:string, checked:string}>}
 */
async function checkEmailDeliverability(rawEmail, opts) {
  const email = normalizeEmail(rawEmail);
  if (!looksLikeEmail(email)) return reject("invalid-syntax", "syntax");

  const log = (opts && opts.log) || (() => {});
  let verdict = null;

  if (opts && opts.url) {
    try {
      verdict = await checkWithReacher(email, opts);
    } catch (err) {
      // Timeout / network / bad response. Not the user's fault -> fall back.
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
