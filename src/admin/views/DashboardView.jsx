'use client'

import { Boxes, DollarSign, ShoppingBag, TrendingUp, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card, StatCard } from '../components/Card'
import { SampleBadge, StatusPill } from '../components/Badge'
import { MiniBarChart, Sparkline } from '../components/Charts'
import EmptyState from '../components/EmptyState'
import { Alert } from '../components/Alert'
import { formatDate, formatMoneyShort, formatPrice } from './format'

// stats: { revenue, revenueDelta, revenueTrend[], orders, ordersDelta, ordersTrend[],
//          customers, customersDelta, customersTrend[], aov, aovDelta, aovTrend[] } or null
// revenueSeries: [{ label, value }]; recentOrders: order rows; lowStock: inventory rows.
// sample: true when any of the above come from src/admin/mock.
export default function DashboardView({ userName, stats, revenueSeries = [], recentOrders = [], lowStock = [], sample = false }) {
  const badge = sample ? <SampleBadge /> : null
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={userName ? `Welcome back, ${userName.split(' ')[0]}` : 'Dashboard'}
        description="Store performance at a glance."
        badge={badge}
      />

      {!stats ? (
        <Card>
          <EmptyState icon={ShoppingBag} title="No orders yet" description="Online payment is not live, so there is no sales data to show." />
        </Card>
      ) : (
        <div className="va-grid va-grid-stats">
          <StatCard label="Revenue (30 days)" value={formatMoneyShort(stats.revenue)} icon={DollarSign} delta={stats.revenueDelta} deltaLabel="vs prior" chart={<Sparkline data={stats.revenueTrend} label="Revenue trend" />} />
          <StatCard label="Orders" value={stats.orders} icon={ShoppingBag} delta={stats.ordersDelta} deltaLabel="vs prior" chart={<Sparkline data={stats.ordersTrend} label="Orders trend" />} />
          <StatCard label="Customers" value={stats.customers} icon={Users} delta={stats.customersDelta} deltaLabel="vs prior" chart={<Sparkline data={stats.customersTrend} label="Customers trend" />} />
          <StatCard label="Avg. order value" value={formatMoneyShort(stats.aov)} icon={TrendingUp} delta={stats.aovDelta} deltaLabel="vs prior" chart={<Sparkline data={stats.aovTrend} label="Average order value trend" />} />
        </div>
      )}

      <div className="va-grid va-grid-main">
        <Card title="Weekly revenue" subtitle="Last 8 weeks" actions={badge}>
          {revenueSeries.length ? (
            <MiniBarChart data={revenueSeries} label="Weekly revenue, last 8 weeks" formatValue={formatMoneyShort} />
          ) : (
            <EmptyState title="No revenue yet" description="Charts appear once paid orders exist." />
          )}
        </Card>
        <Card title="Low stock" subtitle="At or below reorder point" actions={badge} flush>
          {lowStock.length ? (
            <ul className="va-list" style={{ padding: '4px 20px' }}>
              {lowStock.map((item) => (
                <li key={item.id}>
                  <span>
                    <span className="va-cell-title">{item.name}</span>
                    <span className="va-cell-sub" style={{ display: 'block' }}>{item.ref}</span>
                  </span>
                  <StatusPill status={item.status}>{`${item.available} left`}</StatusPill>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Boxes} title="Stock looks healthy" description="Nothing is below its reorder point." />
          )}
        </Card>
      </div>

      <Card title="Recent orders" actions={badge} flush>
        {recentOrders.length ? (
          <div className="va-table-scroll va-table-stack">
            <table className="va-table">
              <caption className="va-sr-only">Recent orders</caption>
              <thead>
                <tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Date</th><th scope="col">Status</th><th scope="col" className="va-num">Total</th></tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td data-label="Order" className="va-mono">{o.id}</td>
                    <td data-label="Customer">{o.customer}</td>
                    <td data-label="Date">{formatDate(o.date)}</td>
                    <td data-label="Status"><StatusPill status={o.status} /></td>
                    <td data-label="Total" className="va-num">{formatPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={ShoppingBag} title="No orders yet" description="Online payment is not live." />
        )}
      </Card>

      {sample && <Alert tone="info">Figures on this page are sample data for design review. No real orders exist yet.</Alert>}
    </>
  )
}
