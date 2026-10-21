'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, RotateCw, Star, Trash2, TriangleAlert, Upload, X } from 'lucide-react'
import Button from './Button'
import { Badge } from './Badge'
import { ConfirmDialog } from './Modal'
import { IMAGE_ACCEPT, IMAGE_MAX_GALLERY, formatBytes, partitionImageFiles, validateImageFile } from '../client/catalog/format'

const GALLERY_SIZES = '(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px'
const MAIN_SIZES = '(max-width: 640px) 90vw, 360px'

/**
 * Default uploader: multipart POST {file, role} with XMLHttpRequest so upload
 * progress is reported. Resolves to the endpoint's JSON ({ ok, image } | { ok:false, error }).
 * Returns { promise, abort }.
 */
export function xhrUpload(url, file, role, onProgress) {
  const xhr = new XMLHttpRequest()
  const promise = new Promise((resolve) => {
    xhr.open('POST', url)
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      const body = xhr.response
      if (xhr.status >= 200 && xhr.status < 300 && body?.ok && body.image) resolve(body)
      else resolve({ ok: false, error: (body && typeof body.error === 'string' && body.error) || `Upload failed (HTTP ${xhr.status}).` })
    }
    xhr.onerror = () => resolve({ ok: false, error: 'Network error. Check your connection and retry.' })
    xhr.onabort = () => resolve({ ok: false, error: 'Upload cancelled.', aborted: true })
    const body = new FormData()
    body.append('file', file)
    body.append('role', role)
    xhr.send(body) // same-origin: session cookies are sent automatically
  })
  return { promise, abort: () => xhr.abort() }
}

const isMain = (img) => img.isPrimary || img.role === 'MAIN'
const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0)

function split(images) {
  const list = [...(images ?? [])].sort(byPosition)
  const main = list.find((i) => i.isPrimary) ?? list.find((i) => i.role === 'MAIN') ?? null
  return { main, gallery: list.filter((i) => i !== main) }
}

let seq = 0
const nextKey = () => `up-${Date.now()}-${seq++}`

/**
 * Main image slot + gallery grid with drag-and-drop uploads.
 *
 * productId: required to upload (new products are saved first).
 * images: [{ id, url, role, position, isPrimary, width, height }] from the server.
 * canEdit: false renders read-only.
 * productName: used for alt text.
 * uploadUrl: defaults to /api/admin/products/{productId}/images.
 * upload(file, role, onProgress) -> { promise, abort }: override (e.g. design preview).
 * deleteImageAction(imageId), setPrimaryAction(productId, imageId),
 * reorderAction(productId, ids): server actions returning { ok } | { ok:false, error }.
 * onImagesChange(images): called with the server-confirmed list after every change.
 * onNotify({ tone, title, message }): optional toast hook.
 */
export default function ImageManager({
  productId,
  images = [],
  canEdit = false,
  productName = 'Product',
  uploadUrl,
  upload,
  deleteImageAction,
  setPrimaryAction,
  reorderAction,
  onImagesChange,
  onNotify,
}) {
  const [serverImages, setServerImages] = useState(images)
  const [prevProp, setPrevProp] = useState(images)
  const [uploads, setUploads] = useState([]) // { key, file, role, previewUrl, progress, status, error }
  const [errors, setErrors] = useState([])
  const [announce, setAnnounce] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const mainInput = useRef(null)
  const galleryInput = useRef(null)
  const aborts = useRef(new Map())
  const urls = useRef(new Set())

  // Server refresh (router.refresh) replaces the confirmed list.
  if (images !== prevProp) {
    setPrevProp(images)
    setServerImages(images)
  }

  useEffect(() => {
    const urlSet = urls.current
    const abortMap = aborts.current
    return () => {
      abortMap.forEach((abort) => abort())
      urlSet.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [])

  // Report the confirmed list to the parent (e.g. the publish checklist).
  useEffect(() => {
    onImagesChange?.(serverImages)
  }, [serverImages, onImagesChange])

  const enabled = canEdit && productId != null
  const { main, gallery } = split(serverImages)
  const pendingMain = uploads.find((u) => u.role === 'MAIN')
  const pendingGallery = uploads.filter((u) => u.role === 'GALLERY')
  const galleryUsed = gallery.length + pendingGallery.length
  const endpoint = uploadUrl ?? `/api/admin/products/${encodeURIComponent(productId ?? '')}/images`

  const commit = (next) => {
    setServerImages(next)
  }
  const revoke = (u) => {
    if (u?.previewUrl) {
      URL.revokeObjectURL(u.previewUrl)
      urls.current.delete(u.previewUrl)
    }
  }
  const patch = (key, changes) => setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...changes } : u)))
  const dropUpload = (key) =>
    setUploads((list) => {
      revoke(list.find((u) => u.key === key))
      return list.filter((u) => u.key !== key)
    })

  const start = (item) => {
    patch(item.key, { status: 'uploading', progress: 0, error: null })
    const run = upload ?? ((file, role, onProgress) => xhrUpload(endpoint, file, role, onProgress))
    const { promise, abort } = run(item.file, item.role, (progress) => patch(item.key, { progress }))
    aborts.current.set(item.key, abort)
    promise
      .then((res) => {
        aborts.current.delete(item.key)
        if (res?.aborted) return
        if (res?.ok && res.image) {
          setServerImages((list) => {
            const img = res.image
            let next = list.filter((i) => i.id !== img.id)
            if (item.role === 'MAIN' || img.isPrimary) {
              // The new main image replaces the previous one.
              next = next.filter((i) => !isMain(i))
            }
            next = [...next, img]
            return next
          })
          dropUpload(item.key)
          setAnnounce(`${item.file.name} uploaded.`)
        } else {
          const error = (res && res.error) || 'Upload failed.'
          patch(item.key, { status: 'error', error })
          setAnnounce(`${item.file.name} failed to upload: ${error}`)
        }
      })
      .catch(() => {
        aborts.current.delete(item.key)
        patch(item.key, { status: 'error', error: 'Upload failed.' })
        setAnnounce(`${item.file.name} failed to upload.`)
      })
  }

  const queue = (files, role) => {
    if (!enabled) return
    let accepted
    let errs
    if (role === 'MAIN') {
      const file = Array.from(files ?? [])[0]
      const err = validateImageFile(file)
      accepted = err ? [] : [file]
      errs = err ? [err] : []
    } else {
      ;({ accepted, errors: errs } = partitionImageFiles(files, galleryUsed))
    }
    setErrors(errs)
    if (errs.length) setAnnounce(errs.join(' '))
    if (role === 'MAIN' && accepted.length && pendingMain) {
      aborts.current.get(pendingMain.key)?.()
      dropUpload(pendingMain.key)
    }
    const items = accepted.map((file) => {
      const previewUrl = URL.createObjectURL(file)
      urls.current.add(previewUrl)
      return { key: nextKey(), file, role, previewUrl, progress: 0, status: 'uploading', error: null }
    })
    if (!items.length) return
    setUploads((list) => [...list, ...items])
    setAnnounce(`Uploading ${items.length} image${items.length > 1 ? 's' : ''}…`)
    items.forEach(start)
  }

  const run = async (fn, okMessage, revert) => {
    setBusy(true)
    try {
      const res = await fn()
      if (res?.ok) {
        setAnnounce(okMessage)
        return true
      }
      revert?.()
      const msg = (res && res.error) || 'Could not save the change. Please try again.'
      setAnnounce(msg)
      onNotify?.({ tone: 'danger', title: 'Image change failed', message: msg })
    } catch {
      revert?.()
      setAnnounce('Could not save the change. Please try again.')
      onNotify?.({ tone: 'danger', title: 'Image change failed', message: 'Could not save the change. Please try again.' })
    } finally {
      setBusy(false)
    }
    return false
  }

  const remove = async (img) => {
    const before = serverImages
    const ok = await run(() => deleteImageAction(img.id), 'Image removed.', () => commit(before))
    if (ok) commit(before.filter((i) => i.id !== img.id))
    setConfirm(null)
  }

  const makePrimary = (img) => {
    const before = serverImages
    // Server moves the old main to the end of the gallery.
    const end = Math.max(0, ...before.map((i) => i.position ?? 0)) + 1
    commit(before.map((i) => (i.id === img.id ? { ...i, isPrimary: true, role: 'MAIN', position: 0 } : isMain(i) ? { ...i, isPrimary: false, role: 'GALLERY', position: end } : i)))
    run(() => setPrimaryAction(productId, img.id), 'Main image updated.', () => commit(before))
  }

  const move = (index, dir) => {
    const target = index + dir
    if (target < 0 || target >= gallery.length) return
    const order = [...gallery]
    ;[order[index], order[target]] = [order[target], order[index]]
    const before = serverImages
    const ids = order.map((i) => i.id) // every gallery id exactly once; main excluded
    commit([...(main ? [main] : []), ...ids.map((id, n) => ({ ...serverImages.find((i) => i.id === id), position: n + 1 }))])
    run(() => reorderAction(productId, ids), `Moved to position ${target + 1}.`, () => commit(before))
  }

  // Drop targets carry data-role; handlers read it so nothing is built during render.
  const onDragOver = (e) => {
    if (!enabled) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOver(e.currentTarget.dataset.role)
  }
  const onDragLeave = () => setDragOver(null)
  const onDrop = (e) => {
    if (!enabled) return
    e.preventDefault()
    setDragOver(null)
    queue(e.dataTransfer.files, e.currentTarget.dataset.role)
  }
  const dropHandlers = { onDragOver, onDragLeave, onDrop }
  const retry = (key) => {
    const item = uploads.find((u) => u.key === key)
    if (item) start(item)
  }

  const usedLabel = `${gallery.length} of ${IMAGE_MAX_GALLERY} gallery images`

  return (
    <div className={`va-image-manager${enabled ? '' : ' va-is-disabled'}`}>
      <p className="va-sr-only" aria-live="polite" role="status">{announce}</p>

      {productId == null && (
        <p className="va-hint">Save the product as a draft first; images can be added on the edit page.</p>
      )}
      {productId != null && !canEdit && <p className="va-hint">Read-only: you do not have permission to change images.</p>}

      {errors.length > 0 && (
        <ul className="va-img-errors" role="alert">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      <div className="va-img-layout">
        <section className="va-img-main" aria-labelledby="va-img-main-title">
          <h3 id="va-img-main-title" className="va-label">Main image</h3>
          {pendingMain ? (
            <UploadTile u={pendingMain} alt={`New main image for ${productName}`} onRetry={retry} onRemove={dropUpload} />
          ) : main ? (
            <div className={`va-img-tile${dragOver === 'MAIN' ? ' va-is-over' : ''}`} data-role="MAIN" {...dropHandlers}>
              <div className="va-img-frame">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of uploaded images */}
                <img src={main.url} alt={`Main image of ${productName}`} loading="lazy" sizes={MAIN_SIZES} width={main.width ?? undefined} height={main.height ?? undefined} />
                <Badge tone="gold" className="va-img-badge">Main</Badge>
              </div>
              {enabled && (
                <div className="va-img-actions">
                  <Button size="sm" icon={Upload} onClick={() => mainInput.current?.click()} disabled={busy}>Replace</Button>
                  {deleteImageAction && (
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirm(main)} disabled={busy} aria-label="Remove main image">Remove</Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className={`va-dropzone va-dropzone-main${dragOver === 'MAIN' ? ' va-is-over' : ''}`} data-role="MAIN" {...dropHandlers}>
              <ImagePlus size={24} aria-hidden="true" />
              <p>{enabled ? 'Drop the main image here' : 'No main image'}</p>
              {enabled && <Button size="sm" variant="primary" onClick={() => mainInput.current?.click()}>Choose file</Button>}
              <p className="va-hint">JPG, PNG or WebP · max 5 MB · 200–8000 px</p>
            </div>
          )}
          <input
            ref={mainInput}
            type="file"
            accept={IMAGE_ACCEPT}
            className="va-sr-only"
            tabIndex={-1}
            aria-hidden="true"
            disabled={!enabled}
            onChange={(e) => {
              queue(e.target.files, 'MAIN')
              e.target.value = ''
            }}
          />
        </section>

        <section className="va-img-gallery" aria-labelledby="va-img-gallery-title">
          <div className="va-row va-between">
            <h3 id="va-img-gallery-title" className="va-label">Gallery</h3>
            <span className="va-hint">{usedLabel}</span>
          </div>
          <ul className="va-img-grid" aria-label="Gallery images">
            {gallery.map((img, i) => (
              <li key={img.id} className="va-img-tile">
                <div className="va-img-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of uploaded images */}
                  <img src={img.url} alt={`${productName}, gallery image ${i + 1}`} loading="lazy" sizes={GALLERY_SIZES} width={img.width ?? undefined} height={img.height ?? undefined} />
                  <span className="va-img-pos" aria-hidden="true">{i + 1}</span>
                </div>
                {enabled && (
                  <div className="va-img-actions">
                    {reorderAction && (
                      <>
                        <Button size="sm" variant="ghost" iconOnly icon={ArrowUp} aria-label={`Move image ${i + 1} up`} disabled={busy || i === 0} onClick={() => move(i, -1)} />
                        <Button size="sm" variant="ghost" iconOnly icon={ArrowDown} aria-label={`Move image ${i + 1} down`} disabled={busy || i === gallery.length - 1} onClick={() => move(i, 1)} />
                      </>
                    )}
                    {setPrimaryAction && (
                      <Button size="sm" variant="ghost" iconOnly icon={Star} aria-label={`Set image ${i + 1} as main image`} disabled={busy} onClick={() => makePrimary(img)} />
                    )}
                    {deleteImageAction && (
                      <Button size="sm" variant="ghost" iconOnly icon={Trash2} aria-label={`Remove image ${i + 1}`} disabled={busy} onClick={() => setConfirm(img)} />
                    )}
                  </div>
                )}
              </li>
            ))}
            {pendingGallery.map((u) => (
              <li key={u.key}><UploadTile u={u} alt={`New gallery image ${u.file.name} for ${productName}`} onRetry={retry} onRemove={dropUpload} /></li>
            ))}
            {enabled && galleryUsed < IMAGE_MAX_GALLERY && (
              <li>
                <div className={`va-dropzone${dragOver === 'GALLERY' ? ' va-is-over' : ''}`} data-role="GALLERY" {...dropHandlers}>
                  <ImagePlus size={20} aria-hidden="true" />
                  <p>Drop images</p>
                  <Button size="sm" onClick={() => galleryInput.current?.click()}>Add images</Button>
                </div>
              </li>
            )}
          </ul>
          {!enabled && gallery.length === 0 && <p className="va-muted">No gallery images.</p>}
          <input
            ref={galleryInput}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            className="va-sr-only"
            tabIndex={-1}
            aria-hidden="true"
            disabled={!enabled}
            onChange={(e) => {
              queue(e.target.files, 'GALLERY')
              e.target.value = ''
            }}
          />
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={() => confirm && remove(confirm)}
        loading={busy}
        title="Remove image?"
        message={confirm && isMain(confirm) ? 'The product will have no main image and cannot be published until a new one is added.' : 'The image will be removed from this product.'}
        confirmLabel="Remove image"
      />
    </div>
  )
}

// Local preview tile for an in-flight or failed upload.
function UploadTile({ u, alt, onRetry, onRemove }) {
  return (
    <div className={`va-img-tile${u.status === 'error' ? ' va-img-error' : ''}`}>
      <div className="va-img-frame">
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
        <img src={u.previewUrl} alt={alt} />
        {u.status === 'uploading' && (
          <div className="va-img-overlay">
            <progress max={100} value={u.progress} aria-label={`Uploading ${u.file.name}`} />
            <span aria-hidden="true">{`${u.progress}%`}</span>
          </div>
        )}
      </div>
      <div className="va-img-meta">
        <span className="va-img-name" title={u.file.name}>{u.file.name}</span>
        <span className="va-hint">{formatBytes(u.file.size)}</span>
      </div>
      {u.status === 'error' && (
        <>
          <p className="va-error-text"><TriangleAlert size={12} aria-hidden="true" /> {u.error}</p>
          <div className="va-img-actions">
            <Button size="sm" icon={RotateCw} onClick={() => onRetry(u.key)}>Retry</Button>
            <Button size="sm" variant="ghost" icon={X} onClick={() => onRemove(u.key)}>Remove</Button>
          </div>
        </>
      )}
    </div>
  )
}
