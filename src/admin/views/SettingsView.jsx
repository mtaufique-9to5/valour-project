'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import Button from '../components/Button'
import Tabs from '../components/Tabs'
import { Alert } from '../components/Alert'
import { FormField, Input, Select, Toggle } from '../components/FormField'

// settings = { storeName, supportEmail, currency, timezone, sessionTimeoutMinutes,
//              requireMfa, maintenanceMode, orderEmails, lowStockAlerts }
// onSave(values); readOnly disables every control (no settings.update permission).
export default function SettingsView({ settings, onSave, saving = false, error, success, readOnly = false, badge }) {
  const [values, setValues] = useState(settings ?? {})
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e?.target ? e.target.value : e }))

  const footer = !readOnly && (
    <div className="va-row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
      <Button type="submit" variant="primary" icon={Save} loading={saving}>Save settings</Button>
    </div>
  )

  return (
    <>
      <PageHeader eyebrow="Administration" title="Settings" description="Store details, security and notifications." badge={badge} />
      {readOnly && <Alert tone="info">You can view these settings but need settings.update to change them.</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}
      <form onSubmit={(e) => { e.preventDefault(); onSave?.(values) }}>
        <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <Tabs
            label="Settings sections"
            tabs={[
              {
                id: 'store',
                label: 'Store',
                content: (
                  <Card title="Store details">
                    <div className="va-form-grid">
                      <FormField label="Store name" required><Input value={values.storeName ?? ''} onChange={set('storeName')} /></FormField>
                      <FormField label="Support email" required><Input type="email" value={values.supportEmail ?? ''} onChange={set('supportEmail')} /></FormField>
                      <FormField label="Currency" hint="Prices are confirmed in USD."><Select value={values.currency ?? 'USD'} onChange={set('currency')} options={['USD']} /></FormField>
                      <FormField label="Timezone"><Select value={values.timezone ?? 'UTC'} onChange={set('timezone')} options={['UTC', 'America/New_York', 'Europe/London', 'Asia/Karachi', 'Asia/Dubai']} /></FormField>
                    </div>
                    {footer}
                  </Card>
                ),
              },
              {
                id: 'security',
                label: 'Security',
                content: (
                  <Card title="Security">
                    <div className="va-stack">
                      <Toggle label="Require two-factor authentication" description="All admin users must use an authenticator app." checked={Boolean(values.requireMfa)} onChange={set('requireMfa')} disabled={readOnly} />
                      <FormField label="Session timeout (minutes)" hint="Idle admin sessions are signed out after this time.">
                        <Input type="number" min={5} max={240} value={values.sessionTimeoutMinutes ?? 30} onChange={set('sessionTimeoutMinutes')} />
                      </FormField>
                      <Toggle label="Maintenance mode" description="Temporarily hide the storefront from customers." checked={Boolean(values.maintenanceMode)} onChange={set('maintenanceMode')} disabled={readOnly} />
                    </div>
                    {footer}
                  </Card>
                ),
              },
              {
                id: 'notifications',
                label: 'Notifications',
                content: (
                  <Card title="Notifications">
                    <div className="va-stack">
                      <Toggle label="New order emails" description="Email the support address when an order is placed." checked={Boolean(values.orderEmails)} onChange={set('orderEmails')} disabled={readOnly} />
                      <Toggle label="Low stock alerts" description="Email when a product falls below its reorder point." checked={Boolean(values.lowStockAlerts)} onChange={set('lowStockAlerts')} disabled={readOnly} />
                    </div>
                    {footer}
                  </Card>
                ),
              },
            ]}
          />
        </fieldset>
      </form>
    </>
  )
}
