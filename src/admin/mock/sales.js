// MOCK DATA for the admin design preview only. Not real orders, customers or
// revenue: no orders exist yet and online payment is not live. Every screen
// rendering these must show a "Sample data" badge.
// Line prices use the confirmed catalog prices ($525 watch, $45 strap).

const line = (name, qty, unit) => ({ name, qty, unit })

export const MOCK_ORDERS = [
  { id: 'SAMPLE-1012', customer: 'Sample Customer A', email: 'customer.a@example.com', date: '2026-10-18', status: 'Pending', payment: 'Unpaid', items: [line('Astral Blue', 1, 525)] },
  { id: 'SAMPLE-1011', customer: 'Sample Customer B', email: 'customer.b@example.com', date: '2026-10-17', status: 'Processing', payment: 'Paid', items: [line('Eclipse Black', 1, 525), line('Black Strap', 1, 45)] },
  { id: 'SAMPLE-1010', customer: 'Sample Customer C', email: 'customer.c@example.com', date: '2026-10-15', status: 'Shipped', payment: 'Paid', items: [line('Frost Silver', 1, 525)] },
  { id: 'SAMPLE-1009', customer: 'Sample Customer D', email: 'customer.d@example.com', date: '2026-10-14', status: 'Delivered', payment: 'Paid', items: [line('Blue Strap', 2, 45)] },
  { id: 'SAMPLE-1008', customer: 'Sample Customer E', email: 'customer.e@example.com', date: '2026-10-12', status: 'Cancelled', payment: 'Refunded', items: [line('Nova Red', 1, 525)] },
  { id: 'SAMPLE-1007', customer: 'Sample Customer A', email: 'customer.a@example.com', date: '2026-10-10', status: 'Delivered', payment: 'Paid', items: [line('Sunseeker Yellow', 1, 525), line('Yellow Strap', 1, 45)] },
  { id: 'SAMPLE-1006', customer: 'Sample Customer F', email: 'customer.f@example.com', date: '2026-10-08', status: 'Delivered', payment: 'Paid', items: [line('Aurora Mint', 1, 525)] },
  { id: 'SAMPLE-1005', customer: 'Sample Customer G', email: 'customer.g@example.com', date: '2026-10-05', status: 'Delivered', payment: 'Paid', items: [line('Grey Strap', 1, 45), line('Red Strap', 1, 45)] },
  { id: 'SAMPLE-1004', customer: 'Sample Customer H', email: 'customer.h@example.com', date: '2026-10-03', status: 'Shipped', payment: 'Paid', items: [line('Astral Blue', 2, 525)] },
  { id: 'SAMPLE-1003', customer: 'Sample Customer B', email: 'customer.b@example.com', date: '2026-10-01', status: 'Delivered', payment: 'Paid', items: [line('Silver Strap', 1, 45)] },
  { id: 'SAMPLE-1002', customer: 'Sample Customer I', email: 'customer.i@example.com', date: '2026-09-28', status: 'Delivered', payment: 'Paid', items: [line('Eclipse Black', 1, 525)] },
  { id: 'SAMPLE-1001', customer: 'Sample Customer J', email: 'customer.j@example.com', date: '2026-09-25', status: 'Delivered', payment: 'Paid', items: [line('Frost Silver', 1, 525)] },
].map((o) => ({ ...o, total: o.items.reduce((s, i) => s + i.qty * i.unit, 0), itemCount: o.items.reduce((s, i) => s + i.qty, 0) }))

export const MOCK_CUSTOMERS = (() => {
  const byEmail = new Map()
  for (const o of MOCK_ORDERS) {
    const c = byEmail.get(o.email) ?? { id: o.email, name: o.customer, email: o.email, orders: 0, spent: 0, lastOrder: o.date, status: 'Active' }
    c.orders += 1
    if (o.payment === 'Paid') c.spent += o.total
    if (o.date > c.lastOrder) c.lastOrder = o.date
    byEmail.set(o.email, c)
  }
  return [...byEmail.values()]
})()

// Weekly sample series for the dashboard charts.
export const MOCK_REVENUE_WEEKS = [
  { label: 'W35', value: 1050 }, { label: 'W36', value: 1620 }, { label: 'W37', value: 570 }, { label: 'W38', value: 2190 },
  { label: 'W39', value: 1575 }, { label: 'W40', value: 1140 }, { label: 'W41', value: 2235 }, { label: 'W42', value: 1665 },
]

export const MOCK_DASHBOARD = {
  revenue: 12045,
  revenueDelta: 8.4,
  revenueTrend: MOCK_REVENUE_WEEKS.map((w) => w.value),
  orders: MOCK_ORDERS.length,
  ordersDelta: 12.5,
  ordersTrend: [3, 5, 2, 6, 4, 4, 7, 5],
  customers: MOCK_CUSTOMERS.length,
  customersDelta: 4.1,
  customersTrend: [2, 3, 3, 4, 4, 5, 6, 6],
  aov: 1004,
  aovDelta: -2.3,
  aovTrend: [980, 1010, 950, 1040, 1020, 990, 1015, 1004],
}
