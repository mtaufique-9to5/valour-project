// Catalog audit actions. The authoritative allowlist lives in
// src/server/audit/audit.js (ACTION_ALLOWLIST); this list names the catalog
// actions so tests can check every one of them is allowlisted there.
export const CATALOG_AUDIT_ACTIONS = Object.freeze([
  'product.create', 'product.update', 'product.status.update', 'product.archive',
  'product.price.update', 'inventory.update', 'inventory.tracking.update',
  'product.image.upload', 'product.image.delete', 'product.image.primary', 'product.image.reorder',
  'catalog.seed',
])
