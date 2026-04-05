/**
 * Input Validation Utilities
 * Sanitizes and validates form inputs to prevent XSS and SQL injection
 */

// HTML entities to escape
const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (!str) return ''
  return String(str).replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char)
}

/**
 * Sanitize a string by removing potentially dangerous characters
 * while preserving basic formatting
 */
export function sanitizeString(str: string, maxLength: number = 10000): string {
  if (!str) return ''
  
  // Trim and limit length
  let sanitized = String(str).trim().slice(0, maxLength)
  
  // Remove null bytes and other control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  // Remove potential script tags (case insensitive)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')
  
  // Remove data: protocol for non-image types
  sanitized = sanitized.replace(/data:(?!image\/)/gi, '')
  
  // Remove on* event handlers
  sanitized = sanitized.replace(/\bon\w+\s*=/gi, '')
  
  return sanitized
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'Email is required' }
  }
  
  const sanitized = sanitizeString(email, 254)
  
  // Basic email regex - more permissive than strict RFC 5322
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: 'Please enter a valid email address' }
  }
  
  // Check for dangerous patterns in email
  if (/<|>|javascript:|data:/i.test(sanitized)) {
    return { valid: false, error: 'Invalid characters in email' }
  }
  
  return { valid: true }
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): { valid: boolean; sanitized: string; error?: string } {
  if (!phone) {
    return { valid: true, sanitized: '' } // Phone is optional
  }
  
  // Remove all non-numeric characters except + at the start
  let sanitized = phone.replace(/[^\d+]/g, '')
  
  // Ensure + is only at the start
  if (sanitized.includes('+')) {
    sanitized = '+' + sanitized.replace(/\+/g, '')
  }
  
  // Check minimum length (with country code)
  if (sanitized.length < 7) {
    return { valid: false, sanitized, error: 'Phone number too short' }
  }
  
  // Check maximum length
  if (sanitized.length > 20) {
    return { valid: false, sanitized, error: 'Phone number too long' }
  }
  
  return { valid: true, sanitized }
}

/**
 * Validate name (first name, last name, full name)
 */
export function validateName(name: string, fieldName: string = 'Name'): { valid: boolean; sanitized: string; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, sanitized: '', error: `${fieldName} is required` }
  }
  
  const sanitized = sanitizeString(name, 100)
  
  // Check minimum length
  if (sanitized.length < 2) {
    return { valid: false, sanitized, error: `${fieldName} must be at least 2 characters` }
  }
  
  // Check for numbers (names shouldn't have numbers)
  if (/\d/.test(sanitized)) {
    return { valid: false, sanitized, error: `${fieldName} should not contain numbers` }
  }
  
  // Check for dangerous patterns
  if (/<|>|javascript:|on\w+=/i.test(sanitized)) {
    return { valid: false, sanitized, error: `Invalid characters in ${fieldName}` }
  }
  
  return { valid: true, sanitized }
}

/**
 * Validate text message/description
 */
export function validateMessage(message: string, minLength: number = 0, maxLength: number = 5000): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeString(message, maxLength)
  
  if (minLength > 0 && sanitized.length < minLength) {
    return { valid: false, sanitized, error: `Message must be at least ${minLength} characters` }
  }
  
  return { valid: true, sanitized }
}

/**
 * Validate subject line
 */
export function validateSubject(subject: string): { valid: boolean; sanitized: string; error?: string } {
  if (!subject || !subject.trim()) {
    return { valid: false, sanitized: '', error: 'Subject is required' }
  }
  
  const sanitized = sanitizeString(subject, 200)
  
  if (sanitized.length < 3) {
    return { valid: false, sanitized, error: 'Subject must be at least 3 characters' }
  }
  
  return { valid: true, sanitized }
}

/**
 * Validate number within range
 */
export function validateNumber(value: number | string, min: number = 0, max: number = Infinity, fieldName: string = 'Value'): { valid: boolean; value: number; error?: string } {
  const num = typeof value === 'string' ? parseInt(value, 10) : value
  
  if (isNaN(num)) {
    return { valid: false, value: min, error: `${fieldName} must be a number` }
  }
  
  if (num < min) {
    return { valid: false, value: min, error: `${fieldName} must be at least ${min}` }
  }
  
  if (num > max) {
    return { valid: false, value: max, error: `${fieldName} must be at most ${max}` }
  }
  
  return { valid: true, value: num }
}

/**
 * Validate date
 */
export function validateDate(dateStr: string, fieldName: string = 'Date'): { valid: boolean; date: Date | null; error?: string } {
  if (!dateStr) {
    return { valid: true, date: null } // Date is optional
  }
  
  const date = new Date(dateStr)
  
  if (isNaN(date.getTime())) {
    return { valid: false, date: null, error: `Invalid ${fieldName}` }
  }
  
  return { valid: true, date }
}

/**
 * Comprehensive form validation for contact inquiry
 */
export function validateContactInquiry(data: {
  name: string
  email: string
  subject: string
  message: string
  category: string
}): { valid: boolean; sanitized: typeof data; errors: string[] } {
  const errors: string[] = []
  
  const nameResult = validateName(data.name, 'Full Name')
  if (!nameResult.valid) errors.push(nameResult.error!)
  
  const emailResult = validateEmail(data.email)
  if (!emailResult.valid) errors.push(emailResult.error!)
  
  const subjectResult = validateSubject(data.subject)
  if (!subjectResult.valid) errors.push(subjectResult.error!)
  
  const messageResult = validateMessage(data.message, 10, 5000)
  if (!messageResult.valid) errors.push(messageResult.error!)
  
  const validCategories = ['general', 'booking', 'technical', 'partnership', 'complaint', 'other']
  if (!validCategories.includes(data.category)) {
    errors.push('Invalid category')
  }
  
  return {
    valid: errors.length === 0,
    sanitized: {
      name: nameResult.sanitized,
      email: sanitizeString(data.email, 254),
      subject: subjectResult.sanitized,
      message: messageResult.sanitized,
      category: data.category
    },
    errors
  }
}

/**
 * Comprehensive form validation for service inquiry
 */
export function validateServiceInquiry(data: {
  name: string
  email: string
  phone?: string
  preferredDate?: string
  numberOfGuests: number
  message?: string
  contactMethod: string
}): { valid: boolean; sanitized: typeof data; errors: string[] } {
  const errors: string[] = []
  
  const nameResult = validateName(data.name, 'Full Name')
  if (!nameResult.valid) errors.push(nameResult.error!)
  
  const emailResult = validateEmail(data.email)
  if (!emailResult.valid) errors.push(emailResult.error!)
  
  const phoneResult = validatePhone(data.phone || '')
  if (!phoneResult.valid) errors.push(phoneResult.error!)
  
  const guestsResult = validateNumber(data.numberOfGuests, 1, 1000, 'Number of guests')
  if (!guestsResult.valid) errors.push(guestsResult.error!)
  
  const messageResult = validateMessage(data.message || '', 0, 5000)
  if (!messageResult.valid) errors.push(messageResult.error!)
  
  const validContactMethods = ['email', 'phone', 'whatsapp']
  if (!validContactMethods.includes(data.contactMethod)) {
    errors.push('Invalid contact method')
  }
  
  return {
    valid: errors.length === 0,
    sanitized: {
      name: nameResult.sanitized,
      email: sanitizeString(data.email, 254),
      phone: phoneResult.sanitized,
      preferredDate: data.preferredDate,
      numberOfGuests: guestsResult.value,
      message: messageResult.sanitized,
      contactMethod: data.contactMethod
    },
    errors
  }
}

/**
 * Comprehensive form validation for safari inquiry
 */
export function validateSafariInquiry(data: {
  fullName: string
  lastName: string
  email: string
  phone?: string
  countries: string[]
  activities: string[]
  travelWith: string
  days: number | string
  budget: number | string
  startDate?: string
  adults: number | string
  children: number | string
  rooms: number | string
  country?: string
  extraInfo?: string
}): { valid: boolean; sanitized: any; errors: string[] } {
  const errors: string[] = []
  
  const firstNameResult = validateName(data.fullName, 'First Name')
  if (!firstNameResult.valid) errors.push(firstNameResult.error!)
  
  const lastNameResult = validateName(data.lastName, 'Last Name')
  if (!lastNameResult.valid) errors.push(lastNameResult.error!)
  
  const emailResult = validateEmail(data.email)
  if (!emailResult.valid) errors.push(emailResult.error!)
  
  const phoneResult = validatePhone(data.phone || '')
  if (!phoneResult.valid) errors.push(phoneResult.error!)
  
  const daysResult = validateNumber(data.days, 1, 365, 'Days')
  if (!daysResult.valid) errors.push(daysResult.error!)
  
  const budgetResult = validateNumber(data.budget, 0, 1000000, 'Budget')
  if (!budgetResult.valid) errors.push(budgetResult.error!)
  
  const adultsResult = validateNumber(data.adults, 1, 100, 'Adults')
  if (!adultsResult.valid) errors.push(adultsResult.error!)
  
  const childrenResult = validateNumber(data.children, 0, 100, 'Children')
  if (!childrenResult.valid) errors.push(childrenResult.error!)
  
  const roomsResult = validateNumber(data.rooms, 1, 100, 'Rooms')
  if (!roomsResult.valid) errors.push(roomsResult.error!)
  
  const extraInfoResult = validateMessage(data.extraInfo || '', 0, 2000)
  
  return {
    valid: errors.length === 0,
    sanitized: {
      fullName: firstNameResult.sanitized,
      lastName: lastNameResult.sanitized,
      email: sanitizeString(data.email, 254),
      phone: phoneResult.sanitized,
      countries: data.countries.map(c => sanitizeString(c, 100)),
      activities: data.activities.map(a => sanitizeString(a, 100)),
      travelWith: sanitizeString(data.travelWith, 50),
      days: daysResult.value,
      budget: budgetResult.value,
      startDate: data.startDate,
      adults: adultsResult.value,
      children: childrenResult.value,
      rooms: roomsResult.value,
      country: sanitizeString(data.country || '', 100),
      extraInfo: extraInfoResult.sanitized
    },
    errors
  }
}
