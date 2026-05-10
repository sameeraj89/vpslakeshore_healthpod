export function getUserRole(user) {
  return user?.user_metadata?.role || 'data_entry'
}

export function can(user, action) {
  const role = getUserRole(user)
  const permissions = {
    admin: ['manage_users', 'view_all', 'edit_all', 'doctor_notes', 'lab_results', 'referrals', 'export'],
    coordinator: ['view_all', 'edit_all', 'referrals', 'export'],
    doctor: ['view_all', 'doctor_notes', 'referrals', 'lab_results'],
    lab: ['view_all', 'lab_results'],
    data_entry: ['view_all'],
  }
  return (permissions[role] || permissions['data_entry']).includes(action)
}

export function isAdmin(user) {
  return ['admin'].includes(getUserRole(user))
}

export function isAdminOrCoordinator(user) {
  return ['admin', 'coordinator'].includes(getUserRole(user))
}
