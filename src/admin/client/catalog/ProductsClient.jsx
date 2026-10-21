'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import ProductsView from '@/admin/views/ProductsView'
import { ConfirmDialog } from '@/admin/components/Modal'
import { ToastViewport } from '@/admin/components/Alert'
import useToasts from '@/admin/hooks/useToasts'
import { getProductHref } from '@/app/features/product/productUrl'
import { buildProductsSearch, errorOf } from './format'


/**
 * Server-driven product list. The page reads searchParams (q, type, status,
 * category, page), calls listProducts, and passes the result here; every
 * filter change is a router.replace so the server re-renders the page.
 *
 * rows/total/page/pageSize: listProducts result. query: parsed search params.
 * categories: [{ id, name }]. canCreate (product.create), canEdit (product.update).
 * archiveProductAction(id): server action. basePath: '/admin/products'.
 */
export default function ProductsClient({
  rows = [],
  total = 0,
  page = 1,
  pageSize = 20,
  query = {},
  categories = [],
  canCreate = false,
  canEdit = false,
  archiveProductAction,
  basePath = '/admin/products',
  newHref = `${basePath}/new`,
  editHref = (r) => `${basePath}/${encodeURIComponent(r.id)}`,
  storefrontHref = getProductHref,
  badge,
}) {
  const router = useRouter()
  const pathname = usePathname() || basePath
  const { toasts, push, dismiss } = useToasts()
  const [updating, startTransition] = useTransition()
  const [archiving, setArchiving] = useState(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const go = (changes) => {
    const search = buildProductsSearch(query, changes)
    startTransition(() => router.replace(`${pathname}${search}`, { scroll: false }))
  }

  const onSearch = (q) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => go({ q }), SEARCH_DEBOUNCE_MS)
  }

  const archive = async () => {
    if (!archiving) return
    setBusy(true)
    try {
      const res = await archiveProductAction(archiving.id)
      if (res?.ok) {
        push({ tone: 'success', title: 'Product archived', message: archiving.name })
        setArchiving(null)
        router.refresh()
      } else {
        push({ tone: 'danger', title: 'Not archived', message: errorOf(res) })
      }
    } catch {
      push({ tone: 'danger', title: 'Not archived', message: errorOf(null) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ProductsView
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        query={query}
        categories={categories}
        canCreate={canCreate}
        canEdit={canEdit}
        updating={updating}
        onSearch={onSearch}
        onFilterChange={(key, value) => go({ [key]: value })}
        onPageChange={(p) => go({ page: p })}
        onNew={canCreate ? () => router.push(newHref) : undefined}
        onEdit={(r) => router.push(editHref(r))}
        onArchive={canEdit && archiveProductAction ? setArchiving : undefined}
        storefrontHref={storefrontHref}
        badge={badge}
      />
      <ConfirmDialog
        open={Boolean(archiving)}
        onClose={() => !busy && setArchiving(null)}
        onConfirm={archive}
        loading={busy}
        title={archiving ? `Archive ${archiving.name}?` : 'Archive product?'}
        message="Archived products are hidden from the storefront. You can restore one by changing its status back to Draft or Active."
        confirmLabel="Archive"
      />
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
