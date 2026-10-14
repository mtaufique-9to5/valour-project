// Single source of truth for everything that can go in the cart.
//
// PRICING IS UNRESOLVED. Each watch carries two conflicting legacy fields —
// `price: 499` (what the cart/checkout mockups were built around) and
// `pdpPrice: 3200` (never read anywhere). Neither is confirmed, so neither is
// used for pricing: getUnitPrice() only returns values from CONFIRMED_PRICES,
// and anything without a confirmed price is shown as "Price on request".
// Customizer options (case / dial / strap) and the "Custom Watch" they build
// live here too, also unpriced until confirmed. Straps are not sold separately yet.

export const watches = [
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
    range: "automatic",
    type: "automatic",
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
    price: 499,
    edition: null,
    quantity: 1,
    pdpSubtitle: "LUC-01 • Automatic Collection",
    tagline: "Engineered for Everyday Adventure",
    detail1: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
    pdpPrice: 3200,
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
    range: "automatic",
    type: "automatic",
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
    price: 499,
    edition: null,
    quantity: 1,
    pdpSubtitle: "LUC-06 • Automatic Collection",
    tagline: "Engineered for Everyday Adventure",
    detail1: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
    pdpPrice: 3200,
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
    range: "automatic",
    type: "automatic",
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
    price: 499,
    edition: null,
    quantity: 1,
    pdpSubtitle: "LUC-05 • Automatic Collection",
    tagline: "Engineered for Everyday Adventure",
    detail1: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
    pdpPrice: 3200,
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
    range: "automatic",
    type: "automatic",
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
    price: 499,
    edition: null,
    quantity: 1,
    pdpSubtitle: "LUC-02 • Automatic Collection",
    tagline: "Engineered for Everyday Adventure",
    detail1: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
    pdpPrice: 3200,
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
    range: "automatic",
    type: "automatic",
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
    price: 499,
    edition: null,
    quantity: 1,
    pdpSubtitle: "LUC-03 • Automatic Collection",
    tagline: "Engineered for Everyday Adventure",
    detail1: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
    pdpPrice: 3200,
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
    range: "automatic",
    type: "automatic",
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
    price: 499,
    edition: null,
    quantity: 1,
    pdpSubtitle: "LUC-04 • Automatic Collection",
    tagline: "Engineered for Everyday Adventure",
    detail1: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
    pdpPrice: 3200,
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

const CATALOG = {
  watch: watches,
  custom: [customWatch],
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

// Watches take no options; a custom watch needs exactly caseId, dialId and
// strapId, each a known id (every combination is allowed). Never throws.
export const validateOptions = (kind, productId, options) => {
  if (!isPlainObject(options)) return false;
  const keyCount = Object.keys(options).length;
  if (kind === "watch") return keyCount === 0;
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
};

export const getCatalogItem = (kind, productId) =>
  Object.hasOwn(CATALOG, kind) ? CATALOG[kind].find((item) => item.id === productId) : undefined;

// Returns the confirmed unit price, or null when the item is "Price on request".
export const getUnitPrice = (kind, productId) => {
  const price = Object.hasOwn(CONFIRMED_PRICES, kind) ? CONFIRMED_PRICES[kind][productId] : undefined;
  return Number.isFinite(price) ? price : null;
};
