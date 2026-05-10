export function getUserRole(user) {
  return user?.user_metadata?.role || 'data_entry'
}

export function can(user, action) {
  const role = getUserRole(user)
  const permissions = {
    admin:       ['manage_users', 'view_all', 'edit_all', 'doctor_notes', 'lab_results', 'referrals', 'export'],
    coordinator: ['view_all', 'edit_all', 'referrals', 'export'],
    doctor:      ['view_all', 'doctor_notes', 'referrals', 'lab_results'],
    lab:         ['view_all', 'lab_results'],
    data_entry:  ['view_all'],
  }
  return (permissions[role] || permissions['data_entry']).includes(action)
}

// Which top-level screens each role may visit.
// 'kiosk' is handled separately (no-auth route).
const SCREEN_ACCESS = {
  admin:       ['dashboard', 'register', 'patients', 'screenings', 'camps', 'reports', 'admin_users', 'healthpods', 'campaigns'],
  coordinator: ['dashboard', 'register', 'patients', 'screenings', 'camps', 'reports', 'healthpods', 'campaigns'],
  doctor:      ['dashboard', 'patients', 'screenings', 'register'],
  lab:         ['dashboard', 'patients', 'screenings'],
  data_entry:  ['dashboard', 'register', 'patients', 'screenings'],
}

export function canAccess(user, screen) {
  const role = getUserRole(user)
  return (SCREEN_ACCESS[role] || SCREEN_ACCESS['data_entry']).includes(screen)
}

export function allowedScreens(user) {
  const role = getUserRole(user)
  return SCREEN_ACCESS[role] || SCREEN_ACCESS['data_entry']
}

export function isAdmin(user) {
  return getUserRole(user) === 'admin'
}

export function isAdminOrCoordinator(user) {
  return ['admin', 'coordinator'].includes(getUserRole(user))
}
