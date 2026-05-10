import * as XLSX from 'xlsx'
import { format } from 'date-fns'

// Prevent Excel formula injection by prefixing dangerous characters
function safe(value) {
  if (value == null) return ''
  const str = String(value)
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
}

export function exportToExcel(patients, screenings) {
  const rows = patients.map(p => {
    const sc = screenings.filter(s => s.patient_id === p.id)
    const oral = sc.find(s => s.cancer_type === 'oral')
    const breast = sc.find(s => s.cancer_type === 'breast')
    const cervix = sc.find(s => s.cancer_type === 'cervix')
    const colon = sc.find(s => s.cancer_type === 'colon')
    const prostate = sc.find(s => s.cancer_type === 'prostate')

    return {
      'UHID': safe(p.uhid),
      'ABHA Number': safe(p.abha_number),
      'ABHA Address': safe(p.abha_address),
      'Aadhaar Last 4': safe(p.aadhaar_last4),
      'Name': safe(p.name),
      'Age': p.age,
      'Gender': safe(p.gender),
      'Phone': safe(p.phone),
      'Alt Phone': safe(p.phone2),
      'Email': safe(p.email),
      'DOB': safe(p.dob),
      'District': safe(p.district),
      'Address': safe(p.address),
      'Occupation': safe(p.occupation),
      'Camp / Source': safe(p.camp_name),
      'Referred By': safe(p.referred_by),
      'Risk Score': p.risk_score,
      'Risk Level': safe(p.risk_level),
      'Oral - OVE Finding': safe(oral?.finding),
      'Oral - Result': safe(oral?.result),
      'Breast - CBE Finding': safe(breast?.finding),
      'Breast - Result': safe(breast?.result),
      'Cervix - VIA/VILI Result': safe(cervix?.finding),
      'Cervix - Result': safe(cervix?.result),
      'Colon - FOBT Result': safe(colon?.finding),
      'Colon - Result': safe(colon?.result),
      'Prostate - PSA (ng/mL)': safe(prostate?.finding),
      'Prostate - Result': safe(prostate?.result),
      'Referred': p.referred ? 'Yes' : 'No',
      'Referral Notes': safe(p.referral_notes),
      'Registered On': p.created_at ? format(new Date(p.created_at), 'dd/MM/yyyy HH:mm') : '',
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Screening Linelist')

  const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length + 2, 14) }))
  ws['!cols'] = colWidths

  const filename = `HealthPod_Linelist_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
  XLSX.writeFile(wb, filename)
}

// Lead generation export — contact info + risk qualifier + acquisition source
// Designed for CRM import (Zoho, HubSpot, Salesforce, etc.)
export function exportLeads(patients, screenings, { riskFilter = 'all' } = {}) {
  const RISK_ORDER = { red: 0, orange: 1, amber: 2, green: 3 }

  let filtered = [...patients]
  if (riskFilter !== 'all') {
    filtered = filtered.filter(p => p.risk_level === riskFilter)
  }
  // Sort highest risk first
  filtered.sort((a, b) => (RISK_ORDER[a.risk_level] ?? 9) - (RISK_ORDER[b.risk_level] ?? 9))

  const rows = filtered.map(p => {
    const sc = screenings.filter(s => s.patient_id === p.id)
    const positiveScreenings = sc.filter(s => s.result === 'Positive').map(s => s.cancer_type).join(', ')
    const screeningCount = sc.length

    // Risk tier label for CRM tagging
    const tierLabel = {
      red: 'Act Now — High Priority',
      orange: 'At Risk — Follow Up',
      amber: 'Watchful — Nurture',
      green: 'Thriving — Wellness',
    }[p.risk_level] || 'Unknown'

    return {
      'First Name': safe(p.name?.split(' ')[0] || p.name),
      'Last Name': safe(p.name?.split(' ').slice(1).join(' ')),
      'Full Name': safe(p.name),
      'Phone': safe(p.phone),
      'Alt Phone': safe(p.phone2),
      'Email': safe(p.email),
      'Age': p.age,
      'Gender': safe(p.gender),
      'District': safe(p.district),
      'Occupation': safe(p.occupation),
      'Lead Source': safe(p.camp_name) || 'HealthPod Camp',
      'Referred By': safe(p.referred_by),
      'Risk Score': p.risk_score,
      'Risk Level': safe(p.risk_level),
      'CRM Tag': tierLabel,
      'Positive Screenings': positiveScreenings,
      'Screenings Done': screeningCount,
      'Needs Follow-up': p.referred ? 'Yes' : positiveScreenings ? 'Yes' : 'No',
      'UHID': safe(p.uhid),
      'Registered On': p.created_at ? format(new Date(p.created_at), 'dd/MM/yyyy') : '',
    }
  })

  if (!rows.length) return 0

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Leads')

  // Highlight the header row
  const range = XLSX.utils.decode_range(ws['!ref'])
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c })
    if (ws[cell]) ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: '1B75BC' } } }
  }

  const colWidths = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length + 2, 16) }))
  ws['!cols'] = colWidths

  const filename = `HealthPod_Leads_${riskFilter !== 'all' ? riskFilter + '_' : ''}${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
  XLSX.writeFile(wb, filename)
  return rows.length
}
