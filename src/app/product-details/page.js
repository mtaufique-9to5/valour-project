'use client'

// Retired: this page duplicated the Sunseeker Yellow product page with hardcoded
// content (and a broken mobile gallery). Old links and bookmarks are sent to the
// real product page. The previous component (components/ProductDetails.jsx) and
// its stylesheet (./p-details.css) are no longer used.
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const TARGET = '/our-shop/sunseeker-yellow/'

const ProductDetailsRedirect = () => {
  const router = useRouter()

  useEffect(() => {
    router.replace(TARGET)
  }, [router])

  return (
    <>
      {/* Works without JavaScript; relative so it also respects a basePath. */}
      <meta httpEquiv="refresh" content="0;url=../our-shop/sunseeker-yellow/" />
      <p style={{ padding: 40, color: '#fff' }}>
        This page has moved. <Link href={TARGET}>Continue to Sunseeker Yellow</Link>
      </p>
    </>
  )
}

export default ProductDetailsRedirect
