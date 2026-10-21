'use client'

import { cloneElement, forwardRef, isValidElement, useId } from 'react'
import { Switch } from '@headlessui/react'

// Wraps one control with a label, hint and error, wiring id/aria-* onto it.
// When the control is nested (e.g. inside a wrapper div), pass cloneControl={false}
// plus `id` and set that id on the control yourself.
export function FormField({ label, hint, error, required = false, className = '', children, id: idProp, cloneControl = true }) {
  const autoId = useId()
  const id = idProp ?? `va-${autoId}`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const control = cloneControl && isValidElement(children)
    ? cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required: required || undefined })
    : children
  return (
    <div className={`va-field ${className}`}>
      <label className="va-label" htmlFor={id}>
        {label}
        {required && <span className="va-required" aria-hidden="true">*</span>}
      </label>
      {control}
      {hint && <span id={hintId} className="va-hint">{hint}</span>}
      {error && <span id={errorId} className="va-error-text">{error}</span>}
    </div>
  )
}

export const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`va-input ${className}`} {...props} />
})

// options = [{ value, label }] or plain strings.
export const Select = forwardRef(function Select({ options = [], className = '', children, ...props }, ref) {
  return (
    <select ref={ref} className={`va-select ${className}`} {...props}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o
        return <option key={opt.value} value={opt.value}>{opt.label}</option>
      })}
      {children}
    </select>
  )
})

export const Textarea = forwardRef(function Textarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`va-textarea ${className}`} {...props} />
})

// Accessible switch with a visible label and optional description.
export function Toggle({ label, description, checked, onChange, disabled = false }) {
  const id = useId()
  return (
    <div className="va-toggle-row">
      <div>
        <div className="va-label" id={`${id}-l`}>{label}</div>
        {description && <div className="va-hint" id={`${id}-d`}>{description}</div>}
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="va-toggle"
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
      />
    </div>
  )
}

export default FormField
