'use client'

import { Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { TriangleAlert, X } from 'lucide-react'
import Button from './Button'

// Focus-trapped dialog; Escape and backdrop click call onClose.
export function Modal({ open, onClose, title, description, footer, size = 'md', children }) {
  return (
    <Dialog open={open} onClose={onClose} className="va-admin va-portal va-modal-root">
      <DialogBackdrop transition className="va-modal-backdrop" />
      <div className="va-modal-wrap">
        <DialogPanel transition className={`va-modal${size === 'lg' ? ' va-modal-lg' : ''}`}>
          <div className="va-modal-head">
            <div style={{ flex: 1 }}>
              <DialogTitle className="va-modal-title">{title}</DialogTitle>
              {description && <Description className="va-hint" style={{ marginTop: 4 }}>{description}</Description>}
            </div>
            <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close dialog" onClick={onClose} />
          </div>
          <div className="va-modal-body">{children}</div>
          {footer && <div className="va-modal-foot">{footer}</div>}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

// tone="danger" styles the confirm button for destructive actions.
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', loading = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} icon={tone === 'danger' ? TriangleAlert : undefined}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message}
    </Modal>
  )
}

export default Modal
