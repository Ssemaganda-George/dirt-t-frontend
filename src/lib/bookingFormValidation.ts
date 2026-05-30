/** Shared booking / checkout form validation helpers */

export type FieldErrors = Record<string, string>

export function isValidEmail(email: string): boolean {
  const t = email.trim()
  return t.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

export function isValidUgMobileMoneyPhone(raw: string): boolean {
  const t = raw.trim().replace(/^\+256/, '')
  const phone = t.startsWith('+') ? t : `+256${t.replace(/^0/, '')}`
  return phone.length >= 12 && /^\+256[73]/.test(phone)
}

export function fieldInputClass(hasError: boolean, base?: string): string {
  const b =
    base ??
    'w-full px-3 py-3 border rounded-lg text-base focus:outline-none transition-colors'
  return hasError
    ? `${b} border-red-500 bg-red-50/50 ring-1 ring-red-500 focus:ring-red-500`
    : `${b} border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent`
}

export function clearFieldError(errors: FieldErrors, key: string): FieldErrors {
  if (!errors[key]) return errors
  const next = { ...errors }
  delete next[key]
  return next
}

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function firstFieldErrorMessage(errors: FieldErrors): string | null {
  const keys = Object.keys(errors)
  return keys.length ? errors[keys[0]] : null
}

/** Apply errors; returns false if any */
export function applyFieldErrors(
  errors: FieldErrors,
  setErrors: (e: FieldErrors) => void,
  setBanner?: (msg: string | null) => void
): boolean {
  setErrors(errors)
  if (hasFieldErrors(errors)) {
    setBanner?.(firstFieldErrorMessage(errors) ?? 'Please fix the highlighted fields.')
    return false
  }
  setBanner?.(null)
  return true
}
