'use client'

import { forwardRef } from 'react'
import { LoaderCircle } from 'lucide-react'

// variant: primary | secondary | ghost | danger; size: sm | md | lg.
// `icon` renders before the label; `iconOnly` buttons need an aria-label.
const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconOnly = false, loading = false, block = false, className = '', type = 'button', disabled, children, ...rest },
  ref
) {
  const classes = [
    'va-btn',
    `va-btn-${variant}`,
    size !== 'md' && `va-btn-${size}`,
    iconOnly && 'va-btn-icon',
    block && 'va-btn-block',
    className,
  ].filter(Boolean).join(' ')
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <LoaderCircle size={16} className="va-spin" aria-hidden="true" /> : Icon && <Icon size={16} aria-hidden="true" />}
      {!iconOnly && children}
    </button>
  )
})

export default Button
