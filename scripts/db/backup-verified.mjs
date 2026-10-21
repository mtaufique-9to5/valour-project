// Verified backup of valour_v2: mysqldump + SHA-256 + inventory manifest + static dump verification.
// Usage: node scripts/db/backup-verified.mjs <label>   (writes D:/backups/valour/valour_v2_<stamp>_<label>.*)
// Read-only on the database. Never prints credentials or row contents.
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const vars = {}
for (const line of readFileSync('D:/gitprojts/valour-project/.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z0-9_]+)\s*=\s*(.*)$/); if (m) vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
}
const u = new URL(vars.DATABASE_URL)
const c = { host: u.hostname, port: u.port || '3306', user: decodeURIComponent(u.username), pwd: decodeURIComponent(u.password), db: u.pathname.slice(1) }
if (c.db !== 'valour_v2') { console.error('REFUSING: not valour_v2'); process.exit(2) }
const conn = ['--protocol=TCP', '-h', c.host, '-P', c.port, '-u', c.user]
const env = { ...process.env, MYSQL_PWD: c.pwd }
const mask = (s) => (s || '').split(c.pwd || '\u0000').join('***').trim()
const q = (sql) => { const r = spawnSync('C:/xampp/mysql/bin/mysql.exe', [...conn, '--batch', '--skip-column-names', c.db, '-e', sql], { env, encoding: 'utf8' }); if (r.status !== 0) throw new Error(mask(r.stderr)); return r.stdout.replace(/\r/g, '').trim().split('\n').filter(Boolean).map((l) => l.split('\t')) }
const d = new Date(), p = (n) => String(n).padStart(2, '0')
const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
const base = `D:/backups/valour/valour_v2_${stamp}_${process.argv[2] || 'backup'}`
if (existsSync(base + '.sql')) { console.error('REFUSING: file exists'); process.exit(2) }
mkdirSync('D:/backups/valour', { recursive: true })
const before = Object.fromEntries(q("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;").map(([t]) => [t, Number(q(`SELECT COUNT(*) FROM \`${t}\`;`)[0][0])]))
const r = spawnSync('C:/xampp/mysql/bin/mysqldump.exe', [...conn, '--single-transaction', '--skip-extended-insert', '--hex-blob', '--default-character-set=utf8mb4', '--triggers', '--no-tablespaces', '--databases', c.db], { env, encoding: 'utf8', maxBuffer: 1 << 30 })
if (r.status !== 0) { console.error('mysqldump failed: ' + mask(r.stderr)); process.exit(1) }
writeFileSync(base + '.sql', r.stdout)
const after = Object.fromEntries(Object.keys(before).map((t) => [t, Number(q(`SELECT COUNT(*) FROM \`${t}\`;`)[0][0])]))
const buf = readFileSync(base + '.sql'); const txt = buf.toString('utf8')
const sha = createHash('sha256').update(buf).digest('hex').toUpperCase()
const created = [...txt.matchAll(/^CREATE TABLE `([^`]+)`/gm)].map((m) => m[1]).sort()
const dumped = {}; for (const m of txt.matchAll(/^INSERT INTO `([^`]+)`/gm)) dumped[m[1]] = (dumped[m[1]] || 0) + 1
const checks = {
  dumpCompleted: /-- Dump completed/.test(txt),
  allTablesHaveCreate: JSON.stringify(created) === JSON.stringify(Object.keys(before).sort()),
  rowCountsMatchLive: Object.keys(before).every((t) => (dumped[t] || 0) === before[t]),
  rowCountsStableDuringDump: JSON.stringify(before) === JSON.stringify(after),
}
// round-trip check of the checksum from disk
const sha2 = createHash('sha256').update(readFileSync(base + '.sql')).digest('hex').toUpperCase()
checks.checksumReproducible = sha === sha2
const manifest = { database: c.db, file: base + '.sql', bytes: statSync(base + '.sql').size, sha256: sha, takenAtUtc: d.toISOString(), server: q('SELECT VERSION();')[0][0], tables: Object.keys(before).length, rowCounts: before, checks }
writeFileSync(base + '.sql.sha256', `${sha}  ${base.split('/').pop()}.sql\n`)
writeFileSync(base + '.manifest.json', JSON.stringify(manifest, null, 2))
console.log(JSON.stringify({ ...manifest, rowCounts: undefined }, null, 2))
process.exit(Object.values(checks).every(Boolean) ? 0 : 3)
