// STAGED - move to src/app/admin/(panel)/products/[id]/page.jsx after the catalog migration.
// product.view opens a read-only view; product.update enables editing.
import { notFound } from 'next/navigation'
import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { getProduct, listCategories } from '@/server/catalog/repository'
import {
  adjustInventory,
  deleteProductImage,
  reorderImages,
  setPrimaryImage,
  setProductStatus,
  setTrackingMode,
  updatePrice,
  updateProduct,
} from '@/server/catalog/actions'
import ProductFormClient from '@/admin/client/catalog/ProductFormClient'

export const dynamic = 'force-dynamic'

export default async function AdminProductEditPage({ params }) {
  const ctx = await requirePagePermission(PERMISSIONS.PRODUCT_VIEW)
  const { id } = await params
  const [product, categories] = await Promise.all([getProduct(id), listCategories()])
  if (!product) notFound()
  const has = (p) => ctx.permissions.includes(p)
  const canEdit = has(PERMISSIONS.PRODUCT_UPDATE)
  const canEditPrice = has(PERMISSIONS.PRODUCT_PRICE_UPDATE)
  const canEditStock = has(PERMISSIONS.INVENTORY_UPDATE)
  return (
    <ProductFormClient
      mode="edit"
      product={product}
      categories={categories}
      canEdit={canEdit}
      canEditPrice={canEditPrice}
      canEditStock={canEditStock}
      updateProductAction={canEdit ? updateProduct : undefined}
      setProductStatusAction={canEdit ? setProductStatus : undefined}
      deleteProductImageAction={canEdit ? deleteProductImage : undefined}
      setPrimaryImageAction={canEdit ? setPrimaryImage : undefined}
      reorderImagesAction={canEdit ? reorderImages : undefined}
      updatePriceAction={canEditPrice ? updatePrice : undefined}
      adjustInventoryAction={canEditStock ? adjustInventory : undefined}
      setTrackingModeAction={canEditStock ? setTrackingMode : undefined}
    />
  )
}
