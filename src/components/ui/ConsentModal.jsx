import { useState } from 'react'
import { useLang, t } from '../../lib/lang'
import { ShieldCheck, X } from 'lucide-react'

const CONSENT_TEXT = {
  en: {
    title: 'Informed Consent',
    subtitle: 'VPS Lakeshore HealthPod — Screening Programme',
    intro: 'Before we begin, please read and agree to the following:',
    points: [
      'Your health information will be collected for the purpose of cancer screening and NCD risk assessment.',
      'Data is stored securely and will only be shared with authorised Lakeshore Hospital clinical staff.',
      'No Aadhaar or national ID is required. Your mobile number is used only for follow-up.',
      'This screening does not replace a full clinical diagnosis. Positive findings will be referred to a specialist.',
      'You may withdraw consent and request deletion of your data at any time.',
      'Data is handled in compliance with DISHA guidelines and the IT Act 2000.',
    ],
    checkbox: 'I have read and understood the above. I give my voluntary consent to participate in this screening programme.',
    confirm: 'I Agree — Continue Registration',
    cancel: 'Decline',
  },
  ml: {
    title: 'അറിവോടെ ഉള്ള സമ്മതം',
    subtitle: 'VPS Lakeshore HealthPod — സ്ക്രീനിംഗ് പ്രോഗ്രാം',
    intro: 'ആരംഭിക്കുന്നതിന് മുൻപ് ദയവായി വായിച്ച് സമ്മതം നൽകുക:',
    points: [
      'ക്യാൻസർ സ്ക്രീനിംഗ്, NCD റിസ്ക് അസസ്മെന്റ് എന്നിവ ലക്ഷ്യമാക്കി ആരോഗ്യ വിവരങ്ങൾ ശേഖരിക്കും.',
      'ഡാറ്റ സുരക്ഷിതമായി സൂക്ഷിക്കും; Lakeshore ക്ലിനിക്കൽ സ്റ്റാഫ് മാത്രം ആക്സസ് ചെയ്യും.',
      'ആധാർ ആവശ്യമില്ല. ഫോൺ നമ്പർ ഫോളോ-അപ്പ് ആവശ്യങ്ങൾക്ക് മാത്രം ഉപയോഗിക്കും.',
      'ഈ സ്ക്രീനിംഗ് ക്ലിനിക്കൽ ഡയഗ്നോസിസ് അല്ല. പോസിറ്റീവ് ഫലങ്ങൾ സ്പെഷ്യലിസ്റ്റിന് റഫർ ചെയ്യും.',
      'ഏത് സമയത്തും സമ്മതം പിൻവലിക്കാം, ഡാറ്റ ഡിലീറ്റ് ആക്കാം.',
      'DISHA മാർഗ്ഗനിർദ്ദേശങ്ങൾ, IT Act 2000 പ്രകാരം ഡാറ്റ കൈകാര്യം ചെയ്യും.',
    ],
    checkbox: 'ഞാൻ മേൽ‌പ്പറഞ്ഞവ വായിച്ചു മനസ്സിലാക്കി. ഈ സ്ക്രീനിംഗ് പ്രോഗ്രാമിൽ സ്വമേധയാ പങ്കെടുക്കാൻ സമ്മതിക്കുന്നു.',
    confirm: 'സമ്മതിക്കുന്നു — രജിസ്ട്രേഷൻ തുടരുക',
    cancel: 'നിരസിക്കുക',
  },
}

export default function ConsentModal({ onConsent, onDecline }) {
  const { lang } = useLang()
  const c = CONSENT_TEXT[lang] || CONSENT_TEXT.en
  const [agreed, setAgreed] = useState(false)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9998, padding: '1rem',
    }}>
      <div style={{
        background: 'white', borderRadius: '1rem', width: '100%', maxWidth: 540,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(43,124,190,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={20} color="#1B75BC" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{c.title}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{c.subtitle}</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1rem' }}>{c.intro}</p>
          <ul style={{ margin: 0, padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {c.points.map((point, i) => (
              <li key={i} style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}>{point}</li>
            ))}
          </ul>

          {/* Checkbox */}
          <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginTop: '1.5rem', cursor: 'pointer', padding: '0.875rem', background: agreed ? 'rgba(43,124,190,0.05)' : '#f8fafc', borderRadius: '0.5rem', border: `1.5px solid ${agreed ? '#1B75BC' : '#e2e8f0'}` }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2, accentColor: '#1B75BC' }}
            />
            <span style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}>{c.checkbox}</span>
          </label>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onDecline}>{c.cancel}</button>
          <button className="btn-primary" onClick={onConsent} disabled={!agreed} style={{ minWidth: 200 }}>
            {c.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
