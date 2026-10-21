'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import InventoryView from '@/admin/views/InventoryView'
import { ToastViewport } from '@/admin/components/Alert'
import useToasts from '@/admin/hooks/useToasts'
import InventoryAdjustModal from './InventoryAdjustModal'

// items: toInventoryRow rows. canEdit: has inventory.update (cosmetic; server enforces).
// adjustInventoryAction: adjustInventory; setTrackingModeAction (optional): setTrackingMode.
export default function InventoryClient({ items = [], canEdit = false, adjustInventoryAction, setTrackingModeAction, badge }) {
  const router = useRouter()
  const { toasts, push, dismiss } = useToasts()
  const [editing, setEditing] = useState(null)
  const enabled = canEdit && Boolean(adjustInventoryAction)
  return (
    <>
      <InventoryView items={items} onAdjust={enabled ? setEditing : undefined} badge={badge} />
      {editing && (
        <InventoryAdjustModal
          key={editing.id}
          open
          item={editing}
          action={adjustInventoryAction}
          trackingAction={setTrackingModeAction}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            push({ tone: 'success', title: 'Stock updated', message: editing.name })
            setEditing(null)
            router.refresh()
          }}
        />
      )}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
