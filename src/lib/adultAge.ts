export function isAdultBirthDate(value: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false
  const cutoffYear = today.getFullYear() - 18
  const cutoff = new Date(Date.UTC(cutoffYear, today.getMonth(), today.getDate()))
  return date <= cutoff
}
