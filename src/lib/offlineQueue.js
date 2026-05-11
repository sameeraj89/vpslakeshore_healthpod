/**
 * Offline sync queue — CHT-inspired field worker mode
 *
 * Stores patient registrations in localStorage when offline.
 * Auto-syncs to Supabase when connectivity is restored.
 */

import { coerceUUIDs } from './utils'

const QUEUE_KEY = 'healthpod_offline_queue'
const SYNCING_KEY = 'healthpod_syncing'

// Canonical set of fields the patients table accepts.
// Any field not listed here is stripped from queued entries before sync,
// so stale queue records from older code versions are automatically sanitised.
const PATIENT_FIELDS = new Set([
  'name', 'dob', 'gender', 'phone', 'phone2',
  'address', 'district', 'occupation', 'education',
  'marital_status', 'insurance',
  'healthpod_id', 'campaign_id',
  'referred_by', 'tobacco_use', 'alcohol_use',
  'aadhaar_last4', 'abha_number', 'abha_address',
  'uhid', 'age', 'risk_score', 'risk_level',
  'consent_given', 'consent_timestamp',
])

function sanitise(record) {
  const out = Object.fromEntries(Object.entries(record).filter(([k]) => PATIENT_FIELDS.has(k)))
  return coerceUUIDs(out)
}

// Clear any sync state left over from a previous crash
localStorage.removeItem(SYNCING_KEY)

export function getQueue() {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    // Strip any entry that carries fields unknown to the current schema
    // (guards against stale records queued by older code versions)
    const clean = raw.map(({ _offline_id, _queued_at, ...rest }) => ({
      _offline_id, _queued_at, ...sanitise(rest),
    }))
    if (clean.length !== raw.length || JSON.stringify(clean) !== JSON.stringify(raw)) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(clean))
    }
    return clean
  } catch { return [] }
}

export function addToQueue(patientData) {
  const queue = getQueue()
  const entry = { ...sanitise(patientData), _offline_id: Date.now(), _queued_at: new Date().toISOString() }
  queue.push(entry)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return entry
}

export function removeFromQueue(offlineId) {
  const queue = getQueue().filter(e => e._offline_id !== offlineId)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

export function queueCount() {
  return getQueue().length
}

export function isOnline() {
  return navigator.onLine
}

export async function syncQueue(savePatient, showToast) {
  if (!isOnline()) return 0
  const queue = getQueue()
  if (!queue.length) return 0

  localStorage.setItem(SYNCING_KEY, '1')
  let synced = 0
  const errors = []

  for (const entry of queue) {
    const { _offline_id, _queued_at, ...raw } = entry
    const patientData = sanitise(raw)
    try {
      await savePatient(patientData)
      removeFromQueue(_offline_id)
      synced++
    } catch (err) {
      errors.push(err.message)
    }
  }

  localStorage.removeItem(SYNCING_KEY)

  if (synced > 0) showToast?.(`Synced ${synced} offline patient${synced > 1 ? 's' : ''} to server`)
  if (errors.length > 0) showToast?.(`${errors.length} records failed to sync`, 'error')
  return synced
}

export function isSyncing() {
  return !!localStorage.getItem(SYNCING_KEY)
}
