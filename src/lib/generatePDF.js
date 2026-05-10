import jsPDF from 'jspdf'
import { format } from 'date-fns'
import QRCode from 'qrcode'
import { generateVoucherCode } from './riskConfig'

const BLUE = [43, 124, 190]
const MAROON = [139, 26, 74]
const GRAY = [127, 140, 155]

const TIER_COLORS = {
  green:  [16, 185, 129],
  amber:  [245, 158, 11],
  orange: [249, 115, 22],
  red:    [139, 26, 74],
}

export async function generateScorecard(patient, score, tier, domainScores) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297
  const pad = 16

  // ---- Header band ----
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 38, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('HealthPod', pad, 15)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('VPS Lakeshore Hospital · Global Lifecare', pad, 22)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('NCD Health Risk Scorecard', pad, 31)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(format(new Date(), 'dd MMM yyyy'), W - pad, 15, { align: 'right' })
  doc.text(patient.uhid || '', W - pad, 22, { align: 'right' })

  // ---- Patient info row ----
  let y = 48
  doc.setTextColor(30, 41, 59)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(pad, y, W - pad * 2, 22, 3, 3, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(patient.name || 'Patient', pad + 4, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const info = [
    patient.age ? `Age: ${patient.age}` : '',
    patient.gender || '',
    patient.phone || '',
    patient.camp_name || '',
  ].filter(Boolean).join('   ·   ')
  doc.text(info, pad + 4, y + 15)

  // ---- Score circle area ----
  y += 30
  const cx = W / 2, cy = y + 22
  const r = 22
  const tc = TIER_COLORS[tier.level] || MAROON

  doc.setDrawColor(...tc)
  doc.setLineWidth(2.5)
  doc.circle(cx, cy, r, 'S')

  doc.setFillColor(tc[0], tc[1], tc[2], 0.08)
  doc.circle(cx, cy, r - 1, 'F')

  doc.setTextColor(...tc)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text(String(score), cx, cy + 4, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('out of 100', cx, cy + 10, { align: 'center' })

  doc.setFillColor(...tc)
  doc.roundedRect(cx - 28, cy + 14, 56, 9, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(tier.label?.en?.toUpperCase() || '', cx, cy + 20, { align: 'center' })

  y = cy + 34
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'italic')
  const msg = tier.message?.en || ''
  const lines = doc.splitTextToSize(msg, W - pad * 2 - 20)
  doc.text(lines, cx, y, { align: 'center' })
  y += lines.length * 5 + 6

  // ---- Domain breakdown ----
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(pad, y, W - pad, y)
  y += 6

  doc.setTextColor(30, 41, 59)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Domain Breakdown', pad, y)
  y += 6

  const domains = [
    { label: 'Physical Activity', max: 20 },
    { label: 'Nutrition & Diet', max: 20 },
    { label: 'Tobacco & Alcohol', max: 15 },
    { label: 'Stress & Sleep', max: 15 },
    { label: 'Biometrics', max: 20 },
    { label: 'Screening History', max: 10 },
  ]

  const barW = W - pad * 2 - 60
  domains.forEach((d, i) => {
    const ds = domainScores?.[i] || 0
    const pct = ds / d.max
    const barColor = pct >= 0.7 ? [16, 185, 129] : pct >= 0.4 ? [245, 158, 11] : [239, 68, 68]

    doc.setTextColor(71, 85, 105)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(d.label, pad, y + 4)

    doc.setFillColor(226, 232, 240)
    doc.roundedRect(pad + 52, y, barW, 5, 1, 1, 'F')

    doc.setFillColor(...barColor)
    if (pct > 0) doc.roundedRect(pad + 52, y, barW * pct, 5, 1, 1, 'F')

    doc.setTextColor(...barColor)
    doc.setFont('helvetica', 'bold')
    doc.text(`${ds}/${d.max}`, W - pad, y + 4, { align: 'right' })

    y += 10
  })

  y += 4
  doc.setDrawColor(226, 232, 240)
  doc.line(pad, y, W - pad, y)
  y += 8

  // ---- Voucher ----
  const voucherH = 32
  const voucherW = W - pad * 2

  doc.setFillColor(...BLUE)
  doc.roundedRect(pad, y, voucherW, voucherH, 4, 4, 'F')
  doc.setFillColor(...MAROON)
  doc.roundedRect(pad + voucherW / 2, y, voucherW / 2, voucherH, 4, 4, 'F')

  // Left side — offer text
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Your Wellness Voucher', pad + 5, y + 7)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`${tier.voucher} OFF`, pad + 5, y + 19)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('on VPS Lakeshore wellness package', pad + 5, y + 26)

  // Right side — QR code + UHID
  const qrSize = 22
  const qrX = W - pad - qrSize - 3
  const qrY = y + (voucherH - qrSize) / 2

  try {
    const voucherCode = generateVoucherCode(patient, score, tier)
    const qrDataUrl = await QRCode.toDataURL(voucherCode, {
      width: 128,
      margin: 1,
      color: { dark: '#FFFFFF', light: '#00000000' },
    })
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
  } catch {
    // Fallback to plain text if QR fails
    doc.setFontSize(9)
    doc.setFont('courier', 'bold')
    doc.text(patient.uhid || '', W - pad - 4, y + 17, { align: 'right' })
  }

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(255, 255, 255, 0.8)
  doc.text('Scan to redeem', qrX + qrSize / 2, y + voucherH - 1.5, { align: 'center' })

  y += voucherH + 10

  // ---- Next steps ----
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Recommended Next Steps', pad, y)
  y += 5

  const steps = {
    green:  ['Continue annual wellness check', 'Maintain current lifestyle habits', 'Re-screen in 12 months'],
    amber:  ['Book a preventive health panel', 'Attend lifestyle counselling session', 'Re-screen in 6 months'],
    orange: ['Consult a specialist within 4 weeks', 'Complete the cancer screening today', 'Re-screen in 3 months'],
    red:    ['Speak with the nurse counsellor today', 'Comprehensive NCD package recommended', 'Urgent specialist referral'],
  }

  const stepList = steps[tier.level] || steps.green
  stepList.forEach((s) => {
    doc.setFillColor(...BLUE)
    doc.circle(pad + 2, y + 1, 1.5, 'F')
    doc.setTextColor(71, 85, 105)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(s, pad + 6, y + 2.5)
    y += 7
  })

  // ---- Footer ----
  doc.setFillColor(248, 250, 252)
  doc.rect(0, H - 18, W, 18, 'F')
  doc.setTextColor(...GRAY)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('VPS Lakeshore Hospital · Global Lifecare · Kochi, Kerala', W / 2, H - 10, { align: 'center' })
  doc.text('This scorecard is for screening purposes only and does not constitute a clinical diagnosis.', W / 2, H - 5, { align: 'center' })

  doc.save(`HealthPod_Scorecard_${patient.uhid || 'patient'}.pdf`)
}
