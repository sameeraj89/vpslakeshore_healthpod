import { CheckCircle, AlertCircle, Info } from 'lucide-react'

const icons = { success: CheckCircle, error: AlertCircle, info: Info }
const colors = {
  success: { bg: '#f0fdf4', border: '#86efac', text: '#166534', icon: '#22c55e' },
  error:   { bg: '#fff1f2', border: '#fca5a5', text: '#991b1b', icon: '#ef4444' },
  info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', icon: '#3b82f6' },
}

export default function Toast({ message, type = 'success' }) {
  const c = colors[type]
  const Icon = icons[type]
  return (
    <div role="alert" aria-live="assertive" style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem',
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: '0.625rem', padding: '0.75rem 1rem',
      display: 'flex', alignItems: 'center', gap: '0.625rem',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      maxWidth: 340, zIndex: 9999,
      animation: 'slideIn 0.2s ease',
    }}>
      <Icon size={18} color={c.icon} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{message}</span>
    </div>
  )
}
