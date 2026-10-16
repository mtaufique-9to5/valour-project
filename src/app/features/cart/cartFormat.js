// Display helpers shared by the cart page and cart sidebar. No React here, so
// the rules can be unit tested directly.

export const PRICE_ON_REQUEST = 'Price on request'

// US dollars with cents, e.g. "$45.00", "$1,250.00". Fixed locale so the server
// and every browser render the same text.
const usd = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// null = no confirmed price yet.
export const formatPrice = (amount) => (amount === null ? PRICE_ON_REQUEST : `$${usd.format(amount)}`)

// Never present a number as the total unless every item has a confirmed price.
// `subtotal` is the sum of priced lines only (see selectSubtotal).
export const getTotalLabels = ({ subtotal, hasPricedItems, hasUnpricedItems }) => ({
  subtotal: hasPricedItems ? formatPrice(subtotal) : PRICE_ON_REQUEST,
  total: hasUnpricedItems ? PRICE_ON_REQUEST : `${formatPrice(subtotal)} USD`,
  // Set when the subtotal is a real number that leaves some items out.
  excludesUnpriced: hasPricedItems && hasUnpricedItems,
})

export const formatBadgeCount = (count) => (count > 99 ? '99+' : String(count))
