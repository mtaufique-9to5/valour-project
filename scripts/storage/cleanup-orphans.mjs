// Lists (and with --delete removes) uploaded product image files that have no
// ProductImage row and are older than 24 hours. Only files under
// storage/uploads/products/<productId>/<32 hex>.<ext> (plus stale *.tmp files)
// are considered; static catalog images in public/ are never touched.
//
//   node --conditions=react-server --env-file=.env.local scripts/storage/cleanup-orphans.mjs            (dry run, default)
//   node --conditions=react-server --env-file=.env.local scripts/storage/cleanup-orphans.mjs --delete
//   node scripts/storage/cleanup-orphans.mjs --help
import { readdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { isStorageKey } from '../../src/server/catalog/image-rules.js'

const MIN_AGE_MS = 24 * 60 * 60 * 1000
const ROOT = path.resolve(process.cwd(), 'storage', 'uploads', 'products')
const args = new Set(process.argv.slice(2))

if (args.has('--help') || args.has('-h')) {
  console.log(`Usage: node --conditions=react-server --env-file=.env.local scripts/storage/cleanup-orphans.mjs [--dry-run|--delete]
  --dry-run  (default) list orphaned files older than 24 h
  --delete   remove them
Root: ${ROOT}`)
  process.exit(0)
}
const doDelete = args.has('--delete')
for (const a of args) if (!['--delete', '--dry-run'].includes(a)) { console.error(`Unknown option ${a}`); process.exit(2) }

async function listFiles() {
  const out = []
  let dirs
  try { dirs = await readdir(ROOT, { withFileTypes: true }) } catch (err) {
    if (err.code === 'ENOENT') return out
    throw err
  }
  for (const d of dirs) {
    if (!d.isDirectory() || !/^[1-9][0-9]{0,9}$/.test(d.name)) continue
    for (const f of await readdir(path.join(ROOT, d.name), { withFileTypes: true })) {
      if (!f.isFile()) continue
      const key = `${d.name}/${f.name}`
      const isTmp = /^[0-9a-f]{32}\.(jpg|png|webp)\.[0-9a-f]{12}\.tmp$/.test(f.name)
      if (!isStorageKey(key) && !isTmp) continue
      const s = await stat(path.join(ROOT, d.name, f.name))
      out.push({ key, isTmp, abs: path.join(ROOT, d.name, f.name), mtime: s.mtimeMs, bytes: s.size })
    }
  }
  return out
}

const files = (await listFiles()).filter((f) => Date.now() - f.mtime > MIN_AGE_MS)
if (files.length === 0) {
  console.log('No candidate files older than 24 h.')
  process.exit(0)
}

const { db } = await import('../../src/server/db.js')
try {
  const keys = files.filter((f) => !f.isTmp).map((f) => f.key)
  const known = new Set()
  for (let i = 0; i < keys.length; i += 500) {
    const rows = await db.productImage.findMany({ where: { storageKey: { in: keys.slice(i, i + 500) } }, select: { storageKey: true } })
    for (const r of rows) known.add(r.storageKey)
  }
  const orphans = files.filter((f) => f.isTmp || !known.has(f.key))
  console.log(`${orphans.length} orphaned file(s)${doDelete ? '' : ' (dry run; pass --delete to remove)'}:`)
  for (const o of orphans) {
    console.log(`  ${o.key}  ${o.bytes} bytes  ${new Date(o.mtime).toISOString()}`)
    if (doDelete) await unlink(o.abs).catch(() => console.error(`  could not delete ${o.key}`))
  }
} finally {
  await db.$disconnect()
}
