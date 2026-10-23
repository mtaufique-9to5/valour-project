'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderTree, Pencil, Plus, Power, Tags, Trash2 } from 'lucide-react'
import PageHeader from '@/admin/components/PageHeader'
import { Card } from '@/admin/components/Card'
import DataTable from '@/admin/components/DataTable'
import Button from '@/admin/components/Button'
import { Badge, StatusPill } from '@/admin/components/Badge'
import EmptyState from '@/admin/components/EmptyState'
import { ConfirmDialog, Modal } from '@/admin/components/Modal'
import { FormField, Input, Select, Textarea } from '@/admin/components/FormField'
import { Alert, ToastViewport } from '@/admin/components/Alert'
import useToasts from '@/admin/hooks/useToasts'

// Categories and Brands admin pages (one component, two modes). Every change is
// validated and authorised again on the server (taxonomy-actions.js); the UI only
// hides actions the server would refuse. New entries start inactive.

/** 'Lucent Collection' -> 'lucent-collection' (placeholder preview; the server generates the real, unique slug). */
export const slugify = (s) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180)

const TYPE_LABEL = { product: 'Product', blog: 'Blog' }

export default function TaxonomyClient({ mode, rows = [], actions }) {
  const isCategory = mode === 'category'
  const noun = isCategory ? 'category' : 'brand'
  const router = useRouter()
  const { toasts, push, dismiss } = useToasts()
  const [edit, setEdit] = useState(null) // form values + { id?, errors, error }
  const [confirm, setConfirm] = useState(null) // row to delete
  const [busy, setBusy] = useState(false)

  const empty = isCategory
    ? { name: '', slug: '', type: 'product', parentId: '', description: '', sortOrder: '0' }
    : { name: '', slug: '', description: '' }

  const open = (row) => setEdit(row
    ? { ...empty, ...Object.fromEntries(Object.keys(empty).map((k) => [k, String(row[k] ?? '')])), id: row.id, errors: {} }
    : { ...empty, errors: {} })

  const set = (k) => (e) => {
    const v = e.target.value
    setEdit((x) => ({ ...x, [k]: v }))
  }

  const result = (res, ok) => {
    if (res?.ok) { push({ tone: 'success', title: ok }); router.refresh(); return true }
    push({ tone: 'danger', title: 'Not saved', message: res?.error || 'Could not save the change. Please try again.' })
    return false
  }

  async function save() {
    const values = isCategory
      ? { name: edit.name, slug: edit.slug, type: edit.type, parentId: edit.parentId || null, description: edit.description, sortOrder: Number.parseInt(edit.sortOrder || '0', 10) || 0 }
      : { name: edit.name, slug: edit.slug, description: edit.description }
    setBusy(true)
    const res = edit.id ? await actions.update(edit.id, values) : await actions.create(values)
    setBusy(false)
    if (res?.ok) {
      push({ tone: 'success', title: edit.id ? `${isCategory ? 'Category' : 'Brand'} saved` : `${isCategory ? 'Category' : 'Brand'} created (inactive)` })
      setEdit(null)
      router.refresh()
    } else {
      setEdit((x) => ({ ...x, errors: res?.fieldErrors ?? {}, error: res?.error }))
    }
  }

  async function toggle(row) {
    setBusy(true)
    result(await actions.setStatus(row.id, !row.active), row.active ? `${row.name} deactivated` : `${row.name} activated`)
    setBusy(false)
  }

  async function remove() {
    const row = confirm
    setConfirm(null)
    setBusy(true)
    result(await actions.remove(row.id), `${row.name} deleted`)
    setBusy(false)
  }

  // Parents: same type, not itself (the server also refuses loops and depth > 3).
  const parentOptions = isCategory && edit
    ? [{ value: '', label: 'None (top level)' }, ...rows.filter((r) => r.type === edit.type && r.id !== edit.id).map((r) => ({ value: r.id, label: r.parentName ? `${r.parentName} › ${r.name}` : r.name }))]
    : []

  const inUse = (r) => (isCategory ? r.products + r.children + r.blogs : r.products)
  const usageText = (r) => (isCategory
    ? [r.products && `${r.products} product${r.products === 1 ? '' : 's'}`, r.children && `${r.children} subcategor${r.children === 1 ? 'y' : 'ies'}`, r.blogs && `${r.blogs} blog post${r.blogs === 1 ? '' : 's'}`].filter(Boolean).join(', ')
    : `${r.products} product${r.products === 1 ? '' : 's'}`)

  const columns = [
    { key: 'name', header: isCategory ? 'Category' : 'Brand', sortable: true, searchValue: (r) => `${r.name} ${r.slug}`,
      render: (r) => <div><div className="va-cell-title">{r.name}</div><div className="va-cell-sub va-mono">{r.slug}</div></div> },
    ...(isCategory ? [
      { key: 'type', header: 'Type', sortable: true, render: (r) => <Badge>{TYPE_LABEL[r.type]}</Badge> },
      { key: 'parentName', header: 'Parent', sortable: true, render: (r) => r.parentName ?? <span className="va-muted">—</span> },
    ] : []),
    { key: 'products', header: 'Products', sortable: true, align: 'right' },
    { key: 'active', header: 'Status', sortable: true, sortValue: (r) => (r.active ? 1 : 0), render: (r) => <StatusPill status={r.active ? 'Active' : 'Inactive'} /> },
  ]
  const filters = [
    { key: 'active', label: 'Statuses', options: [{ value: 'yes', label: 'Active' }, { value: 'no', label: 'Inactive' }], match: (r, v) => (v === 'yes') === r.active },
    ...(isCategory ? [{ key: 'type', label: 'Types', options: [{ value: 'product', label: 'Product' }, { value: 'blog', label: 'Blog' }], match: (r, v) => r.type === v }] : []),
  ]

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title={isCategory ? 'Categories' : 'Brands'}
        description={isCategory
          ? 'Product and blog categories (up to 3 levels). New categories start inactive; assign them to products in the product editor.'
          : 'Watch and strap brands. New brands start inactive; assign them to products in the product editor.'}
        actions={<Button variant="primary" icon={Plus} onClick={() => open(null)}>{isCategory ? 'New category' : 'New brand'}</Button>}
      />
      <Card flush>
        <DataTable
          caption={isCategory ? 'Categories' : 'Brands'}
          rows={rows}
          searchPlaceholder={`Search ${isCategory ? 'categories' : 'brands'}…`}
          filters={filters}
          columns={columns}
          emptyState={<EmptyState icon={isCategory ? FolderTree : Tags} title={`No ${isCategory ? 'categories' : 'brands'} yet`} description={`Create the first ${noun} with the button above.`} />}
          rowActions={(r) => (
            <div className="va-row">
              <Button variant="ghost" size="sm" icon={Pencil} onClick={() => open(r)} aria-label={`Edit ${r.name}`}>Edit</Button>
              <Button variant="ghost" size="sm" icon={Power} disabled={busy} onClick={() => toggle(r)}>{r.active ? 'Deactivate' : 'Activate'}</Button>
              <Button variant="ghost" size="sm" icon={Trash2} disabled={busy || inUse(r) > 0} title={inUse(r) > 0 ? `In use: ${usageText(r)}` : undefined}
                onClick={() => setConfirm(r)} aria-label={`Delete ${r.name}`}>Delete</Button>
            </div>
          )}
        />
      </Card>

      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title={edit?.id ? `Edit ${noun}` : `New ${noun}`}
        description={edit?.id ? undefined : `The ${noun} starts inactive. Activate it from the list when it is ready.`}
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={busy} onClick={save} disabled={!edit?.name?.trim()}>Save</Button></>}
      >
        {edit && (
          <form className="va-stack" onSubmit={(e) => { e.preventDefault(); save() }} noValidate>
            {edit.error && <Alert tone="danger">{edit.error}</Alert>}
            <FormField label="Name" required error={edit.errors.name}>
              <Input value={edit.name} onChange={set('name')} maxLength={150} autoComplete="off" />
            </FormField>
            <FormField label="Slug" error={edit.errors.slug} hint={edit.id ? 'Lower-case letters, digits and hyphens. Leave empty to keep the current slug.' : 'Leave empty to create one from the name (-2, -3 … added if taken). Unique, also among deleted entries.'}>
              <Input value={edit.slug} onChange={set('slug')} placeholder={edit.id ? undefined : slugify(edit.name)} maxLength={180} className="va-mono" autoComplete="off" />
            </FormField>
            {isCategory && (
              <>
                <FormField label="Type" required error={edit.errors.type} hint={edit.id ? 'Cannot change while the category is in use.' : 'Product categories appear in the product editor; blog categories are for blog posts.'}>
                  <Select value={edit.type} onChange={(e) => setEdit((x) => ({ ...x, type: e.target.value, parentId: '' }))} options={[{ value: 'product', label: 'Product' }, { value: 'blog', label: 'Blog' }]} />
                </FormField>
                <FormField label="Parent category" error={edit.errors.parentId} hint="Optional. Up to 3 levels; the parent must be the same type.">
                  <Select value={edit.parentId} onChange={set('parentId')} options={parentOptions} />
                </FormField>
                <FormField label="Sort order" error={edit.errors.sortOrder} hint="Lower numbers come first.">
                  <Input inputMode="numeric" value={edit.sortOrder} onChange={set('sortOrder')} />
                </FormField>
              </>
            )}
            <FormField label="Description" error={edit.errors.description}>
              <Textarea rows={3} value={edit.description} onChange={set('description')} maxLength={5000} />
            </FormField>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title={`Delete ${confirm?.name}?`}
        message={`The ${noun} is removed from the admin and the product editor. Its slug stays reserved.`}
        confirmLabel="Delete"
      />
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
