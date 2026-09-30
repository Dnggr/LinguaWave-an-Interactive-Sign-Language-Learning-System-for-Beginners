'use strict';
/**
 * Regression test for the signup email pre-check (functions/email-check.js).
 * Run:  node js/_test_email-check.node.js
 *
 * No network, no Firebase, no Reacher server: fetch and dns are injected.
 *
 * What it pins down (see the REJECT RULES block at the top of email-check.js):
 *   - Reacher's CLEAR negatives are rejected (bad syntax, no MX, disposable,
 *     disabled / undeliverable mailbox, is_reachable "invalid").
 *   - Everything merely UNCERTAIN is accepted (risky, unknown, catch-all,
 *     role account, missing/errored sub-objects). Rejecting those would
 *     lock real learners out.
 *   - Reacher being down / slow / returning junk falls back to DNS, and DNS
 *     being inconclusive fails OPEN.
 *   - The Reacher secret is sent as x-reacher-secret and appears in NO result.
 *   - "test@gmail.co" is decided by the pipeline, not by a hard-coded rule.
 */

const assert = require('assert');
const {
  looksLikeEmail, normalizeEmail, interpretReacher,
  checkWithDns, checkEmailDeliverability,
} = require('../functions/email-check.js');

let failures = 0;
async function test(name, fn) {
  try { await fn(); console.log('  ok   ' + name); }
  catch (err) { failures++; console.error('  FAIL ' + name + '\n       ' + (err && err.message)); }
}

// A Reacher-shaped body with sane defaults; override per case.
function reacher(over) {
  const base = {
    input: 'someone@example.com',
    is_reachable: 'safe',
    misc: { is_disposable: false, is_role_account: false },
    mx: { accepts_mail: true, records: ['mx.example.com.'] },
    smtp: { can_connect_smtp: true, has_full_inbox: false, is_catch_all: false, is_deliverable: true, is_disabled: false },
    syntax: { address: 'someone@example.com', domain: 'example.com', is_valid_syntax: true, username: 'someone' },
  };
  return Object.assign(base, over || {});
}

// dns.promises look-alike. `table` maps type -> domain -> array | error code.
function fakeDns(table) {
  const answer = (type) => async (domain) => {
    const v = table[type] && table[type][domain];
    if (v === undefined) { const e = new Error('ENODATA'); e.code = 'ENODATA'; throw e; }
    if (typeof v === 'string') { const e = new Error(v); e.code = v; throw e; }
    return v;
  };
  return { resolveMx: answer('mx'), resolve4: answer('a'), resolve6: answer('aaaa') };
}

function fakeFetch(body, { status = 200, capture } = {}) {
  return async (url, init) => {
    if (capture) capture.push({ url, init });
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
}

(async () => {
  console.log('normalize / syntax gate');
  await test('trim only, local part case preserved', () => {
    assert.strictEqual(normalizeEmail('  Foo.Bar@Gmail.com \n'), 'Foo.Bar@Gmail.com');
    assert.strictEqual(normalizeEmail(undefined), '');
    assert.strictEqual(normalizeEmail(42), '');
  });
  await test('looksLikeEmail accepts normal, rejects garbage', () => {
    for (const ok of ['a@b.co', 'first.last+tag@sub.example.org', "o'neil@example.com"]) assert(looksLikeEmail(ok), ok);
    for (const bad of ['', 'plain', '@x.com', 'a@', 'a@b', 'a@@b.com', 'a b@c.com', 'a@b..com', 'a@b.', 'x'.repeat(250) + '@b.com']) {
      assert(!looksLikeEmail(bad), 'should reject: ' + bad);
    }
  });

  console.log('interpretReacher: clear negatives are rejected');
  await test('invalid syntax', () => {
    const v = interpretReacher(reacher({ syntax: { is_valid_syntax: false } }));
    assert.deepStrictEqual([v.ok, v.reason], [false, 'invalid-syntax']);
  });
  await test('domain does not accept mail (MX)', () => {
    const v = interpretReacher(reacher({ mx: { accepts_mail: false, records: [] }, is_reachable: 'invalid' }));
    assert.deepStrictEqual([v.ok, v.reason], [false, 'no-mail-server']);
  });
  await test('disposable is rejected by default, allowed when the policy flag is off', () => {
    const body = reacher({ misc: { is_disposable: true }, is_reachable: 'risky' });
    assert.strictEqual(interpretReacher(body).reason, 'disposable');
    assert.strictEqual(interpretReacher(body, { rejectDisposable: false }).ok, true);
  });
  await test('smtp disabled account', () => {
    const v = interpretReacher(reacher({ smtp: { can_connect_smtp: true, is_disabled: true, is_deliverable: false } }));
    assert.deepStrictEqual([v.ok, v.reason], [false, 'undeliverable']);
  });
  await test('smtp answered and says not deliverable', () => {
    const v = interpretReacher(reacher({ smtp: { can_connect_smtp: true, is_deliverable: false, is_disabled: false } }));
    assert.deepStrictEqual([v.ok, v.reason], [false, 'undeliverable']);
  });
  await test('is_reachable "invalid" on its own', () => {
    const v = interpretReacher(reacher({ is_reachable: 'invalid' }));
    assert.deepStrictEqual([v.ok, v.reason], [false, 'undeliverable']);
  });

  console.log('interpretReacher: uncertain results are ACCEPTED');
  await test('safe', () => assert.strictEqual(interpretReacher(reacher()).ok, true));
  await test('risky (catch-all)', () => {
    assert.strictEqual(interpretReacher(reacher({ is_reachable: 'risky', smtp: { can_connect_smtp: true, is_catch_all: true, is_deliverable: true } })).ok, true);
  });
  await test('unknown (e.g. Outlook/Hotmail refusing SMTP probes)', () => {
    assert.strictEqual(interpretReacher(reacher({ is_reachable: 'unknown', smtp: { error: { type: 'x', message: 'blocked' } } })).ok, true);
  });
  await test('could not connect over SMTP: is_deliverable false is NOT trusted', () => {
    // A failed probe must not be mistaken for "mailbox does not exist".
    assert.strictEqual(interpretReacher(reacher({ is_reachable: 'unknown', smtp: { can_connect_smtp: false, is_deliverable: false } })).ok, true);
  });
  await test('role account and full inbox are fine', () => {
    assert.strictEqual(interpretReacher(reacher({ misc: { is_role_account: true, is_disposable: false }, smtp: { can_connect_smtp: true, has_full_inbox: true, is_deliverable: true } })).ok, true);
  });
  await test('missing / errored sub-objects are "not established", not "false"', () => {
    assert.strictEqual(interpretReacher({ is_reachable: 'unknown', mx: { error: { type: 'dns' } }, syntax: { is_valid_syntax: true } }).ok, true);
    assert.strictEqual(interpretReacher({ syntax: { is_valid_syntax: true } }).ok, true);
  });
  await test('a body that is not a Reacher result returns null (=> fall back)', () => {
    assert.strictEqual(interpretReacher(null), null);
    assert.strictEqual(interpretReacher('oops'), null);
    assert.strictEqual(interpretReacher({ error: 'unauthorized' }), null);
  });

  console.log('checkWithDns fallback');
  await test('MX present -> accept', async () => {
    const v = await checkWithDns('a@good.com', { dnsImpl: fakeDns({ mx: { 'good.com': [{ exchange: 'mx.good.com', priority: 10 }] } }) });
    assert.deepStrictEqual([v.ok, v.checked], [true, 'dns']);
  });
  await test('no MX but an A record -> accept (RFC 5321 implicit MX)', async () => {
    const v = await checkWithDns('a@aonly.com', { dnsImpl: fakeDns({ a: { 'aonly.com': ['1.2.3.4'] } }) });
    assert.strictEqual(v.ok, true);
  });
  await test('domain does not exist -> reject no-mail-server', async () => {
    const v = await checkWithDns('a@nope.invalid', { dnsImpl: fakeDns({ mx: { 'nope.invalid': 'ENOTFOUND' }, a: { 'nope.invalid': 'ENOTFOUND' }, aaaa: { 'nope.invalid': 'ENOTFOUND' } }) });
    assert.deepStrictEqual([v.ok, v.reason], [false, 'no-mail-server']);
  });
  await test('null MX (RFC 7505) -> reject', async () => {
    const v = await checkWithDns('a@nullmx.com', { dnsImpl: fakeDns({ mx: { 'nullmx.com': [{ exchange: '', priority: 0 }] } }) });
    assert.deepStrictEqual([v.ok, v.reason], [false, 'no-mail-server']);
  });
  await test('DNS timeout / SERVFAIL -> fail OPEN (accept, checked: skipped)', async () => {
    const v = await checkWithDns('a@slow.com', { dnsImpl: fakeDns({ mx: { 'slow.com': 'ETIMEOUT' } }) });
    assert.deepStrictEqual([v.ok, v.checked], [true, 'skipped']);
  });

  console.log('full pipeline: checkEmailDeliverability');
  await test('garbage never reaches Reacher', async () => {
    const calls = [];
    const v = await checkEmailDeliverability('not-an-email', { url: 'https://r.example', fetchImpl: fakeFetch(reacher(), { capture: calls }) });
    assert.deepStrictEqual([v.ok, v.reason], [false, 'invalid-syntax']);
    assert.strictEqual(calls.length, 0);
  });
  await test('Reacher is called server-side with the secret header and normalized address', async () => {
    const calls = [];
    const v = await checkEmailDeliverability('  Someone@Example.com ', {
      url: 'https://r.example/', secret: 'S3CRET', fetchImpl: fakeFetch(reacher(), { capture: calls }),
    });
    assert.strictEqual(v.ok, true);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].url, 'https://r.example/v0/check_email');
    assert.strictEqual(calls[0].init.headers['x-reacher-secret'], 'S3CRET');
    assert.strictEqual(JSON.parse(calls[0].init.body).to_email, 'Someone@Example.com');
    assert(!JSON.stringify(v).includes('S3CRET'), 'secret must never appear in the result');
  });
  await test('no secret configured -> header omitted', async () => {
    const calls = [];
    await checkEmailDeliverability('a@b.co', { url: 'https://r.example', fetchImpl: fakeFetch(reacher(), { capture: calls }) });
    assert.strictEqual('x-reacher-secret' in calls[0].init.headers, false);
  });
  await test('@gmail.co-style case is decided by the pipeline (Reacher says no MX)', async () => {
    const v = await checkEmailDeliverability('test@gmail.co', {
      url: 'https://r.example',
      fetchImpl: fakeFetch(reacher({ is_reachable: 'invalid', mx: { accepts_mail: false, records: [] } })),
    });
    assert.deepStrictEqual([v.ok, v.reason, v.checked], [false, 'no-mail-server', 'reacher']);
  });
  await test('...and the same address passes if the pipeline says it can receive mail', async () => {
    const v = await checkEmailDeliverability('test@gmail.co', { url: 'https://r.example', fetchImpl: fakeFetch(reacher()) });
    assert.strictEqual(v.ok, true); // proves nothing is hard-coded on the domain string
  });
  await test('Reacher HTTP 500 -> falls back to DNS', async () => {
    const v = await checkEmailDeliverability('a@good.com', {
      url: 'https://r.example', fetchImpl: fakeFetch({}, { status: 500 }),
      dnsImpl: fakeDns({ mx: { 'good.com': [{ exchange: 'mx.good.com', priority: 1 }] } }),
    });
    assert.deepStrictEqual([v.ok, v.checked], [true, 'dns']);
  });
  await test('Reacher network error -> falls back to DNS, and DNS can still reject', async () => {
    const v = await checkEmailDeliverability('a@nope.invalid', {
      url: 'https://r.example', fetchImpl: async () => { throw new Error('ECONNREFUSED'); },
      dnsImpl: fakeDns({ mx: { 'nope.invalid': 'ENOTFOUND' }, a: { 'nope.invalid': 'ENOTFOUND' }, aaaa: { 'nope.invalid': 'ENOTFOUND' } }),
    });
    assert.deepStrictEqual([v.ok, v.reason, v.checked], [false, 'no-mail-server', 'dns']);
  });
  await test('Reacher timeout (aborted request) -> falls back, does not hang', async () => {
    const started = Date.now();
    const v = await checkEmailDeliverability('a@good.com', {
      url: 'https://r.example', timeoutMs: 50,
      fetchImpl: (url, init) => new Promise((_, reject) => { init.signal.addEventListener('abort', () => reject(new Error('aborted'))); }),
      dnsImpl: fakeDns({ mx: { 'good.com': [{ exchange: 'mx.good.com', priority: 1 }] } }),
    });
    assert.strictEqual(v.ok, true);
    assert(Date.now() - started < 2000, 'should give up quickly');
  });
  await test('Reacher returns junk -> falls back to DNS', async () => {
    const v = await checkEmailDeliverability('a@good.com', {
      url: 'https://r.example', fetchImpl: fakeFetch({ error: 'unauthorized' }),
      dnsImpl: fakeDns({ mx: { 'good.com': [{ exchange: 'mx.good.com', priority: 1 }] } }),
    });
    assert.deepStrictEqual([v.ok, v.checked], [true, 'dns']);
  });
  await test('Reacher URL not configured -> DNS only (Reacher never called)', async () => {
    const calls = [];
    const v = await checkEmailDeliverability('a@good.com', {
      url: '', fetchImpl: fakeFetch(reacher(), { capture: calls }),
      dnsImpl: fakeDns({ mx: { 'good.com': [{ exchange: 'mx.good.com', priority: 1 }] } }),
    });
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(v.checked, 'dns');
  });
  await test('everything down (Reacher + DNS inconclusive) -> fail open', async () => {
    const v = await checkEmailDeliverability('a@x.com', {
      url: 'https://r.example', fetchImpl: async () => { throw new Error('down'); },
      dnsImpl: fakeDns({ mx: { 'x.com': 'ESERVFAIL' } }),
    });
    assert.deepStrictEqual([v.ok, v.checked], [true, 'skipped']);
  });

  if (failures) { console.error('\n' + failures + ' failure(s)'); process.exit(1); }
  console.log('\nall passed');
})();
