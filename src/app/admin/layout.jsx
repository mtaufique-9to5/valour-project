// Every admin page is private, rendered per request and never indexed.
export const metadata = {
  title: 'VALOUR Admin',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default function AdminRootLayout({ children }) {
  return children
}
