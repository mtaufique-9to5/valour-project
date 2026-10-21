import { notFound } from 'next/navigation'
import PreviewApp from './PreviewApp'

export default function AdminPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <PreviewApp view="dashboard" />
}
