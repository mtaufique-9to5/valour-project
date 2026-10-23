import { notFound } from 'next/navigation'
import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { db } from '@/server/db'
import { getProductForEdit, listBrandOptions, listCategoryOptions } from '@/server/catalog-v2/admin-read'
import ProductEditorClient from '@/admin/client/catalog/ProductEditorClient'
import {
  updateProductAction, setPricesAction, setInventoryAction, setProductStatusAction,
  deleteProductImageAction, setPrimaryImageAction, reorderImagesAction, removeSectionImageAction,
} from '../actions'

export const dynamic = 'force-dynamic'

export default async function AdminEditProductPage({ params }) {
  await requirePagePermission(PERMISSIONS.PRODUCT_UPDATE)
  const { id } = await params
  const [product, categories, brands] = await Promise.all([getProductForEdit(db, id), listCategoryOptions(db), listBrandOptions(db)])
  if (!product) notFound()
  return (
    <ProductEditorClient
      mode="edit"
      product={product}
      categories={categories}
      brands={brands}
      updateProductAction={updateProductAction}
      setPricesAction={setPricesAction}
      setInventoryAction={setInventoryAction}
      setProductStatusAction={setProductStatusAction}
      deleteProductImageAction={deleteProductImageAction}
      setPrimaryImageAction={setPrimaryImageAction}
      reorderImagesAction={reorderImagesAction}
      removeSectionImageAction={removeSectionImageAction}
    />
  )
}
