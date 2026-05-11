import { createClient } from '@supabase/supabase-js'
import { coerceUUIDs } from './utils'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

const missingConfigProxy = new Proxy({}, {
  get() { throw new Error('Supabase not configured — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to environment variables') }
})

/**
 * Wrap a Supabase query builder so that every .insert(), .update(), and
 * .upsert() call automatically runs data through coerceUUIDs().
 *
 * This is the single, authoritative defence against
 *   "invalid input syntax for type uuid: ''"
 * No individual call-site needs to remember to add coerceUUIDs().
 */
function wrapQueryBuilder(qb) {
  return new Proxy(qb, {
    get(target, prop) {
      if (
        (prop === 'insert' || prop === 'update' || prop === 'upsert') &&
        typeof target[prop] === 'function'
      ) {
        return (data, options) => {
          const safe = Array.isArray(data)
            ? data.map(coerceUUIDs)
            : coerceUUIDs(data)
          return target[prop](safe, options)
        }
      }
      const value = target[prop]
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

/** Wrap the client so every .from() returns a UUID-safe query builder. */
function createSafeClient(client) {
  return new Proxy(client, {
    get(target, prop) {
      if (prop === 'from' && typeof target[prop] === 'function') {
        return (...args) => wrapQueryBuilder(target[prop](...args))
      }
      const value = target[prop]
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

const rawClient = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : missingConfigProxy

export const supabase = supabaseConfigured
  ? createSafeClient(rawClient)
  : missingConfigProxy
