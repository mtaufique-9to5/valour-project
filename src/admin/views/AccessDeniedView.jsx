import { ShieldAlert } from 'lucide-react'
import { Card } from '../components/Card'
import EmptyState from '../components/EmptyState'

// Shown when the server rejects a page for missing permission.
// permission: optional key to display; homeHref: link back to the dashboard.
export default function AccessDeniedView({ permission, homeHref = '/admin', linkComponent: LinkTag = 'a' }) {
  return (
    <Card>
      <EmptyState
        icon={ShieldAlert}
        title="You don’t have access to this page"
        description={
          permission
            ? `This page requires the “${permission}” permission. Ask an owner if you need it.`
            : 'Your role does not include this page. Ask an owner if you need access.'
        }
        action={<LinkTag href={homeHref} className="va-btn va-btn-secondary">Back to dashboard</LinkTag>}
      />
    </Card>
  )
}
