import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/store'
import { generateUHID, calculateAge } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import ConsentModal from '../components/ui/ConsentModal'
import { addToQueue, isOnline, syncQueue } from '../lib/offlineQueue'
import { User, Phone, MapPin, Briefcase, Heart, CreditCard, WifiOff } from 'lucide-react'
import { useT } from '../lib/lang'
import TX from '../lib/translations'

const DISTRICTS_KL = [
  'Ernakulam','Thiruvananthapuram','Kozhikode','Thrissur','Kannur',
  'Kollam','Palakkad','Alappuzha','Malappuram','Kottayam',
  'Idukki','Wayanad','Kasaragod','Pathanamthitta'
]

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(43,124,190,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color="#1B75BC" />
        </div>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{title}</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">{label}{required && <span style={{ color: '#ef4444' }}>*</span>}</label>
      {children}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const { savePatient, showToast } = useApp()
  const { tr } = useT()
  const [saving, setSaving] = useState(false)
  const [showConsent, setShowConsent] = useState(true)
  const [consentGiven, setConsentGiven] = useState(false)

  const [online, setOnline] = useState(isOnline())
  useEffect(() => {
    const up = () => setOnline(true)
    const dn = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', dn)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn) }
  }, [])

  const [form, setForm] = useState({
    name: '', dob: '', gender: '', phone: '', phone2: '', email: '',
    address: '', district: 'Ernakulam', occupation: '', education: '',
    marital_status: '', insurance: '', camp_name: '', referred_by: '',
    tobacco_use: '', alcohol_use: '',
    aadhaar_last4: '', abha_number: '', abha_address: '',
  })

  const age = calculateAge(form.dob)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // ABHA number formatter: auto-insert dashes XX-XXXX-XXXX-XXXX
  function formatABHA(val) {
    const digits = val.replace(/\D/g, '').slice(0, 14)
    if (digits.length <= 2) return digits
    if (digits.length <= 6) return `${digits.slice(0,2)}-${digits.slice(2)}`
    if (digits.length <= 10) return `${digits.slice(0,2)}-${digits.slice(2,6)}-${digits.slice(6)}`
    return `${digits.slice(0,2)}-${digits.slice(2,6)}-${digits.slice(6,10)}-${digits.slice(10)}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { showToast('Patient name is required', 'error'); return }
    if (!form.gender) { showToast('Please select gender', 'error'); return }
    if (form.aadhaar_last4 && !/^\d{4}$/.test(form.aadhaar_last4)) {
      showToast('Aadhaar last 4 digits must be exactly 4 numbers', 'error'); return
    }
    if (form.abha_number && form.abha_number.replace(/\D/g,'').length !== 14) {
      showToast('ABHA number must be 14 digits', 'error'); return
    }
    if (form.phone && !/^\+?[\d\s\-]{10,15}$/.test(form.phone.trim())) {
      showToast('Enter a valid phone number (10–15 digits)', 'error'); return
    }
    setSaving(true)
    try {
      const uhid = generateUHID()
      const patientData = {
        ...form,
        dob: form.dob || null,
        uhid,
        age: age || null,
        risk_score: 0,
        risk_level: 'low',
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
      }

      if (!isOnline()) {
        addToQueue(patientData)
        showToast('Saved offline — will sync when connected', 'info')
        navigate('/patients')
        return
      }

      const patient = await savePatient(patientData)
      // flush previously queued offline records (fire-and-forget, errors shown via toast)
      syncQueue(savePatient, showToast).catch(() => {})
      showToast(`Patient registered! UHID: ${uhid}`)
      navigate(`/patients/${patient.id}`)
    } catch (err) {
      showToast(err.message || 'Failed to save patient', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (showConsent && !consentGiven) {
    return (
      <ConsentModal
        onConsent={() => { setConsentGiven(true); setShowConsent(false) }}
        onDecline={() => navigate('/patients')}
      />
    )
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        title={tr(TX.register.title)}
        subtitle={tr(TX.register.subtitle)}
      />

      {/* Offline banner */}
      {!online && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', borderRadius: '0.5rem', padding: '0.625rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e', fontSize: '0.875rem' }}>
          <WifiOff size={15} />
          <strong>{tr(TX.sidebar.offlineMode)}</strong> — {tr(TX.register.offlineBanner)}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Section icon={User} title={tr(TX.register.personalInfo)}>
          <Field label={tr(TX.register.fullName)} required>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder={tr(TX.register.namePlaceholder)} />
          </Field>
          <Field label={tr(TX.register.dob)}>
            <input className="form-input" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} max={new Date().toISOString().split('T')[0]} />
          </Field>
          <Field label={tr(TX.register.age)}>
            <input className="form-input" value={age !== null ? `${age} ${tr(TX.register.years)}` : ''} readOnly placeholder={tr(TX.register.ageAuto)} style={{ background: '#f8fafc', color: '#64748b' }} />
          </Field>
          <Field label={tr(TX.register.gender)} required>
            <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">{tr(TX.register.selectGender)}</option>
              <option value="Male">{tr(TX.common.male)}</option>
              <option value="Female">{tr(TX.common.female)}</option>
              <option value="Other">{tr(TX.common.other)}</option>
            </select>
          </Field>
          <Field label={tr(TX.register.maritalStatus)}>
            <select className="form-select" value={form.marital_status} onChange={e => set('marital_status', e.target.value)}>
              <option value="">{tr(TX.common.select)}</option>
              <option value="Single">{tr(TX.register.single)}</option>
              <option value="Married">{tr(TX.register.married)}</option>
              <option value="Widowed">{tr(TX.register.widowed)}</option>
              <option value="Divorced">{tr(TX.register.divorced)}</option>
            </select>
          </Field>
          <Field label={tr(TX.register.education)}>
            <select className="form-select" value={form.education} onChange={e => set('education', e.target.value)}>
              <option value="">{tr(TX.common.select)}</option>
              <option value="No formal education">{tr(TX.register.eduNone)}</option>
              <option value="Primary (up to Class 5)">{tr(TX.register.eduPrimary)}</option>
              <option value="Secondary (Class 6–10)">{tr(TX.register.eduSecondary)}</option>
              <option value="Higher Secondary">{tr(TX.register.eduHigher)}</option>
              <option value="Graduate">{tr(TX.register.eduGraduate)}</option>
              <option value="Post-graduate">{tr(TX.register.eduPostGrad)}</option>
            </select>
          </Field>
        </Section>

        <Section icon={Phone} title={tr(TX.register.contactDetails)}>
          <Field label={tr(TX.register.primaryPhone)} required>
            <input className="form-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
          </Field>
          <Field label={tr(TX.register.altPhone)}>
            <input className="form-input" type="tel" value={form.phone2} onChange={e => set('phone2', e.target.value)} placeholder={tr(TX.register.optional)} />
          </Field>
          <Field label="Email address">
            <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="patient@example.com (optional)" />
          </Field>
          <Field label={tr(TX.register.insurance)}>
            <input className="form-input" value={form.insurance} onChange={e => set('insurance', e.target.value)} placeholder={tr(TX.register.insurancePh)} />
          </Field>
        </Section>

        <Section icon={MapPin} title={tr(TX.register.address)}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">{tr(TX.register.address)}</label>
            <textarea className="form-textarea" value={form.address} onChange={e => set('address', e.target.value)} placeholder={tr(TX.register.addressPh)} style={{ minHeight: 60 }} />
          </div>
          <Field label={tr(TX.register.district)}>
            <select className="form-select" value={form.district} onChange={e => set('district', e.target.value)}>
              {DISTRICTS_KL.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
        </Section>

        <Section icon={Briefcase} title={tr(TX.register.occupationCamp)}>
          <Field label={tr(TX.register.occupation)}>
            <input className="form-input" value={form.occupation} onChange={e => set('occupation', e.target.value)} placeholder={tr(TX.register.occupationPh)} />
          </Field>
          <Field label={tr(TX.register.campVenue)}>
            <input className="form-input" value={form.camp_name} onChange={e => set('camp_name', e.target.value)} placeholder="e.g. Kalamassery Camp May 2026" />
          </Field>
          <Field label={tr(TX.register.referredBy)}>
            <input className="form-input" value={form.referred_by} onChange={e => set('referred_by', e.target.value)} placeholder={tr(TX.register.referredByPh)} />
          </Field>
        </Section>

        <Section icon={CreditCard} title={tr(TX.register.healthIds)}>
          <Field label={tr(TX.register.aadhaarLast4)}>
            <input
              className="form-input"
              type="text"
              maxLength={4}
              value={form.aadhaar_last4}
              onChange={e => set('aadhaar_last4', e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="e.g. 4321"
            />
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 3 }}>{tr(TX.register.aadhaarNote)}</div>
          </Field>
          <Field label={tr(TX.register.abhaNumber)}>
            <input
              className="form-input"
              type="text"
              value={form.abha_number}
              onChange={e => set('abha_number', formatABHA(e.target.value))}
              placeholder="XX-XXXX-XXXX-XXXX"
            />
          </Field>
          <Field label={tr(TX.register.abhaAddress)}>
            <input
              className="form-input"
              type="text"
              value={form.abha_address}
              onChange={e => set('abha_address', e.target.value)}
              placeholder="username@abdm"
            />
          </Field>
        </Section>

        <Section icon={Heart} title={tr(TX.register.lifestyle)}>
          <Field label={tr(TX.register.tobaccoUse)}>
            <select className="form-select" value={form.tobacco_use} onChange={e => set('tobacco_use', e.target.value)}>
              <option value="">{tr(TX.common.select)}</option>
              <option value="None">{tr(TX.register.tobaccoNone)}</option>
              <option value="Smoking">{tr(TX.register.tobaccoSmoking)}</option>
              <option value="Smokeless (gutka/paan)">{tr(TX.register.tobaccoSmokeless)}</option>
              <option value="Both">{tr(TX.register.tobaccoBoth)}</option>
              <option value="Ex-smoker">{tr(TX.register.tobaccoEx)}</option>
            </select>
          </Field>
          <Field label={tr(TX.register.alcoholUse)}>
            <select className="form-select" value={form.alcohol_use} onChange={e => set('alcohol_use', e.target.value)}>
              <option value="">{tr(TX.common.select)}</option>
              <option value="None">{tr(TX.register.alcoholNone)}</option>
              <option value="Occasional">{tr(TX.register.alcoholOcc)}</option>
              <option value="Regular">{tr(TX.register.alcoholRegular)}</option>
              <option value="Heavy">{tr(TX.register.alcoholHeavy)}</option>
            </select>
          </Field>
        </Section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn-secondary" onClick={() => navigate('/patients')}>{tr(TX.register.cancel)}</button>
          <button type="submit" className="btn-primary" disabled={saving} style={{ minWidth: 140 }}>
            {saving ? tr(TX.register.registeringBtn) : tr(TX.register.registerBtn)}
          </button>
        </div>
      </form>
    </div>
  )
}
