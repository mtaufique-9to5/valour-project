// Single source of truth for everything that can go in the cart.
//
// `products` is the unified collection of watches and straps; `type` is the
// product category ("watch" | "strap"), and a watch's movement lives in
// `movement`. Products carry no price: getUnitPrice() / getProductPrice() only
// return values from CONFIRMED_PRICES, and anything without a confirmed price
// is shown as "Price on request". Watches are unconfirmed; straps are a
// confirmed $45.00 each. Customizer options (case / dial / strap) and the
// "Custom Watch" they build live here too, also unpriced until confirmed.

const watchData = [
  {
    id: 1,
    ref: "LUC-01",
    name: "Sunseeker Yellow",
    slug: "sunseeker-yellow",
    legacyName: "Sunseeker Yellow",
    subtitle: "Lucent Collection",
    detail: "Lucent Collection",
    link: "/product-details",
    collection: "lucent",
    type: "watch",
    movement: "automatic",
    material: "titanium",
    color: "yellow",
    image: "/images/watch-1.png",
    mainImage: "/images/sunseeker-yellow/img-1.jpeg",
    secbgImage: "/images/sunseeker-yellow/img-3.jpeg",
    secbgImage3: "/images/sunseeker-yellow/img-2.jpeg",
    futureHeading: "Sunseeker Yellow",
    secTitle: "Sunseeker Yellow",
    accent: "#FACC15",
    limited: false,
    edition: null,
    quantity: 1,
    pdpSubtitle: "LUC-01 • Automatic Collection",
    tagline: "Engineered for Everyday Adventure",
    detail1: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
    description: [
      { text: "The ", bold: "Sunseeker Yellow", suffix: " embodies the spirit of exploration and optimism, combining contemporary design with dependable Swiss-inspired craftsmanship." },
      { text: "Built with a lightweight ", bold: "titanium case", suffix: " and powered by a precision ", bold2: "automatic movement", suffix2: ", it delivers exceptional reliability and smooth performance for every occasion.", bold3: "Designed for modern lifestyles", suffix3: ", Sunseeker Yellow balances bold aesthetics with everyday practicality." },
      { text: "Distinctive, versatile, and unmistakably Valour—", bold: "Sunseeker Yellow is made for those who move forward with confidence." }
    ],
    thumbnails: [
      { id: 1, img: "/images/watch-1.png" },
      { id: 2, img: "/images/watch-2.png" },
      { id: 3, img: "/images/watch-3.png" },
      { id: 4, img: "/images/watch-4.png" },
      { id: 5, img: "/images/watch-5.png" },
      { id: 6, img: "/images/watch-6.png" }
    ],
    editions: ["P-01", "P-02", "P-03", "P-04", "P-05"],
    specs: [
      { label: "Case Material", value: "Titanium" },
      { label: "Case Diameter", value: "40mm" },
      { label: "Case Thickness", value: "11.2mm" },
      { label: "Movement", value: "Automatic Mechanical" },
      { label: "Power Reserve", value: "72 Hours" },
      { label: "Water Resistance", value: "100m / 10 ATM" },
      { label: "Strap Material", value: "Premium Textile Strap" },
      { label: "Crystal", value: "Scratch-Resistant Sapphire" },
      { label: "Dial Finish", value: "Sunburst Yellow" },
      { label: "Weight", value: "78g" },
      { label: "Warranty", value: "5 Years International" }
    ]
  },
  {
    id: 2,
    ref: "LUC-06",
    name: "Astral Blue",
    slug: 'astral-blue',
    legacyName: "Midnight Blue",
    subtitle: "Lucent Collection",
    detail: "Lucent Collection",
    link: "/product-details",
    collection: "lucent",
    type: "watch",
    movement: "automatic",
    material: "titanium",
    color: "blue",
    image: "/images/watch-2.png",
    mainImage: "/images/astral-blue/2.jpeg",
    secbgImage: "/images/astral-blue/1.jpeg",
    secbgImage3: "/images/astral-blue/3.jpeg",
    futureHeading: "Astral Blue",
    secTitle: "Astral Blue",
    accent: "#3B82F6",
    limited: false,
    edition: null,
    quantity: 1,
    pdpSubtitle: "LUC-06 • Automatic Collection",
    tagline: "Engineered for Everyday Adventure",
    detail1: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
    description: [
      { text: "The ", bold: "Astral Blue", suffix: " embodies the spirit of exploration and optimism, combining contemporary design with dependable Swiss-inspired craftsmanship." },
      { text: "Built with a lightweight ", bold: "titanium case", suffix: " and powered by a precision ", bold2: "automatic movement", suffix2: ", it delivers exceptional reliability and smooth performance for every occasion.", bold3: "Designed for modern lifestyles", suffix3: ", Astral Blue balances bold aesthetics with everyday practicality." },
      { text: "Distinctive, versatile, and unmistakably Valour—", bold: "Astral Blue is made for those who move forward with confidence." }
    ],
    thumbnails: [
      { id: 1, img: "/images/watch-1.png" },
      { id: 2, img: "/images/watch-2.png" },
      { id: 3, img: "/images/watch-3.png" },
      { id: 4, img: "/images/watch-4.png" },
      { id: 5, img: "/images/watch-5.png" },
      { id: 6, img: "/images/watch-6.png" }
    ],
    editions: ["P-01", "P-02", "P-03", "P-04", "P-05"],
    specs: [
      { label: "Case Material", value: "Titanium" },
      { label: "Case Diameter", value: "40mm" },
      { label: "Case Thickness", value: "11.2mm" },
      { label: "Movement", value: "Automatic Mechanical" },
      { label: "Power Reserve", value: "72 Hours" },
      { label: "Water Resistance", value: "100m / 10 ATM" },
      { label: "Strap Material", value: "Premium Textile Strap" },
      { label: "Crystal", value: "Scratch-Resistant Sapphire" },
      { label: "Dial Finish", value: "Sunburst Blue" },
      { label: "Weight", value: "78g" },
      { label: "Warranty", value: "5 Years International" }
    ]
  },
  {
    id: 3,
    ref: "LUC-05",
    name: "Aurora Mint",
    slug: "aurora-mint",
    legacyName: "Forest Green",
    subtitle: "Lucent Collection",
    detail: "Lucent Collection",
    link: "/product-details",
    collection: "lucent",
    type: "watch",
    movement: "automatic",
    material: "titanium",
    color: "mint",
    image: "/images/watch-3.png",
    mainImage: "/images/aurora-mint/1.jpeg",
    secbgImage: "/images/aurora-mint/2.jpeg",
    secbgImage3: "/images/aurora-mint/3.jpeg",
    futureHeading: "Aurora Mint",
    secTitle: "Aurora Mint",
    accent: "#10B981",
    limited: false,
    edition: null,
    quantity: 1,
    pdpSubtitle: "LUC-05 • Automatic Collection",
    tagline: "Engineered for Everyday Adventure",
    detail1: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
    description: [
      { text: "The ", bold: "Aurora Mint", suffix: " embodies the spirit of exploration and optimism, combining contemporary design with dependable Swiss-inspired craftsmanship." },
      { text: "Built with a lightweight ", bold: "titanium case", suffix: " and powered by a precision ", bold2: "automatic movement", suffix2: ", it delivers exceptional reliability and smooth performance for every occasion.", bold3: "Designed for modern lifestyles", suffix3: ", Aurora Mint balances bold aesthetics with everyday practicality." },
      { text: "Distinctive, versatile, and unmistakably Valour—", bold: "Aurora Mint is made for those who move forward with confidence." }
    ],
    thumbnails: [
      { id: 1, img: "/images/watch-1.png" },
      { id: 2, img: "/images/watch-2.png" },
      { id: 3, img: "/images/watch-3.png" },
      { id: 4, img: "/images/watch-4.png" },
      { id: 5, img: "/images/watch-5.png" },
      { id: 6, img: "/images/watch-6.png" }
    ],
    editions: ["P-01", "P-02", "P-03", "P-04", "P-05"],
    specs: [
      { label: "Case Material", value: "Titanium" },
      { label: "Case Diameter", value: "40mm" },
      { label: "Case Thickness", value: "11.2mm" },
      { label: "Movement", value: "Automatic Mechanical" },
      { label: "Power Reserve", value: "72 Hours" },
      { label: "Water Resistance", value: "100m / 10 ATM" },
      { label: "Strap Material", value: "Premium Textile Strap" },
      { label: "Crystal", value: "Scratch-Resistant Sapphire" },
      { label: "Dial Finish", value: "Sunburst Mint" },
      { label: "Weight", value: "78g" },
      { label: "Warranty", value: "5 Years International" }
    ]
  },
  {
    id: 4,
    ref: "LUC-02",
    name: "Nova Red",
    slug: "nova-red",
    legacyName: "Nova Red",
    subtitle: "Lucent Collection",
    detail: "Lucent Collection",
    link: "/product-details",
    collection: "lucent",
    type: "watch",
    movement: "automatic",
    material: "titanium",
    color: "red",
    image: "/images/watch-4.png",
    mainImage: "/images/nova-red/1.jpeg",
    secbgImage: "/images/nova-red/2.jpeg",
    secbgImage3: "/images/nova-red/3.jpeg",
    futureHeading: "Nova Red",
    secTitle: "Nova Red",
    accent: "#EF4444",
    limited: false,
    edition: null,
    quantity: 1,
    pdpSubtitle: "LUC-02 • Automatic Collection",
    tagline: "Engineered for Everyday Adventure",
    detail1: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
    description: [
      { text: "The ", bold: "Nova Red", suffix: " embodies the spirit of exploration and optimism, combining contemporary design with dependable Swiss-inspired craftsmanship." },
      { text: "Built with a lightweight ", bold: "titanium case", suffix: " and powered by a precision ", bold2: "automatic movement", suffix2: ", it delivers exceptional reliability and smooth performance for every occasion.", bold3: "Designed for modern lifestyles", suffix3: ", Nova Red balances bold aesthetics with everyday practicality." },
      { text: "Distinctive, versatile, and unmistakably Valour—", bold: "Nova Red is made for those who move forward with confidence." }
    ],
    thumbnails: [
      { id: 1, img: "/images/watch-1.png" },
      { id: 2, img: "/images/watch-2.png" },
      { id: 3, img: "/images/watch-3.png" },
      { id: 4, img: "/images/watch-4.png" },
      { id: 5, img: "/images/watch-5.png" },
      { id: 6, img: "/images/watch-6.png" }
    ],
    editions: ["P-01", "P-02", "P-03", "P-04", "P-05"],
    specs: [
      { label: "Case Material", value: "Titanium" },
      { label: "Case Diameter", value: "40mm" },
      { label: "Case Thickness", value: "11.2mm" },
      { label: "Movement", value: "Automatic Mechanical" },
      { label: "Power Reserve", value: "72 Hours" },
      { label: "Water Resistance", value: "100m / 10 ATM" },
      { label: "Strap Material", value: "Premium Textile Strap" },
      { label: "Crystal", value: "Scratch-Resistant Sapphire" },
      { label: "Dial Finish", value: "Sunburst Red" },
      { label: "Weight", value: "78g" },
      { label: "Warranty", value: "5 Years International" }
    ]
  },
  {
    id: 5,
    ref: "LUC-03",
    name: "Frost Silver",
    slug: "frost-silver",
    legacyName: "Frost Silver",
    subtitle: "Lucent Collection",
    detail: "Lucent Collection",
    link: "/product-details",
    collection: "lucent",
    type: "watch",
    movement: "automatic",
    material: "titanium",
    color: "silver",
    image: "/images/watch-5.png",
    mainImage: "/images/frost-silver/1.jpeg",
    secbgImage: "/images/frost-silver/2.jpeg",
    secbgImage3: "/images/frost-silver/3.jpeg",
    futureHeading: "Frost Silver",
    secTitle: "Frost Silver",
    accent: "#D1D5DB",
    limited: false,
    edition: null,
    quantity: 1,
    pdpSubtitle: "LUC-03 • Automatic Collection",
    tagline: "Engineered for Everyday Adventure",
    detail1: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
    description: [
      { text: "The ", bold: "Frost Silver", suffix: " embodies the spirit of exploration and optimism, combining contemporary design with dependable Swiss-inspired craftsmanship." },
      { text: "Built with a lightweight ", bold: "titanium case", suffix: " and powered by a precision ", bold2: "automatic movement", suffix2: ", it delivers exceptional reliability and smooth performance for every occasion.", bold3: "Designed for modern lifestyles", suffix3: ", Frost Silver balances bold aesthetics with everyday practicality." },
      { text: "Distinctive, versatile, and unmistakably Valour—", bold: "Frost Silver is made for those who move forward with confidence." }
    ],
    thumbnails: [
      { id: 1, img: "/images/watch-1.png" },
      { id: 2, img: "/images/watch-2.png" },
      { id: 3, img: "/images/watch-3.png" },
      { id: 4, img: "/images/watch-4.png" },
      { id: 5, img: "/images/watch-5.png" },
      { id: 6, img: "/images/watch-6.png" }
    ],
    editions: ["P-01", "P-02", "P-03", "P-04", "P-05"],
    specs: [
      { label: "Case Material", value: "Titanium" },
      { label: "Case Diameter", value: "40mm" },
      { label: "Case Thickness", value: "11.2mm" },
      { label: "Movement", value: "Automatic Mechanical" },
      { label: "Power Reserve", value: "72 Hours" },
      { label: "Water Resistance", value: "100m / 10 ATM" },
      { label: "Strap Material", value: "Premium Textile Strap" },
      { label: "Crystal", value: "Scratch-Resistant Sapphire" },
      { label: "Dial Finish", value: "Sunburst Silver" },
      { label: "Weight", value: "78g" },
      { label: "Warranty", value: "5 Years International" }
    ]
  },
  {
    id: 6,
    ref: "LUC-04",
    name: "Eclipse Black",
    slug: "eclipse-black",
    legacyName: "Eclipse Black",
    subtitle: "Lucent Collection",
    detail: "Lucent Collection",
    link: "/product-details",
    collection: "lucent",
    type: "watch",
    movement: "automatic",
    material: "titanium",
    color: "black",
    image: "/images/watch-6.png",
    mainImage: "/images/eclipse-black/1.jpeg",
    secbgImage: "/images/eclipse-black/2.jpeg",
    secbgImage3: "/images/eclipse-black/3.jpeg",
    futureHeading: "Eclipse Black",
    secTitle: "Eclipse Black",
    accent: "#111827",
    limited: false,
    edition: null,
    quantity: 1,
    pdpSubtitle: "LUC-04 • Automatic Collection",
    tagline: "Engineered for Everyday Adventure",
    detail1: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
    description: [
      { text: "The ", bold: "Eclipse Black", suffix: " embodies the spirit of exploration and optimism, combining contemporary design with dependable Swiss-inspired craftsmanship." },
      { text: "Built with a lightweight ", bold: "titanium case", suffix: " and powered by a precision ", bold2: "automatic movement", suffix2: ", it delivers exceptional reliability and smooth performance for every occasion.", bold3: "Designed for modern lifestyles", suffix3: ", Eclipse Black balances bold aesthetics with everyday practicality." },
      { text: "Distinctive, versatile, and unmistakably Valour—", bold: "Eclipse Black is made for those who move forward with confidence." }
    ],
    thumbnails: [
      { id: 1, img: "/images/watch-1.png" },
      { id: 2, img: "/images/watch-2.png" },
      { id: 3, img: "/images/watch-3.png" },
      { id: 4, img: "/images/watch-4.png" },
      { id: 5, img: "/images/watch-5.png" },
      { id: 6, img: "/images/watch-6.png" }
    ],
    editions: ["P-01", "P-02", "P-03", "P-04", "P-05"],
    specs: [
      { label: "Case Material", value: "Titanium" },
      { label: "Case Diameter", value: "40mm" },
      { label: "Case Thickness", value: "11.2mm" },
      { label: "Movement", value: "Automatic Mechanical" },
      { label: "Power Reserve", value: "72 Hours" },
      { label: "Water Resistance", value: "100m / 10 ATM" },
      { label: "Strap Material", value: "Premium Textile Strap" },
      { label: "Crystal", value: "Scratch-Resistant Sapphire" },
      { label: "Dial Finish", value: "Sunburst Black" },
      { label: "Weight", value: "78g" },
      { label: "Warranty", value: "5 Years International" }
    ]
  }
];

// Customizer options. Ids are stable (stored in carts); names and images match
// what the Customizer preview shows. Paint order bottom-to-top: strap, case, dial.
export const customizerOptions = {
  case: [
    { id: "black", name: "Black", image: "/images/customizer/case/case-black.png" },
    { id: "gold", name: "Gold", image: "/images/customizer/case/case-dold.png" },
    { id: "silver", name: "Silver", image: "/images/customizer/case/case-silver.png" }
  ],
  dial: [
    { id: "black", name: "Black", image: "/images/customizer/dial/dial-black.png" },
    { id: "light-blue", name: "Light Blue", image: "/images/customizer/dial/diallightblue.png" },
    { id: "mint", name: "Mint", image: "/images/customizer/dial/dial-mint.png" },
    { id: "navy-blue", name: "Navy Blue", image: "/images/customizer/dial/dial-navy-blue.png" },
    { id: "orange", name: "Orange", image: "/images/customizer/dial/dial-orange.png" },
    { id: "purple", name: "Purple", image: "/images/customizer/dial/dial-purple.png" },
    { id: "red", name: "Red", image: "/images/customizer/dial/dial-red.png" },
    { id: "silver", name: "Silver", image: "/images/customizer/dial/dial-silver.png" },
    { id: "teal", name: "Teal", image: "/images/customizer/dial/dial-teal.png" },
    { id: "yellow", name: "Yellow", image: "/images/customizer/dial/dial-yellow.png" }
  ],
  strap: [
    { id: "black-black", name: "Black", image: "/images/customizer/straps/strap_black_black.png" },
    { id: "black-grey", name: "Black Grey", image: "/images/customizer/straps/strap_black_grey.png" },
    { id: "black-silver", name: "Black Silver", image: "/images/customizer/straps/strap_black_silver.png" },
    { id: "grey-black", name: "Grey Black", image: "/images/customizer/straps/strap_grey_black.png" },
    { id: "grey-blue", name: "Grey Blue", image: "/images/customizer/straps/strap_grey_blue.png" },
    { id: "grey-grey", name: "Grey", image: "/images/customizer/straps/strap_grey_grey.png" },
    { id: "grey-light-blue", name: "Light Blue", image: "/images/customizer/straps/strap_grey_light_blue.png" },
    { id: "grey-orange", name: "Grey Orange", image: "/images/customizer/straps/strap_grey_orange.png" },
    { id: "grey-purple", name: "Grey Purple", image: "/images/customizer/straps/strap_grey_purple.png" },
    { id: "grey-red", name: "Grey Red", image: "/images/customizer/straps/strap_grey_red.png" },
    { id: "grey-silver", name: "Grey Silver", image: "/images/customizer/straps/strap_grey_silver.png" },
    { id: "grey-teal", name: "Grey Teal", image: "/images/customizer/straps/strap_grey_Teal.png" },
    { id: "grey-yellow", name: "Grey Yellow", image: "/images/customizer/straps/strap_grey_yellow.png" }
  ]
};

// Matches the images the Customizer shows on load.
export const DEFAULT_CUSTOM_OPTIONS = { caseId: "black", dialId: "black", strapId: "black-black" };

export const customWatch = { id: "custom-watch", name: "Custom Watch" };

// Copy shared by every strap, as supplied by Valour.
export const STRAP_DESCRIPTION =
  "This hybrid sailcloth/FKM rubber strap is an original design that combines durability and comfort. Each comes equipped with a curved lug end to seamlessly integrate with Valour’s watch cases. The loopless design ensures a clean and streamlined look, emphasizing the light and sporty look of the collections. Each pair of straps also comes equipped with quick-release spring bars, making strap changes quick and convenient.";

export const STRAP_SPECS = [
  { label: "Strap Length", value: "100 MM (point side), 100 MM (buckle/clasp side)" },
  { label: "Strap Width", value: "20 MM / 18 MM" },
  { label: "Strap Material", value: "Hybrid Sailcloth / FKM Rubber Strap" },
  { label: "Deployant", value: "Loopless-Style Twin Trigger Clasp" },
  { label: "Lug Attachment", value: "Quick-release Springbars" }
];

// Straps sold on their own. Ids and slugs are stable (stored in carts, used in
// URLs); array order is catalog order, which Related Straps follows. One photo each.
const strapData = [
  { id: 1, type: "strap", ref: "P-1", slug: "black", color: "black", name: "Black Strap", image: "/images/strap-1.png" },
  { id: 2, type: "strap", ref: "P-2", slug: "blue", color: "blue", name: "Blue Strap", image: "/images/strap-2.png" },
  { id: 3, type: "strap", ref: "P-3", slug: "yellow", color: "yellow", name: "Yellow Strap", image: "/images/strap-3.png" },
  { id: 4, type: "strap", ref: "P-4", slug: "silver", color: "silver", name: "Silver Strap", image: "/images/strap-4.png" },
  { id: 5, type: "strap", ref: "P-5", slug: "red", color: "red", name: "Red Strap", image: "/images/strap-5.png" },
  { id: 6, type: "strap", ref: "P-6", slug: "grey", color: "grey", name: "Grey Strap", image: "/images/strap-6.png" }
];

export const PRODUCT_TYPES = ["watch", "strap"];

// Throws on anything that would make a product ambiguous: an unknown type, a
// missing slug, or a key or slug used twice (one product must never silently
// replace another in lookups or routes). Returns the list unchanged.
export const assertValidProducts = (list) => {
  const keys = new Set();
  const slugs = new Set();
  for (const product of list) {
    if (!PRODUCT_TYPES.includes(product.type)) throw new Error(`Unknown product type "${product.type}" for ${product.key}`);
    if (typeof product.slug !== "string" || !product.slug) throw new Error(`Missing slug for ${product.key}`);
    if (keys.has(product.key)) throw new Error(`Duplicate product key "${product.key}"`);
    if (slugs.has(product.slug)) throw new Error(`Duplicate product slug "${product.slug}"`);
    keys.add(product.key);
    slugs.add(product.slug);
  }
  return list;
};

// The unified collection, watches then straps. `productId` (= `id`) is the
// existing per-type id saved in carts; `key` ("watch:1", "strap:1") is unique
// across all products and matches the cart's line id for an item without options.
export const products = assertValidProducts(
  [...watchData, ...strapData].map((item) => ({
    ...item,
    productId: item.id,
    key: `${item.type}:${item.id}`,
    images: [item.image],
  }))
);

export const getProductsByType = (type) => products.filter((product) => product.type === type);

export const getProductBySlug = (slug) =>
  typeof slug === "string" ? products.find((product) => product.slug === slug) : undefined;

// The next `count` products of the same type after this one, in catalog order,
// wrapping around; never the product itself.
export const getRelatedProducts = (product, count = 4) => {
  const sameType = product ? getProductsByType(product.type) : [];
  const index = sameType.findIndex((item) => item.key === product.key);
  if (index === -1) return [];
  return [...sameType.slice(index + 1), ...sameType.slice(0, index)].slice(0, count);
};

// Existing per-type views, kept for current consumers (product state, shop
// grid, cart lookups, strap pages).
export const watches = getProductsByType("watch");
export const straps = getProductsByType("strap");

export const getStrapBySlug = (slug) => {
  const product = getProductBySlug(slug);
  return product?.type === "strap" ? product : undefined;
};

export const getRelatedStraps = (strapId, count = 4) =>
  getRelatedProducts(straps.find((strap) => strap.id === strapId), count);

const CATALOG = {
  watch: watches,
  custom: [customWatch],
  strap: straps,
};

// Option key -> its list and display label, in display order (Case, Dial, Strap).
const CUSTOM_OPTION_FIELDS = [
  { key: "caseId", list: "case", label: "Case" },
  { key: "dialId", list: "dial", label: "Dial" },
  { key: "strapId", list: "strap", label: "Strap" }
];

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Resolves each custom option to its entry, or null if any is missing/unknown.
const resolveCustomOptions = (options) => {
  if (!isPlainObject(options)) return null;
  const resolved = [];
  for (const field of CUSTOM_OPTION_FIELDS) {
    const id = Object.hasOwn(options, field.key) ? options[field.key] : undefined;
    const option = customizerOptions[field.list].find((item) => item.id === id);
    if (!option) return null;
    resolved.push({ label: field.label, option });
  }
  return resolved;
};

// Watches and straps take no options; a custom watch needs exactly caseId, dialId and
// strapId, each a known id (every combination is allowed). Never throws.
export const validateOptions = (kind, productId, options) => {
  if (!isPlainObject(options)) return false;
  const keyCount = Object.keys(options).length;
  if (kind === "watch" || kind === "strap") return keyCount === 0;
  if (kind === "custom") return keyCount === CUSTOM_OPTION_FIELDS.length && resolveCustomOptions(options) !== null;
  return false;
};

// [{ label, value }] in Case, Dial, Strap order; [] for watches or unknown ids.
export const describeOptions = (kind, options) => {
  const resolved = kind === "custom" ? resolveCustomOptions(options) : null;
  return resolved ? resolved.map(({ label, option }) => ({ label, value: option.name })) : [];
};

// Preview images bottom-to-top (strap, case, dial), stacked like the Customizer
// preview; null for watches or unknown ids.
export const getLineLayers = (kind, options) => {
  const resolved = kind === "custom" ? resolveCustomOptions(options) : null;
  if (!resolved) return null;
  const [caseOption, dialOption, strapOption] = resolved.map(({ option }) => option);
  return [strapOption.image, caseOption.image, dialOption.image];
};

// Confirmed unit prices in USD, keyed by kind then product id. Empty until the
// business confirms pricing — add e.g. `watch: { 1: 1234 }` here and nowhere else.
export const CONFIRMED_PRICES = {
  watch: {},
  custom: {},
  // Confirmed by Valour: every strap is $45.00.
  strap: Object.fromEntries(straps.map((strap) => [strap.id, 45])),
};

export const getCatalogItem = (kind, productId) =>
  Object.hasOwn(CATALOG, kind) ? CATALOG[kind].find((item) => item.id === productId) : undefined;

// Returns the confirmed unit price, or null when the item is "Price on request".
export const getUnitPrice = (kind, productId) => {
  const price = Object.hasOwn(CONFIRMED_PRICES, kind) ? CONFIRMED_PRICES[kind][productId] : undefined;
  return Number.isFinite(price) ? price : null;
};

// A product's confirmed price (or null), read from CONFIRMED_PRICES like the cart does.
export const getProductPrice = (product) => (product ? getUnitPrice(product.type, product.productId) : null);
