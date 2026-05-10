import { format } from 'date-fns'

export function generateUHID() {
  const prefix = 'LH'
  const date = format(new Date(), 'yyMMdd')
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
  return `${prefix}${date}${rand}`
}

export function calculateAge(dob) {
  if (!dob) return null
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function getRiskLevel(score) {
  if (score < 40) return 'high'
  if (score < 60) return 'medium'
  return 'low'
}

export function getRiskLabel(score) {
  const level = getRiskLevel(score)
  if (level === 'high') return 'High Risk'
  if (level === 'medium') return 'Moderate Risk'
  return 'Low Risk'
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try { return format(new Date(dateStr), 'dd MMM yyyy') } catch { return dateStr }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  try { return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a') } catch { return dateStr }
}
