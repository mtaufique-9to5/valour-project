// The one place product page URLs are built: every watch and strap lives at
// /our-shop/{slug}/ (slugs are unique across both types; see catalog.js).
export const getProductHref = (product) => `/our-shop/${product.slug}/`
