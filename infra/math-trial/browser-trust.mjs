// Dedicated disposable Chromium profile; never edits Keychain or a user's profile.
// Chromium's supported per-profile ServerCertificate store, schema v1:
// https://chromium.googlesource.com/chromium/src/+/refs/tags/135.0.7044.0/components/server_certificate_database/server_certificate_database.proto
// CertificateMetadata{trust:{trust_type:TRUSTED(3)}} = 0a 02 08 03.
// Normal certificate chain, expiry and SAN verification stay enabled.
import assert from 'node:assert/strict';
import { mkdir, chmod, readFile } from 'node:fs/promises';
import { X509Certificate, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';

export async function trustedProfile(chromium, profile, caPath, finalOptions = {}) {
  await mkdir(profile, {mode:0o700}); // must be new; never an existing browser profile
  const ca = new X509Certificate(await readFile(caPath));
  assert(ca.ca && Date.parse(ca.validTo) > Date.now(), 'VALID_NEW_CA_REQUIRED');
  const options = {headless:true, executablePath:chromium.executablePath(),
    ignoreHTTPSErrors:false, locale:'en-US'};
  let context = await chromium.launchPersistentContext(profile, options);
  try {
    const page = await context.newPage();
    await page.goto('chrome://certificate-manager');
    await page.getByRole('link', {name:'Installed by you No certificates',exact:true}).click();
  } finally { await context.close(); }
  const dbPath = join(profile,'Default','ServerCertificate');
  const db = new DatabaseSync(dbPath);
  try {
    assert.equal(db.prepare("SELECT value FROM meta WHERE key='version'").get().value,'1');
    assert.equal(db.prepare('SELECT count(*) AS n FROM certificates').get().n,0);
    assert.deepEqual(db.prepare('PRAGMA table_info(certificates)').all().map(x=>x.name),
      ['sha256hash_hex','der_cert','trust_settings']);
    db.prepare('INSERT INTO certificates VALUES(?,?,?)').run(
      createHash('sha256').update(ca.raw).digest('hex'),ca.raw,Buffer.from([10,2,8,3]));
  } finally { db.close(); }
  await chmod(dbPath,0o600);
  assert(Object.keys(finalOptions).every(k=>['headless','viewport','reducedMotion'].includes(k)));
  return chromium.launchPersistentContext(profile, {...options,...finalOptions});
}
