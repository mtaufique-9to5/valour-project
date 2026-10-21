import { notFound } from 'next/navigation'
import PreviewApp from '../PreviewApp'
import { PREVIEW_VIEWS } from '../views'

export default async function AdminPreviewViewPage({ params }) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { view } = await params
  if (!PREVIEW_VIEWS.includes(view)) notFound()
  return <PreviewApp view={view} />
}
