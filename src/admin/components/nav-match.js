const cleanPath = (p) => (p.length > 1 ? p.replace(/\/$/, '') : p)

/**
 * Ids of nav items that match the current location. Items whose path has a
 * query (e.g. '/products?type=WATCH') match only that pathname with those
 * params; a plain item ('/products') matches its pathname and sub-paths
 * unless a more specific query item for the same pathname matched.
 */
export function activeNavIds(items, basePath, currentPath, currentSearch = '') {
  const here = cleanPath(currentPath || '')
  const params = new URLSearchParams(currentSearch || '')
  const parsed = items.map((item) => {
    const [p, q = ''] = item.path.split('?')
    return { item, href: cleanPath(`${basePath}${p}`) || '/', query: new URLSearchParams(q), hasQuery: q !== '' }
  })
  const active = new Set()
  const exactHits = new Set()
  for (const x of parsed) {
    if (!x.hasQuery) continue
    if (here === x.href && [...x.query].every(([k, v]) => params.get(k) === v)) {
      active.add(x.item.id)
      exactHits.add(x.href)
    }
  }
  for (const x of parsed) {
    if (x.hasQuery || exactHits.has(x.href)) continue
    if (here === x.href || (x.item.path && here.startsWith(`${x.href}/`))) active.add(x.item.id)
  }
  return active
}
