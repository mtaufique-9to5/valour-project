const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// null price = legacy draft without a price: never show a number for it.
export const formatPrice = (value) => (Number.isFinite(value) ? usd.format(value) : 'No price set')
export const formatMoneyShort = (value) => (Number.isFinite(value) ? usdWhole.format(value) : '—')
export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—'
export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '')
