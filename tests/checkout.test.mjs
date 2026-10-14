// Checkout form rules (Phase A). Run with: node --test tests/checkout.test.mjs
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  COUNTRIES,
  UNITED_STATES,
  createInitialCheckout,
  updateField,
  validateCheckout,
} from '../src/app/features/checkout/checkoutForm.js'

const validAddress = {
  country: UNITED_STATES,
  firstName: 'Ada',
  lastName: 'Lovelace',
  address: '1 Main St',
  apartment: '',
  city: 'Austin',
  state: 'Texas',
  zip: '73301',
  phone: '',
}

const validForm = () => ({ ...createInitialCheckout(), email: 'ada@example.com', delivery: { ...validAddress } })

describe('initial values', () => {
  test('marketing consent is unchecked and billing defaults to the shipping address', () => {
    const form = createInitialCheckout()
    assert.equal(form.emailOffers, false)
    assert.equal(form.useShippingAsBilling, true)
    assert.notEqual(form.delivery, form.billing, 'separate objects')
  })
})

describe('required fields', () => {
  test('an empty form reports every required field and no optional one', () => {
    const errors = validateCheckout(createInitialCheckout())
    assert.deepEqual(Object.keys(errors).sort(), [
      'contact.email', 'delivery.address', 'delivery.city', 'delivery.firstName',
      'delivery.lastName', 'delivery.state', 'delivery.zip',
    ])
  })

  test('a complete form is valid; apartment and phone are optional', () => {
    assert.deepEqual(validateCheckout(validForm()), {})
  })

  test('whitespace-only input counts as empty', () => {
    const form = updateField(validForm(), 'delivery', 'city', '   ')
    assert.equal(validateCheckout(form)['delivery.city'], 'Enter a city')
  })

  test('over-long values are rejected, including optional fields', () => {
    const long = 'x'.repeat(101)
    const errors = validateCheckout(updateField(updateField(validForm(), 'delivery', 'address', long), 'delivery', 'phone', long))
    assert.ok(errors['delivery.address'])
    assert.ok(errors['delivery.phone'])
  })

  test('country must be one of the listed countries', () => {
    const errors = validateCheckout(updateField(validForm(), 'delivery', 'country', 'Atlantis'))
    assert.equal(errors['delivery.country'], 'Select a country')
  })
})

describe('email', () => {
  for (const bad of ['a@', '@x.com', 'a b@c.d', 'name@example', 'plain']) {
    test(`rejects "${bad}"`, () => {
      assert.ok(validateCheckout({ ...validForm(), email: bad })['contact.email'])
    })
  }
  test('accepts name@example.com (with surrounding spaces trimmed)', () => {
    assert.equal(validateCheckout({ ...validForm(), email: '  name@example.com ' })['contact.email'], undefined)
  })
})

describe('state', () => {
  test('required for the United States', () => {
    assert.equal(validateCheckout(updateField(validForm(), 'delivery', 'state', ''))['delivery.state'], 'Select a state')
  })
  test('optional for every other country', () => {
    for (const country of COUNTRIES.filter((c) => c !== UNITED_STATES)) {
      const form = updateField(updateField(validForm(), 'delivery', 'country', country), 'delivery', 'state', '')
      assert.equal(validateCheckout(form)['delivery.state'], undefined, country)
    }
  })
})

describe('billing', () => {
  test('not checked while "use shipping address as billing" is ticked', () => {
    assert.deepEqual(validateCheckout(validForm()), {})
  })

  test('checked with the same rules when unticked', () => {
    const errors = validateCheckout({ ...validForm(), useShippingAsBilling: false })
    assert.ok(errors['billing.firstName'])
    assert.ok(errors['billing.state'])
    const ok = validateCheckout({ ...validForm(), useShippingAsBilling: false, billing: { ...validAddress, firstName: 'Bill' } })
    assert.deepEqual(ok, {})
  })

  test('editing billing never changes delivery (the overwrite bug)', () => {
    let form = validForm()
    form = updateField(form, 'billing', 'firstName', 'Billing Name')
    form = updateField(form, 'billing', 'address', '9 Other Rd')
    assert.equal(form.delivery.firstName, 'Ada')
    assert.equal(form.delivery.address, '1 Main St')
    assert.equal(form.billing.firstName, 'Billing Name')
  })

  test('editing delivery never changes billing', () => {
    const form = updateField(validForm(), 'delivery', 'city', 'Dallas')
    assert.equal(form.billing.city, '')
  })

  test('updates return a new object and leave the previous one untouched', () => {
    const before = validForm()
    const after = updateField(before, 'contact', 'email', 'new@example.com')
    assert.equal(before.email, 'ada@example.com')
    assert.equal(after.email, 'new@example.com')
  })
})
