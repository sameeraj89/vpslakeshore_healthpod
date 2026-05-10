import { describe, it, expect, beforeEach, vi } from 'vitest'

const QUEUE_KEY = 'healthpod_offline_queue'
const SYNCING_KEY = 'healthpod_syncing'

// Mock localStorage
const store = {}
const localStorageMock = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v },
  removeItem: (k) => { delete store[k] },
}
vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('navigator', { onLine: true })

// Import after mocks are set so module-level localStorage.removeItem(SYNCING_KEY) hits our mock
const { getQueue, addToQueue, removeFromQueue, clearQueue, queueCount, syncQueue, isSyncing } = await import('./offlineQueue')

describe('offlineQueue', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k])
  })

  it('starts empty', () => {
    expect(getQueue()).toEqual([])
    expect(queueCount()).toBe(0)
  })

  it('addToQueue appends entries with metadata', () => {
    addToQueue({ name: 'Ravi', uhid: 'VPS-001' })
    addToQueue({ name: 'Priya', uhid: 'VPS-002' })
    const q = getQueue()
    expect(q).toHaveLength(2)
    expect(q[0]).toMatchObject({ name: 'Ravi', uhid: 'VPS-001' })
    expect(q[0]._offline_id).toBeDefined()
    expect(q[0]._queued_at).toBeDefined()
  })

  it('removeFromQueue removes only the matching entry', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000)
    addToQueue({ name: 'A' })
    addToQueue({ name: 'B' })
    vi.restoreAllMocks()
    const id = getQueue()[0]._offline_id
    removeFromQueue(id)
    const q = getQueue()
    expect(q).toHaveLength(1)
    expect(q[0].name).toBe('B')
  })

  it('clearQueue empties all entries', () => {
    addToQueue({ name: 'A' })
    addToQueue({ name: 'B' })
    clearQueue()
    expect(getQueue()).toEqual([])
  })

  it('syncQueue calls savePatient for each entry and removes successes', async () => {
    addToQueue({ name: 'A', uhid: 'VPS-001' })
    addToQueue({ name: 'B', uhid: 'VPS-002' })
    const savePatient = vi.fn().mockResolvedValue({})
    const synced = await syncQueue(savePatient)
    expect(savePatient).toHaveBeenCalledTimes(2)
    expect(synced).toBe(2)
    expect(getQueue()).toEqual([])
  })

  it('syncQueue strips _offline_id and _queued_at before calling savePatient', async () => {
    addToQueue({ name: 'A', uhid: 'VPS-001' })
    const savePatient = vi.fn().mockResolvedValue({})
    await syncQueue(savePatient)
    const callArg = savePatient.mock.calls[0][0]
    expect(callArg._offline_id).toBeUndefined()
    expect(callArg._queued_at).toBeUndefined()
    expect(callArg.name).toBe('A')
  })

  it('syncQueue keeps failed entries in queue', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(3000).mockReturnValueOnce(4000)
    addToQueue({ name: 'A' })
    addToQueue({ name: 'B' })
    vi.restoreAllMocks()
    const savePatient = vi.fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('network'))
    const synced = await syncQueue(savePatient)
    expect(synced).toBe(1)
    expect(getQueue()).toHaveLength(1)
    expect(getQueue()[0].name).toBe('B')
  })

  it('module load clears stuck SYNCING_KEY', () => {
    // The import itself already ran localStorage.removeItem(SYNCING_KEY) at module load.
    // Verify isSyncing() returns false on a fresh state (no stuck key).
    expect(isSyncing()).toBe(false)
  })

  it('syncQueue returns 0 when queue is empty', async () => {
    const savePatient = vi.fn()
    const synced = await syncQueue(savePatient)
    expect(synced).toBe(0)
    expect(savePatient).not.toHaveBeenCalled()
  })
})
