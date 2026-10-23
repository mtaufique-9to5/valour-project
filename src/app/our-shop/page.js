import Header from '@/components/Header'
import ProGrid from '@/components/ProGrid'
import React from 'react'
import "./shop.css"
import Footer from '@/components/Footer'
import { listStorefrontProducts } from '@/server/catalog-v2/storefront'

// Read on every request: products published in the admin appear on the next
// page load, archived ones disappear (static catalog products stay listed).
export const dynamic = 'force-dynamic'

const shop = async () => {
  const [watches, straps] = await Promise.all([listStorefrontProducts('watch'), listStorefrontProducts('strap')])
  return (
    <>
      <Header />
      <ProGrid watches={watches} straps={straps} />
      <Footer />
    </>
  )
}

export default shop
