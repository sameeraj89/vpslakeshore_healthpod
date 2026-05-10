/**
 * Creates one test staff account per role in Supabase.
 *
 * Usage:
 *   1. Add your service_role key to .env.local:
 *        VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   2. Run:
 *        node scripts/seed-users.mjs
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read .env.local
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    return Object.fromEntries(
      raw.split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()] })
    )
  } catch {
    return {}
  }
}

const env = { ...loadEnv(), ...process.env }
const SUPABASE_URL = env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY')
  console.error('Add VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ... to your .env.local file')
  process.exit(1)
}

const USERS = [
  { email: 'admin@healthpod.test',       password: 'HealthPod@Admin1',       name: 'Admin User',          role: 'admin' },
  { email: 'coordinator@healthpod.test', password: 'HealthPod@Coord1',       name: 'Priya Coordinator',   role: 'coordinator' },
  { email: 'doctor@healthpod.test',      password: 'HealthPod@Doctor1',      name: 'Dr. Arun Kumar',      role: 'doctor' },
  { email: 'lab@healthpod.test',         password: 'HealthPod@Lab1234',      name: 'Lab Technician',      role: 'lab' },
  { email: 'dataentry@healthpod.test',   password: 'HealthPod@Data1234',     name: 'CareMitra Field',     role: 'data_entry' },
]

async function adminPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function upsertProfile(userId, { email, name, role }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/staff_profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ user_id: userId, email, name, role, active: true }),
  })
  return res.ok
}

console.log(`\nCreating ${USERS.length} test users on ${SUPABASE_URL}\n`)

for (const u of USERS) {
  const result = await adminPost('/users', {
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { name: u.name, role: u.role },
  })

  if (result.id) {
    await upsertProfile(result.id, u)
    console.log(`✅  ${u.role.padEnd(14)} ${u.email}  (pw: ${u.password})`)
  } else if (result.msg?.includes('already been registered') || result.code === 422) {
    console.log(`⚠️   ${u.role.padEnd(14)} ${u.email}  — already exists, skipped`)
  } else {
    console.log(`❌  ${u.role.padEnd(14)} ${u.email}  — ${result.msg || JSON.stringify(result)}`)
  }
}

console.log('\nDone. Use the credentials above to test each role.')
console.log('Delete these accounts after testing — they use .test domains.\n')
