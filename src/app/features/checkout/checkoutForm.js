// Checkout form values and field checks. No React here, so the rules can be
// unit tested. Nothing in this module stores or sends customer data.

export const UNITED_STATES = 'United States'
export const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'UAE', 'Switzerland']
// The existing list only contains US states, so a state is required for the US only.
export const US_STATES = ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Nevada']

const MAX_LENGTH = 100
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emptyAddress = () => ({
  country: UNITED_STATES,
  firstName: '',
  lastName: '',
  address: '',
  apartment: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
})

// Delivery and billing are separate objects so one can never overwrite the other.
export const createInitialCheckout = () => ({
  email: '',
  emailOffers: false, // marketing consent must be opted into
  delivery: emptyAddress(),
  billing: emptyAddress(),
  useShippingAsBilling: true,
})

// Returns a new form with one field changed. section: 'contact' | 'delivery' | 'billing'
export const updateField = (form, section, name, value) =>
  section === 'contact'
    ? { ...form, [name]: value }
    : { ...form, [section]: { ...form[section], [name]: value } }

const REQUIRED_MESSAGES = {
  firstName: 'Enter a first name',
  lastName: 'Enter a last name',
  address: 'Enter an address',
  city: 'Enter a city',
  zip: 'Enter a ZIP / postal code',
}

const OPTIONAL_FIELDS = ['apartment', 'phone']

const text = (value) => (typeof value === 'string' ? value.trim() : '')

const addAddressErrors = (errors, section, values) => {
  const key = (field) => `${section}.${field}`

  if (!COUNTRIES.includes(values.country)) errors[key('country')] = 'Select a country'

  for (const [field, message] of Object.entries(REQUIRED_MESSAGES)) {
    const value = text(values[field])
    if (!value) errors[key(field)] = message
    else if (value.length > MAX_LENGTH) errors[key(field)] = `Use ${MAX_LENGTH} characters or fewer`
  }

  for (const field of OPTIONAL_FIELDS) {
    if (text(values[field]).length > MAX_LENGTH) errors[key(field)] = `Use ${MAX_LENGTH} characters or fewer`
  }

  if (values.country === UNITED_STATES && !US_STATES.includes(values.state)) {
    errors[key('state')] = 'Select a state'
  }
}

// Returns { 'contact.email': message, 'delivery.city': message, ... } — empty when valid.
// Billing is only checked when it isn't the same as the delivery address.
export const validateCheckout = (form) => {
  const errors = {}

  const email = text(form.email)
  if (!email) errors['contact.email'] = 'Enter an email address'
  else if (email.length > MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    errors['contact.email'] = 'Enter a valid email address, like name@example.com'
  }

  addAddressErrors(errors, 'delivery', form.delivery)
  if (!form.useShippingAsBilling) addAddressErrors(errors, 'billing', form.billing)

  return errors
}
