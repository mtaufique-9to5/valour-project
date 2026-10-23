'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import Button from '@/admin/components/Button'
import { ConfirmDialog } from '@/admin/components/Modal'
import { IMAGE_ACCEPT, validateImageFile } from './format'

// One dedicated product page image slot (e.g. the Movement image), stored in
// products.additional_info.media[role]. Upload / Replace sends the file to the
// secured image route with role "section:<role>" (same validation and storage as
// every product image); Remove clears the slot. The gallery is never touched.
export default function SectionImageField({ productId, role, label, hint, path, disabled = false, removeAction, onChanged, onNotify }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function upload(file) {
    const problem = validateImageFile(file)
    if (problem) { onNotify?.({ tone: 'danger', title: 'Image not uploaded', message: problem }); return }
    setBusy(true)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('role', `section:${role}`)
      const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/images/`, { method: 'POST', body, credentials: 'same-origin' })
      let data = {}
      try { data = await res.json() } catch { /* empty body */ }
      if (res.ok && data.ok) {
        onNotify?.({ tone: 'success', title: `${label} updated` })
        onChanged?.()
      } else {
        onNotify?.({ tone: 'danger', title: 'Image not uploaded', message: data.error || `Upload failed (HTTP ${res.status}).` })
      }
    } catch {
      onNotify?.({ tone: 'danger', title: 'Image not uploaded', message: 'Network error. Check your connection and retry.' })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function remove() {
    setConfirm(false)
    setBusy(true)
    const res = await removeAction(productId, role)
    setBusy(false)
    if (res?.ok) { onNotify?.({ tone: 'success', title: `${label} removed` }); onChanged?.() }
    else onNotify?.({ tone: 'danger', title: 'Image not removed', message: res?.error || 'Could not save the change. Please try again.' })
  }

  return (
    <div className="va-field">
      <span className="va-label">{label}</span>
      <div className="va-row" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {path ? (
          <img src={path} alt={label} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--va-border, #333)' }} />
        ) : (
          <span className="va-hint" style={{ width: 96, height: 96, display: 'grid', placeItems: 'center', border: '1px dashed var(--va-border, #444)', borderRadius: 8 }}>
            <ImagePlus size={20} aria-hidden="true" />
          </span>
        )}
        <div className="va-row" style={{ gap: 8 }}>
          <Button variant="secondary" size="sm" icon={Upload} loading={busy} disabled={disabled} onClick={() => input.current?.click()}>
            {path ? 'Replace' : 'Upload'}
          </Button>
          {path && <Button variant="ghost" size="sm" icon={Trash2} disabled={disabled || busy} onClick={() => setConfirm(true)}>Remove</Button>}
        </div>
        <input ref={input} type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      {hint && <span className="va-hint">{hint}</span>}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        title={`Remove ${label.toLowerCase()}?`}
        message="It disappears from the product page. The file is deleted only if this product does not use it anywhere else."
        confirmLabel="Remove"
      />
    </div>
  )
}
