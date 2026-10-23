import AdminLoading from '@/admin/components/AdminLoading'

// Shared loading boundary for every admin page in this route group (and any
// future one). Next.js shows it inside the panel layout while a page segment is
// rendering, so the sidebar and header stay visible.
export default function AdminPanelLoading() {
  return <AdminLoading />
}
