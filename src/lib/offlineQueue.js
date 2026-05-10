/**
 * Offline sync queue — CHT-inspired field worker mode
 *
 * Stores patient registrations in localStorage when offline.
 * Auto-syncs to Supabase when connectivity is restored.
 */

const QUEUE_KEY = 'healthpod_offline_queue'
const SYNCING_KEY = 'healthpod_syncing'

// Clear any sync state left over from a previous crash
localStorage.removeItem(SYNCING_KEY)

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch { return [] }
}

export function addToQueue(patientData) {
  const queue = getQueue()
  const entry = { ...patientData, _offline_id: Date.now(), _queued_at: new Date().toISOString() }
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
    const { _offline_id, _queued_at, ...patientData } = entry
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
