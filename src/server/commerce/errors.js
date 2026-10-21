// Business-rule failure with a stable machine-readable code. Messages are safe
// to show to an admin; storefront callers map codes to their own wording.
export class CommerceError extends Error {
  constructor(code, message = code, details = undefined) {
    super(message)
    this.name = 'CommerceError'
    this.code = code
    if (details !== undefined) this.details = details
  }
}

export const isCommerceError = (e, code) => e instanceof CommerceError && (code === undefined || e.code === code)
