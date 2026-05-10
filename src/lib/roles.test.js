import { describe, it, expect } from 'vitest'
import { can, getUserRole, isAdmin, isAdminOrCoordinator } from './roles'

function makeUser(role) {
  return { user_metadata: { role } }
}

describe('getUserRole', () => {
  it('returns role from user_metadata', () => {
    expect(getUserRole(makeUser('admin'))).toBe('admin')
    expect(getUserRole(makeUser('doctor'))).toBe('doctor')
  })

  it('defaults to data_entry when user is null', () => {
    expect(getUserRole(null)).toBe('data_entry')
  })

  it('defaults to data_entry when user_metadata has no role', () => {
    expect(getUserRole({})).toBe('data_entry')
  })
})

describe('can', () => {
  it('admin can do everything', () => {
    const user = makeUser('admin')
    expect(can(user, 'manage_users')).toBe(true)
    expect(can(user, 'doctor_notes')).toBe(true)
    expect(can(user, 'lab_results')).toBe(true)
    expect(can(user, 'referrals')).toBe(true)
    expect(can(user, 'export')).toBe(true)
  })

  it('doctor can write notes and referrals but not manage users', () => {
    const user = makeUser('doctor')
    expect(can(user, 'doctor_notes')).toBe(true)
    expect(can(user, 'referrals')).toBe(true)
    expect(can(user, 'manage_users')).toBe(false)
    expect(can(user, 'export')).toBe(false)
  })

  it('lab can only access lab_results and view_all', () => {
    const user = makeUser('lab')
    expect(can(user, 'lab_results')).toBe(true)
    expect(can(user, 'view_all')).toBe(true)
    expect(can(user, 'doctor_notes')).toBe(false)
    expect(can(user, 'referrals')).toBe(false)
  })

  it('data_entry can only view_all', () => {
    const user = makeUser('data_entry')
    expect(can(user, 'view_all')).toBe(true)
    expect(can(user, 'doctor_notes')).toBe(false)
    expect(can(user, 'lab_results')).toBe(false)
    expect(can(user, 'manage_users')).toBe(false)
  })

  it('coordinator can export and make referrals but not doctor_notes', () => {
    const user = makeUser('coordinator')
    expect(can(user, 'referrals')).toBe(true)
    expect(can(user, 'export')).toBe(true)
    expect(can(user, 'doctor_notes')).toBe(false)
    expect(can(user, 'manage_users')).toBe(false)
  })

  it('null user falls back to data_entry permissions', () => {
    expect(can(null, 'view_all')).toBe(true)
    expect(can(null, 'manage_users')).toBe(false)
  })

  it('unknown role falls back to data_entry permissions', () => {
    const user = makeUser('ghost')
    expect(can(user, 'view_all')).toBe(true)
    expect(can(user, 'doctor_notes')).toBe(false)
  })
})

describe('isAdmin', () => {
  it('returns true for admin only', () => {
    expect(isAdmin(makeUser('admin'))).toBe(true)
    expect(isAdmin(makeUser('coordinator'))).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
})

describe('isAdminOrCoordinator', () => {
  it('returns true for admin and coordinator', () => {
    expect(isAdminOrCoordinator(makeUser('admin'))).toBe(true)
    expect(isAdminOrCoordinator(makeUser('coordinator'))).toBe(true)
    expect(isAdminOrCoordinator(makeUser('doctor'))).toBe(false)
    expect(isAdminOrCoordinator(null)).toBe(false)
  })
})
