import jsPDF from 'jspdf'
import { format } from 'date-fns'
import QRCode from 'qrcode'
import { generateVoucherCode } from './riskConfig'
import { SCREENING_TYPES, SCREENING_CATEGORIES } from './screeningConfig'

// ── Brand palette ──────────────────────────────────────────────────────────
const C = {
  blue:      [27, 117, 188],
  maroon:    [166, 33, 90],
  darkText:  [15, 23, 42],
  midText:   [51, 65, 85],
  mutedText: [100, 116, 139],
  lightText: [148, 163, 184],
  bgLight:   [248, 250, 252],
  bgBlue:    [240, 247, 255],
  border:    [226, 232, 240],
  white:     [255, 255, 255],
  green:     [16, 185, 129],
  amber:     [245, 158, 11],
  orange:    [249, 115, 22],
  red:       [220, 38, 38],
}

// tier.level → fill color
const TIER_C = {
  green:  C.green,
  amber:  C.amber,
  orange: C.orange,
  red:    C.maroon,
}

// ── Helpers ────────────────────────────────────────────────────────────────

function pill(doc, x, y, w, h, fillRgb) {
  doc.setFillColor(...fillRgb)
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F')
}

function sectionHeading(doc, label, y, pad, W) {
  doc.setTextColor(...C.blue)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text(label, pad, y + 3.5)
  const labelW = doc.getTextWidth(label)
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.4)
  doc.line(pad + labelW + 3, y + 2, W - pad, y + 2)
  return y + 8
}

// Loads /logo.png → base64 data-URL directly (sharper than SVG→canvas pipeline)
async function loadLogoDataUrl() {
  try {
    const res = await fetch('/logo.png')
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return 'data:image/png;base64,' + btoa(binary)
  } catch { return null }
}

// Logo aspect ratio constants (logo.png = 495 × 295 px → 1.678 : 1)
const LOGO_W = 495, LOGO_H = 295
function logoSize(h) { return { w: Math.round(h * LOGO_W / LOGO_H), h } }

// ── Main export ────────────────────────────────────────────────────────────

export async function generateScorecard(patientRaw, score, tier, domainScores) {
  const patient = patientRaw || {}
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297, pad = 14
  const tc = TIER_C[tier.level] || C.maroon
  const innerW = W - pad * 2   // 182 mm

  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════

  // Top brand stripes
  doc.setFillColor(...C.blue)
  doc.rect(0, 0, W, 4, 'F')
  doc.setFillColor(...C.maroon)
  doc.rect(0, 4, W, 1.2, 'F')

  // Logo (left) — logo.png at correct aspect ratio (495×295 → ~34×20 mm)
  let y = 8
  const logoUrl = await loadLogoDataUrl()
  const lg = logoSize(20)   // height 20 mm → width ≈ 34 mm
  if (logoUrl) {
    doc.addImage(logoUrl, 'PNG', pad, y, lg.w, lg.h)
  } else {
    // Text-only fallback
    doc.setTextColor(...C.maroon)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
    doc.text('vps', pad, y + 10)
    doc.setTextColor(...C.blue)
    doc.text(' Lakeshore Hospital', pad + 12, y + 10)
  }

  // HealthPod sub-brand pill (right of logo)
  const hpX = pad + lg.w + 5, hpY = y + 2
  doc.setFillColor(240, 247, 255)
  doc.setDrawColor(...C.blue)
  doc.setLineWidth(0.35)
  doc.roundedRect(hpX, hpY, 52, 9, 2, 2, 'FD')
  doc.setTextColor(...C.blue)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('HealthPod', hpX + 5, hpY + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...C.mutedText)
  doc.text('Screening & Early Detection', hpX + 5, hpY + 11.5)

  // Hospital address sub-line
  doc.setTextColor(...C.mutedText)
  doc.setFontSize(6.2)
  doc.setFont('helvetica', 'normal')
  doc.text('Nettoor P.O., Maradu, Kochi, Kerala 682 040', pad, y + 25)
  doc.text('Tel: +91-484-2701000  ·  healthpod@vpskeralahealthcare.com', pad, y + 29.5)

  // Right info panel (slightly wider now that logo is more compact)
  const rpX = 126, rpW = W - rpX - pad
  doc.setFillColor(...C.bgLight)
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(rpX, y, rpW, 32, 2, 2, 'FD')

  doc.setFillColor(...C.blue)
  doc.roundedRect(rpX, y, rpW, 8, 2, 2, 'F')
  doc.rect(rpX, y + 5, rpW, 3, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('NCD HEALTH RISK SCORECARD', rpX + rpW / 2, y + 5.5, { align: 'center' })

  function rpRow(label, val, ry) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.lightText)
    doc.setFontSize(5.8)
    doc.text(label, rpX + 3, ry)
    doc.setTextColor(...C.darkText)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(String(val), rpX + rpW - 3, ry, { align: 'right' })
  }
  rpRow('Report Date', format(new Date(), 'dd MMM yyyy'), y + 14)
  rpRow('UHID', patient.uhid || '—', y + 20)
  rpRow('Report Ref', `HPR-${(patient.uhid || 'XXXXXX').slice(-6)}`, y + 26)

  y += 38

  // Header / content divider
  doc.setDrawColor(...C.blue)
  doc.setLineWidth(0.7)
  doc.line(pad, y, W - pad, y)
  doc.setDrawColor(...C.maroon)
  doc.setLineWidth(0.3)
  doc.line(pad, y + 0.9, W - pad, y + 0.9)
  y += 7

  // ═══════════════════════════════════════════════════════════════
  // PATIENT INFORMATION
  // ═══════════════════════════════════════════════════════════════

  y = sectionHeading(doc, 'PATIENT INFORMATION', y, pad, W)

  doc.setFillColor(...C.bgLight)
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(pad, y, innerW, 22, 2, 2, 'FD')

  // Name (large)
  doc.setTextColor(...C.darkText)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(patient.name || '—', pad + 4, y + 9)

  // Detail pills
  const patDetails = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender || null,
    patient.phone ? `📞 ${patient.phone}` : null,
    patient.camp_name ? `🏕 ${patient.camp_name}` : null,
    patient.district || null,
  ].filter(Boolean)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.mutedText)
  doc.setFontSize(7.5)
  doc.text(patDetails.join('   ·   '), pad + 4, y + 16.5)

  // Screened-on (far right)
  doc.setFontSize(6.5)
  doc.setTextColor(...C.lightText)
  doc.text('Screened: ' + format(new Date(), 'dd MMM yyyy'), W - pad - 4, y + 9, { align: 'right' })

  y += 26

  // ═══════════════════════════════════════════════════════════════
  // HEALTH RISK SCORE
  // ═══════════════════════════════════════════════════════════════

  y = sectionHeading(doc, 'HEALTH RISK SCORE', y, pad, W)

  const scH = 46
  // Card with tier-colored left accent bar
  doc.setFillColor(...C.white)
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(pad, y, innerW, scH, 2, 2, 'FD')
  // Left accent
  doc.setFillColor(...tc)
  doc.roundedRect(pad, y, 4, scH, 2, 2, 'F')
  doc.rect(pad + 2, y, 2, scH, 'F')

  // Score number (left)
  const scoreX = pad + 14
  doc.setTextColor(...tc)
  doc.setFontSize(42)
  doc.setFont('helvetica', 'bold')
  doc.text(String(score), scoreX, y + 24)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.mutedText)
  doc.text('/ 100', scoreX + doc.getTextWidth(String(score)) + 1, y + 22)

  // Tier badge below score
  const badgeW = 38, badgeH = 7
  doc.setFillColor(...tc)
  doc.roundedRect(scoreX, y + 28, badgeW, badgeH, 2, 2, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text((tier.label?.en || '').toUpperCase(), scoreX + badgeW / 2, y + 33.5, { align: 'center' })

  // Gauge scale (right two-thirds)
  const gaugeX = pad + 68, gaugeW = innerW - 68
  const gaugeY = y + 12, gaugeH = 8

  // Zone backgrounds (0-40 red, 40-60 orange, 60-80 amber, 80-100 green)
  const zones = [
    { from: 0, to: 40, color: [254, 226, 226] },
    { from: 40, to: 60, color: [255, 237, 213] },
    { from: 60, to: 80, color: [254, 249, 195] },
    { from: 80, to: 100, color: [209, 250, 229] },
  ]
  // Clip to rounded rect by drawing zones then overlaying border
  zones.forEach(z => {
    const zx = gaugeX + (z.from / 100) * gaugeW
    const zw = ((z.to - z.from) / 100) * gaugeW
    doc.setFillColor(...z.color)
    doc.rect(zx, gaugeY, zw, gaugeH, 'F')
  })
  // Track border
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(gaugeX, gaugeY, gaugeW, gaugeH, 2, 2, 'D')

  // Score marker line
  const markerX = gaugeX + (score / 100) * gaugeW
  doc.setFillColor(...tc)
  doc.setDrawColor(...tc)
  doc.setLineWidth(0.8)
  doc.line(markerX, gaugeY - 1.5, markerX, gaugeY + gaugeH + 1.5)
  // Diamond marker on top
  doc.setFillColor(...tc)
  const dm = 2
  doc.triangle(markerX - dm, gaugeY - 1.5, markerX + dm, gaugeY - 1.5, markerX, gaugeY + 2, 'F')

  // Zone labels below gauge
  doc.setFontSize(5.2)
  doc.setFont('helvetica', 'bold')
  const zoneInfo = [
    { x: 20, label: 'ACT NOW', color: C.red },
    { x: 50, label: 'AT RISK', color: C.orange },
    { x: 70, label: 'WATCHFUL', color: C.amber },
    { x: 90, label: 'THRIVING', color: C.green },
  ]
  zoneInfo.forEach(z => {
    const zx = gaugeX + (z.x / 100) * gaugeW
    doc.setTextColor(...z.color)
    doc.text(z.label, zx, gaugeY + gaugeH + 4, { align: 'center' })
  })

  // Scale tick labels
  doc.setFontSize(5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.mutedText)
  ;[0, 40, 60, 80, 100].forEach(v => {
    const vx = gaugeX + (v / 100) * gaugeW
    doc.text(String(v), vx, gaugeY - 2.5, { align: 'center' })
  })

  // Tier message
  doc.setTextColor(...C.midText)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  const msgLines = doc.splitTextToSize(tier.message?.en || '', gaugeW)
  doc.text(msgLines, gaugeX, y + 38)

  y += scH + 6

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN ANALYSIS
  // ═══════════════════════════════════════════════════════════════

  y = sectionHeading(doc, 'DOMAIN ANALYSIS', y, pad, W)

  const domains = [
    { label: 'Physical Activity',  icon: '🏃', max: 20 },
    { label: 'Nutrition & Diet',   icon: '🥗', max: 20 },
    { label: 'Tobacco & Alcohol',  icon: '🚬', max: 15 },
    { label: 'Stress & Sleep',     icon: '😴', max: 15 },
    { label: 'Biometrics',         icon: '💊', max: 20 },
    { label: 'Screening History',  icon: '📋', max: 10 },
  ]

  // Table header
  const cols = { label: 54, score: 22, bar: 72, assess: 34 }
  const tblH = 7.5

  doc.setFillColor(...C.blue)
  doc.roundedRect(pad, y, innerW, tblH, 1.5, 1.5, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  let hx = pad + 3
  ;['DOMAIN', 'SCORE', 'PERFORMANCE', 'ASSESSMENT'].forEach((h, i) => {
    doc.text(h, hx, y + 5)
    hx += [cols.label, cols.score, cols.bar, cols.assess][i]
  })
  y += tblH

  domains.forEach((d, i) => {
    const ds = domainScores?.[i] ?? 0
    const pct = d.max > 0 ? ds / d.max : 0
    const barColor = pct >= 0.7 ? C.green : pct >= 0.4 ? C.amber : C.red
    const assessLabel = pct >= 0.7 ? 'GOOD' : pct >= 0.4 ? 'MODERATE' : 'NEEDS ATTN'
    const rowH = 10

    // Alternating row
    if (i % 2 === 0) {
      doc.setFillColor(...C.bgLight)
      doc.rect(pad, y, innerW, rowH, 'F')
    }
    // Row bottom border
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.2)
    doc.line(pad, y + rowH, pad + innerW, y + rowH)

    // Domain label (with left color accent)
    doc.setFillColor(...barColor)
    doc.rect(pad, y, 2.5, rowH, 'F')
    doc.setTextColor(...C.midText)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text(d.label, pad + 5, y + 6.5)

    // Score
    doc.setTextColor(...barColor)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(`${ds}/${d.max}`, pad + cols.label + cols.score / 2, y + 6.5, { align: 'center' })

    // Progress bar
    const bX = pad + cols.label + cols.score + 2
    const bW = cols.bar - 6
    const bH = 4.5
    const bY = y + (rowH - bH) / 2
    doc.setFillColor(...C.border)
    doc.roundedRect(bX, bY, bW, bH, 1, 1, 'F')
    if (pct > 0) {
      doc.setFillColor(...barColor)
      doc.roundedRect(bX, bY, bW * pct, bH, 1, 1, 'F')
    }
    // Percentage label
    doc.setTextColor(...barColor)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(`${Math.round(pct * 100)}%`, bX + bW + 2, bY + 3.5)

    // Assessment pill
    const aX = pad + cols.label + cols.score + cols.bar + 2
    const aW = cols.assess - 4
    pill(doc, aX, y + 2.5, aW, 5.5, barColor)
    doc.setTextColor(...C.white)
    doc.setFontSize(5.5)
    doc.setFont('helvetica', 'bold')
    doc.text(assessLabel, aX + aW / 2, y + 6.3, { align: 'center' })

    y += rowH
  })

  // Total row
  doc.setFillColor(...C.blue)
  doc.rect(pad, y, innerW, 8, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL SCORE', pad + 5, y + 5.5)
  doc.text(`${score} / 100`, pad + cols.label + cols.score / 2, y + 5.5, { align: 'center' })

  // Tier indicator on total row right
  const totalPct = score / 100
  const tierBarX = pad + cols.label + cols.score + 2
  const tierBarW = cols.bar - 6
  doc.setFillColor(255, 255, 255, 0.25)
  doc.setFillColor(255, 255, 255)
  doc.setGState ? null : null
  doc.roundedRect(tierBarX, y + 1.5, tierBarW, 5, 1, 1, 'F')
  doc.setFillColor(...tc)
  doc.roundedRect(tierBarX, y + 1.5, tierBarW * totalPct, 5, 1, 1, 'F')

  y += 8 + 7

  // ═══════════════════════════════════════════════════════════════
  // VOUCHER  +  NEXT STEPS  (two columns)
  // ═══════════════════════════════════════════════════════════════

  const twoH = 40
  const vW = 84       // voucher card width
  const nsX = pad + vW + 4
  const nsW = innerW - vW - 4

  // ── Voucher card ──
  // Blue background
  doc.setFillColor(...C.blue)
  doc.roundedRect(pad, y, vW, twoH, 3, 3, 'F')
  // Maroon right strip
  doc.setFillColor(...C.maroon)
  doc.roundedRect(pad + vW - 34, y, 34, twoH, 3, 3, 'F')
  doc.rect(pad + vW - 34, y, 4, twoH, 'F')   // square off inner edge

  doc.setTextColor(...C.white)

  // Sub-label
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text('YOUR WELLNESS VOUCHER', pad + 4, y + 8)

  // Discount amount
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(tier.voucher, pad + 4, y + 22)
  doc.setFontSize(11)
  const discW = doc.getTextWidth(tier.voucher)
  doc.text(' OFF', pad + 4 + discW, y + 21)

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.text('on VPS Lakeshore wellness package', pad + 4, y + 29)

  // Dotted separator line
  doc.setDrawColor(255, 255, 255, 0.3)
  doc.setDrawColor(200, 220, 255)
  doc.setLineWidth(0.3)
  doc.setLineDashPattern([1, 1], 0)
  doc.line(pad + vW - 34, y + 2, pad + vW - 34, y + twoH - 2)
  doc.setLineDashPattern([], 0)

  // QR code (in maroon panel)
  const qrX = pad + vW - 31
  const qrY = y + 3
  const qrSize = 21
  try {
    const voucherCode = generateVoucherCode(patient, score, tier)
    const qrDataUrl = await QRCode.toDataURL(voucherCode, {
      width: 128, margin: 1,
      color: { dark: '#FFFFFF', light: '#00000000' },
    })
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
  } catch { /* QR failed — silently skip */ }

  doc.setFontSize(5)
  doc.text('Scan to redeem', pad + vW - 21, y + twoH - 2.5, { align: 'center' })

  // ── Next Steps card ──
  doc.setFillColor(...C.bgLight)
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(nsX, y, nsW, twoH, 3, 3, 'FD')

  // Blue top stripe
  doc.setFillColor(...C.blue)
  doc.roundedRect(nsX, y, nsW, 7, 3, 3, 'F')
  doc.rect(nsX, y + 3.5, nsW, 3.5, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('RECOMMENDED NEXT STEPS', nsX + 4, y + 5)

  const stepsByTier = {
    green:  ['Continue your annual wellness check', 'Maintain current lifestyle habits', 'Re-screen in 12 months'],
    amber:  ['Book a preventive health panel', 'Attend lifestyle counselling', 'Re-screen in 6 months'],
    orange: ['Consult a specialist within 4 weeks', 'Complete cancer screening today', 'Re-screen in 3 months'],
    red:    ['Speak with nurse counsellor today', 'Comprehensive NCD package advised', 'Urgent specialist referral'],
  }
  const stepList = stepsByTier[tier.level] || stepsByTier.green

  stepList.forEach((s, i) => {
    const sy = y + 14 + i * 9
    // Numbered badge
    doc.setFillColor(...tc)
    doc.circle(nsX + 7, sy - 0.5, 3, 'F')
    doc.setTextColor(...C.white)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.text(String(i + 1), nsX + 7, sy + 1.2, { align: 'center' })
    // Step text
    doc.setTextColor(...C.midText)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text(s, nsX + 13, sy + 1)
  })

  y += twoH + 7

  // ═══════════════════════════════════════════════════════════════
  // DISCLAIMER
  // ═══════════════════════════════════════════════════════════════

  doc.setFillColor(254, 252, 232)
  doc.setDrawColor(253, 230, 138)
  doc.setLineWidth(0.3)
  doc.roundedRect(pad, y, innerW, 14, 2, 2, 'FD')

  // Left accent
  doc.setFillColor(253, 177, 21)
  doc.roundedRect(pad, y, 3, 14, 2, 2, 'F')
  doc.rect(pad + 1.5, y, 1.5, 14, 'F')

  doc.setTextColor(146, 64, 14)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('DISCLAIMER', pad + 7, y + 5.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.2)
  const disclaimerText = 'This scorecard is for health screening purposes only and does not constitute a clinical diagnosis or medical advice. Please consult a qualified physician for any health concerns. Validated using WHO STEPS NCD risk framework. Data handled per DISHA guidelines.'
  const dLines = doc.splitTextToSize(disclaimerText, innerW - 40)
  doc.text(dLines, pad + 7, y + 10)

  y += 14

  // ═══════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════

  // Signature strip
  const sigY = H - 28
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(pad, sigY, W - pad, sigY)

  const sigLabels = ['Screened By', 'Verified By (Nurse)', 'Programme Coordinator']
  const sigColW = innerW / 3
  sigLabels.forEach((lbl, i) => {
    const sx = pad + i * sigColW
    doc.setFillColor(248, 250, 252)
    doc.rect(sx + 2, sigY + 2, sigColW - 4, 8, 'F')
    doc.setTextColor(...C.lightText)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(lbl, sx + sigColW / 2, sigY + 11, { align: 'center' })
  })

  // Blue footer band
  doc.setFillColor(...C.blue)
  doc.rect(0, H - 14, W, 14, 'F')
  // Maroon accent sliver
  doc.setFillColor(...C.maroon)
  doc.rect(0, H - 14, W, 2, 'F')

  doc.setTextColor(...C.white)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('VPS Lakeshore Hospital · HealthPod Programme', W / 2, H - 9.5, { align: 'center' })
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text('Nettoor P.O., Maradu, Kochi, Kerala 682 040  ·  Tel: +91-484-2701000  ·  healthpod@vpskeralahealthcare.com', W / 2, H - 5.5, { align: 'center' })

  doc.save(`HealthPod_Scorecard_${patient.uhid || 'patient'}.pdf`)
}

// ── Shared page header for page 2+ ─────────────────────────────────────────
function addPageHeader(doc, patient, pageNum, W, pad, logoUrl) {
  doc.setFillColor(27, 117, 188)
  doc.rect(0, 0, W, 3.5, 'F')
  doc.setFillColor(166, 33, 90)
  doc.rect(0, 3.5, W, 1, 'F')

  // Logo.png at correct aspect ratio (495×295) — height 10 mm → width ≈ 16.8 mm
  if (logoUrl) {
    const lh = 10, lw = Math.round(lh * LOGO_W / LOGO_H)
    doc.addImage(logoUrl, 'PNG', pad, 5.5, lw, lh)
  }

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`${patient.name || '—'}  ·  ${patient.uhid || '—'}  ·  HealthPod Full Report`, W / 2, 12, { align: 'center' })
  doc.text(`Page ${pageNum}`, W - pad, 12, { align: 'right' })

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(pad, 16, W - pad, 16)
}

// ── Shared page footer ─────────────────────────────────────────────────────
function addPageFooter(doc, W, H, pad) {
  doc.setFillColor(27, 117, 188)
  doc.rect(0, H - 10, W, 10, 'F')
  doc.setFillColor(166, 33, 90)
  doc.rect(0, H - 10, W, 1.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.text('VPS Lakeshore Hospital · HealthPod Programme · Kochi, Kerala · Tel: +91-484-2701000', W / 2, H - 4.5, { align: 'center' })
  doc.setFontSize(5.5)
  doc.text('This report is for screening purposes only. Does not constitute a clinical diagnosis. Data handled per DISHA guidelines.', W / 2, H - 1.5, { align: 'center' })
}

// ── Comprehensive full report (all 5 sections) ─────────────────────────────
export async function generateFullReport(
  patientRaw, score, tier, domainScores,
  screenings,      // { [typeKey]: screeningRecord }
  referral,        // single referral record or null
  doctorNotes,     // array of note records
  followups,       // array of follow-up records
) {
  const patient = patientRaw || {}
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297, pad = 14
  const innerW = W - pad * 2
  const tc = TIER_C[tier.level] || C.maroon

  const logoUrl = await loadLogoDataUrl()

  // ═══════════════════════════════════════════════════════════════
  // PAGE 1 — Risk Score + Domains + Voucher
  // ═══════════════════════════════════════════════════════════════

  // Top brand stripes
  doc.setFillColor(...C.blue)
  doc.rect(0, 0, W, 4, 'F')
  doc.setFillColor(...C.maroon)
  doc.rect(0, 4, W, 1.2, 'F')

  let y = 8

  // Logo (left) — PNG at correct aspect ratio (495×295 → ~34×20 mm)
  const frlg = logoSize(20)
  if (logoUrl) {
    doc.addImage(logoUrl, 'PNG', pad, y, frlg.w, frlg.h)
  }

  // HealthPod sub-brand pill
  const frHpX = pad + frlg.w + 5, frHpY = y + 2
  doc.setFillColor(240, 247, 255)
  doc.setDrawColor(...C.blue)
  doc.setLineWidth(0.35)
  doc.roundedRect(frHpX, frHpY, 52, 9, 2, 2, 'FD')
  doc.setTextColor(...C.blue)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('HealthPod', frHpX + 5, frHpY + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...C.mutedText)
  doc.text('Screening & Early Detection', frHpX + 5, frHpY + 11.5)

  doc.setTextColor(...C.mutedText)
  doc.setFontSize(6.2)
  doc.setFont('helvetica', 'normal')
  doc.text('Nettoor P.O., Maradu, Kochi, Kerala 682 040', pad, y + 25)
  doc.text('Tel: +91-484-2701000  ·  healthpod@vpskeralahealthcare.com', pad, y + 29.5)

  // Right report info panel
  const rpX = 126, rpW = W - rpX - pad
  doc.setFillColor(...C.bgLight)
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(rpX, y, rpW, 32, 2, 2, 'FD')
  doc.setFillColor(...C.blue)
  doc.roundedRect(rpX, y, rpW, 8, 2, 2, 'F')
  doc.rect(rpX, y + 5, rpW, 3, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('FULL HEALTH REPORT', rpX + rpW / 2, y + 5.5, { align: 'center' })

  function rpRow(label, val, ry) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.lightText); doc.setFontSize(5.8)
    doc.text(label, rpX + 3, ry)
    doc.setTextColor(...C.darkText); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
    doc.text(String(val), rpX + rpW - 3, ry, { align: 'right' })
  }
  rpRow('Date', format(new Date(), 'dd MMM yyyy'), y + 14)
  rpRow('UHID', patient.uhid || '—', y + 20)
  rpRow('Report Ref', `HPR-${(patient.uhid || 'XXXXXX').slice(-6)}`, y + 26)

  y += 38

  doc.setDrawColor(...C.blue)
  doc.setLineWidth(0.7)
  doc.line(pad, y, W - pad, y)
  doc.setDrawColor(...C.maroon)
  doc.setLineWidth(0.3)
  doc.line(pad, y + 0.9, W - pad, y + 0.9)
  y += 6

  // Patient card
  y = sectionHeading(doc, 'PATIENT INFORMATION', y, pad, W)
  doc.setFillColor(...C.bgLight); doc.setDrawColor(...C.border); doc.setLineWidth(0.3)
  doc.roundedRect(pad, y, innerW, 22, 2, 2, 'FD')
  doc.setTextColor(...C.darkText); doc.setFontSize(12); doc.setFont('helvetica', 'bold')
  doc.text(patient.name || '—', pad + 4, y + 9)
  const patDetails = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender || null,
    patient.phone ? `📞 ${patient.phone}` : null,
    patient.camp_name ? `🏕 ${patient.camp_name}` : null,
    patient.district || null,
  ].filter(Boolean)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.mutedText); doc.setFontSize(7.5)
  doc.text(patDetails.join('   ·   '), pad + 4, y + 16.5)
  doc.setFontSize(6.5); doc.setTextColor(...C.lightText)
  doc.text('Screened: ' + format(new Date(), 'dd MMM yyyy'), W - pad - 4, y + 9, { align: 'right' })
  y += 26

  // Risk Score section
  y = sectionHeading(doc, 'NCD HEALTH RISK SCORE', y, pad, W)
  const scH = 46
  doc.setFillColor(...C.white); doc.setDrawColor(...C.border); doc.setLineWidth(0.3)
  doc.roundedRect(pad, y, innerW, scH, 2, 2, 'FD')
  doc.setFillColor(...tc); doc.roundedRect(pad, y, 4, scH, 2, 2, 'F'); doc.rect(pad + 2, y, 2, scH, 'F')
  doc.setTextColor(...tc); doc.setFontSize(42); doc.setFont('helvetica', 'bold')
  doc.text(String(score), pad + 14, y + 24)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.mutedText)
  doc.text('/ 100', pad + 14 + doc.getTextWidth(String(score)) + 1, y + 22)
  const badgeW = 38
  doc.setFillColor(...tc); doc.roundedRect(pad + 14, y + 28, badgeW, 7, 2, 2, 'F')
  doc.setTextColor(...C.white); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
  doc.text((tier.label?.en || '').toUpperCase(), pad + 14 + badgeW / 2, y + 33.5, { align: 'center' })
  const gX = pad + 68, gW = innerW - 68
  const gY = y + 12, gBarH = 7
  const zonesBg = [{ from: 0, to: 40, c: [254, 226, 226] }, { from: 40, to: 60, c: [255, 237, 213] }, { from: 60, to: 80, c: [254, 249, 195] }, { from: 80, to: 100, c: [209, 250, 229] }]
  zonesBg.forEach(z => { const zx = gX + (z.from / 100) * gW; doc.setFillColor(...z.c); doc.rect(zx, gY, ((z.to - z.from) / 100) * gW, gBarH, 'F') })
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3); doc.roundedRect(gX, gY, gW, gBarH, 2, 2, 'D')
  const mX = gX + (score / 100) * gW
  doc.setFillColor(...tc); doc.setLineWidth(0.8); doc.line(mX, gY - 1.5, mX, gY + gBarH + 1.5)
  doc.triangle(mX - 2, gY - 1.5, mX + 2, gY - 1.5, mX, gY + 2, 'F')
  doc.setFontSize(5.2); doc.setFont('helvetica', 'bold')
  ;[{ x: 20, l: 'ACT NOW', c: C.red }, { x: 50, l: 'AT RISK', c: C.orange }, { x: 70, l: 'WATCHFUL', c: C.amber }, { x: 90, l: 'THRIVING', c: C.green }]
    .forEach(z => { doc.setTextColor(...z.c); doc.text(z.l, gX + (z.x / 100) * gW, gY + gBarH + 4, { align: 'center' }) })
  doc.setFontSize(5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.mutedText)
  ;[0, 40, 60, 80, 100].forEach(v => doc.text(String(v), gX + (v / 100) * gW, gY - 2.5, { align: 'center' }))
  doc.setTextColor(...C.midText); doc.setFontSize(7.5); doc.setFont('helvetica', 'italic')
  doc.text(doc.splitTextToSize(tier.message?.en || '', gW), gX, y + 38)
  y += scH + 5

  // Domain table (if available)
  if (domainScores && domainScores.length === 6) {
    y = sectionHeading(doc, 'DOMAIN ANALYSIS', y, pad, W)
    const domains = [
      { label: 'Physical Activity', max: 20 }, { label: 'Nutrition & Diet', max: 20 },
      { label: 'Tobacco & Alcohol', max: 15 }, { label: 'Stress & Sleep', max: 15 },
      { label: 'Biometrics', max: 20 }, { label: 'Screening History', max: 10 },
    ]
    doc.setFillColor(...C.blue); doc.roundedRect(pad, y, innerW, 7, 1.5, 1.5, 'F')
    doc.setTextColor(...C.white); doc.setFontSize(6); doc.setFont('helvetica', 'bold')
    let hx = pad + 3
    ;['DOMAIN', 'SCORE', 'PERFORMANCE', 'ASSESSMENT'].forEach((h, i) => { doc.text(h, hx, y + 5); hx += [54, 22, 62, 44][i] })
    y += 7
    domains.forEach((d, i) => {
      const ds = domainScores[i] ?? 0, pct = d.max > 0 ? ds / d.max : 0
      const bc = pct >= 0.7 ? C.green : pct >= 0.4 ? C.amber : C.red
      const al = pct >= 0.7 ? 'GOOD' : pct >= 0.4 ? 'MODERATE' : 'NEEDS ATTN'
      const rowH = 9
      if (i % 2 === 0) { doc.setFillColor(...C.bgLight); doc.rect(pad, y, innerW, rowH, 'F') }
      doc.setFillColor(...bc); doc.rect(pad, y, 2.5, rowH, 'F')
      doc.setDrawColor(...C.border); doc.setLineWidth(0.2); doc.line(pad, y + rowH, pad + innerW, y + rowH)
      doc.setTextColor(...C.midText); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
      doc.text(d.label, pad + 5, y + 6)
      doc.setTextColor(...bc); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
      doc.text(`${ds}/${d.max}`, pad + 54 + 11, y + 6, { align: 'center' })
      const bX = pad + 54 + 22 + 2, bW = 54
      doc.setFillColor(...C.border); doc.roundedRect(bX, y + 2.5, bW, 4, 1, 1, 'F')
      if (pct > 0) { doc.setFillColor(...bc); doc.roundedRect(bX, y + 2.5, bW * pct, 4, 1, 1, 'F') }
      const aX = bX + bW + 4
      doc.setFillColor(...bc); doc.roundedRect(aX, y + 2, 32, 5, 2.5, 2.5, 'F')
      doc.setTextColor(...C.white); doc.setFontSize(5.5); doc.setFont('helvetica', 'bold')
      doc.text(al, aX + 16, y + 5.8, { align: 'center' })
      y += rowH
    })
    doc.setFillColor(...C.blue); doc.rect(pad, y, innerW, 7, 'F')
    doc.setTextColor(...C.white); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', pad + 5, y + 5); doc.text(`${score} / 100`, pad + 54 + 11, y + 5, { align: 'center' })
    y += 7
  }
  y += 5

  // Voucher + Next Steps
  const twoH = 38, vW = 82, nsX2 = pad + vW + 4, nsW2 = innerW - vW - 4
  doc.setFillColor(...C.blue); doc.roundedRect(pad, y, vW, twoH, 3, 3, 'F')
  doc.setFillColor(...C.maroon); doc.roundedRect(pad + vW - 32, y, 32, twoH, 3, 3, 'F'); doc.rect(pad + vW - 32, y, 4, twoH, 'F')
  doc.setTextColor(...C.white); doc.setFontSize(6); doc.setFont('helvetica', 'normal')
  doc.text('YOUR WELLNESS VOUCHER', pad + 4, y + 8)
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.text(tier.voucher, pad + 4, y + 21)
  doc.setFontSize(10); doc.text(' OFF', pad + 4 + doc.getTextWidth(tier.voucher), y + 20)
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.text('on VPS Lakeshore wellness package', pad + 4, y + 28)
  doc.setLineDashPattern([1, 1], 0); doc.setDrawColor(200, 220, 255); doc.setLineWidth(0.3)
  doc.line(pad + vW - 32, y + 2, pad + vW - 32, y + twoH - 2); doc.setLineDashPattern([], 0)
  try {
    const vc = generateVoucherCode(patient, score, tier)
    const qrDataUrl = await QRCode.toDataURL(vc, { width: 128, margin: 1, color: { dark: '#FFFFFF', light: '#00000000' } })
    doc.addImage(qrDataUrl, 'PNG', pad + vW - 29, y + 3, 20, 20)
  } catch {}
  doc.setFontSize(5); doc.text('Scan to redeem', pad + vW - 19, y + twoH - 2.5, { align: 'center' })
  doc.setFillColor(...C.bgLight); doc.setDrawColor(...C.border); doc.setLineWidth(0.3)
  doc.roundedRect(nsX2, y, nsW2, twoH, 3, 3, 'FD')
  doc.setFillColor(...C.blue); doc.roundedRect(nsX2, y, nsW2, 7, 3, 3, 'F'); doc.rect(nsX2, y + 3.5, nsW2, 3.5, 'F')
  doc.setTextColor(...C.white); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
  doc.text('RECOMMENDED NEXT STEPS', nsX2 + 4, y + 5)
  const stepsByTier = {
    green: ['Continue your annual wellness check', 'Maintain current lifestyle habits', 'Re-screen in 12 months'],
    amber: ['Book a preventive health panel', 'Attend lifestyle counselling', 'Re-screen in 6 months'],
    orange: ['Consult a specialist within 4 weeks', 'Complete cancer screening today', 'Re-screen in 3 months'],
    red: ['Speak with nurse counsellor today', 'Comprehensive NCD package advised', 'Urgent specialist referral'],
  }
  ;(stepsByTier[tier.level] || stepsByTier.green).forEach((s, i) => {
    const sy = y + 14 + i * 8.5
    doc.setFillColor(...tc); doc.circle(nsX2 + 7, sy - 0.5, 3, 'F')
    doc.setTextColor(...C.white); doc.setFontSize(6); doc.setFont('helvetica', 'bold')
    doc.text(String(i + 1), nsX2 + 7, sy + 1.2, { align: 'center' })
    doc.setTextColor(...C.midText); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
    doc.text(s, nsX2 + 13, sy + 1)
  })
  y += twoH + 6

  addPageFooter(doc, W, H, pad)

  // ═══════════════════════════════════════════════════════════════
  // PAGE 2 — Screenings + Referral + Notes + Follow-ups
  // ═══════════════════════════════════════════════════════════════

  doc.addPage()
  addPageHeader(doc, patient, 2, W, pad, logoUrl)
  y = 22

  // ── Screening Results ──────────────────────────────────────────
  y = sectionHeading(doc, 'SCREENING RESULTS', y, pad, W)

  const clinicalTypes = SCREENING_TYPES.filter(st => st.type === 'clinical')
  const visibleTypes = clinicalTypes.filter(st => !st.genderFilter || st.genderFilter.includes(patient.gender) || !patient.gender)
  const clinicalCats = SCREENING_CATEGORIES.filter(cat => cat.key !== 'questionnaire')

  clinicalCats.forEach(cat => {
    const catTypes = visibleTypes.filter(st => st.category === cat.key)
    if (catTypes.length === 0) return

    // Category sub-header
    doc.setFillColor(cat.color ? parseInt(cat.color.slice(1, 3), 16) : 27,
                     cat.color ? parseInt(cat.color.slice(3, 5), 16) : 117,
                     cat.color ? parseInt(cat.color.slice(5, 7), 16) : 188)
    doc.roundedRect(pad, y, innerW, 6, 1, 1, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
    doc.text(`${cat.icon || ''} ${cat.label?.en || cat.key}`.trim(), pad + 4, y + 4.3)
    y += 6

    // Table header
    const colW = { type: 46, method: 40, finding: 54, result: 28, date: innerW - 46 - 40 - 54 - 28 }
    doc.setFillColor(248, 250, 252); doc.rect(pad, y, innerW, 6, 'F')
    doc.setTextColor(...C.mutedText); doc.setFontSize(5.8); doc.setFont('helvetica', 'bold')
    let cx = pad + 2
    ;[['TYPE', colW.type], ['METHOD', colW.method], ['FINDING', colW.finding], ['RESULT', colW.result], ['DATE', colW.date]]
      .forEach(([h, w]) => { doc.text(h, cx, y + 4.3); cx += w })
    y += 6

    catTypes.forEach((st, si) => {
      const s = screenings?.[st.key]
      const done = !!s
      const positive = done && /positive|elevated|refer|suspicious|lesion|abnormal/i.test(s.result || '')
      const rowH = 9

      if (si % 2 === 0) { doc.setFillColor(250, 251, 253); doc.rect(pad, y, innerW, rowH, 'F') }
      doc.setDrawColor(...C.border); doc.setLineWidth(0.2); doc.line(pad, y + rowH, pad + innerW, y + rowH)

      // Status indicator
      if (done) {
        doc.setFillColor(...(positive ? C.red : C.green))
      } else {
        doc.setFillColor(...C.border)
      }
      doc.rect(pad, y, 2.5, rowH, 'F')

      let rx = pad + 3
      // Type
      doc.setTextColor(...C.midText); doc.setFontSize(7); doc.setFont('helvetica', done ? 'bold' : 'normal')
      doc.text((`${st.icon || ''} ${st.label?.en || st.key}`).trim().slice(0, 26), rx, y + 5.5)
      rx += colW.type - 1
      // Method
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.mutedText); doc.setFontSize(6.5)
      doc.text(done ? (st.method?.en || '—') : '—', rx, y + 5.5)
      rx += colW.method
      // Finding
      const findingText = s?.finding ? doc.splitTextToSize(String(s.finding).slice(0, 45), colW.finding - 2) : ['—']
      doc.setTextColor(...C.midText)
      doc.text(findingText[0] || '—', rx, y + 5.5)
      rx += colW.finding
      // Result
      if (done) {
        doc.setTextColor(...(positive ? C.red : C.green))
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5)
        doc.text((positive ? '⚠ ' : '✓ ') + (s.result || '').slice(0, 16), rx, y + 5.5)
      } else {
        doc.setTextColor(...C.lightText); doc.setFontSize(6)
        doc.text('Not done', rx, y + 5.5)
      }
      rx += colW.result
      // Date
      doc.setTextColor(...C.lightText); doc.setFont('helvetica', 'normal'); doc.setFontSize(6)
      doc.text(s?.created_at ? format(new Date(s.created_at), 'dd MMM yy') : '—', rx, y + 5.5)

      y += rowH
    })
    y += 3
  })

  // Screening summary badge
  const doneCount = visibleTypes.filter(st => !!screenings?.[st.key]).length
  const positiveCount = visibleTypes.filter(st => {
    const s = screenings?.[st.key]
    return s && /positive|elevated|refer|suspicious|lesion|abnormal/i.test(s.result || '')
  }).length
  doc.setFillColor(...C.bgLight); doc.setDrawColor(...C.border); doc.setLineWidth(0.3)
  doc.roundedRect(pad, y, innerW, 10, 2, 2, 'FD')
  doc.setTextColor(...C.midText); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
  doc.text(`${doneCount} of ${visibleTypes.length} screenings completed`, pad + 4, y + 6.5)
  if (positiveCount > 0) {
    doc.setTextColor(...C.red); doc.setFont('helvetica', 'bold')
    doc.text(`⚠ ${positiveCount} actionable result${positiveCount > 1 ? 's' : ''} — follow-up recommended`, W - pad - 4, y + 6.5, { align: 'right' })
  } else if (doneCount > 0) {
    doc.setTextColor(...C.green); doc.setFont('helvetica', 'bold')
    doc.text('✓ All results within normal range', W - pad - 4, y + 6.5, { align: 'right' })
  }
  y += 14

  // ── Referral ───────────────────────────────────────────────────
  if (referral) {
    y = sectionHeading(doc, 'REFERRAL DETAILS', y, pad, W)
    const isPriority = referral.priority === 'urgent'
    doc.setFillColor(isPriority ? 255 : 240, isPriority ? 241 : 249, isPriority ? 242 : 255)
    doc.setFillColor(isPriority ? 255 : 240, isPriority ? 241 : 249, isPriority ? 242 : 240)
    doc.setFillColor(...(isPriority ? [255, 241, 242] : [240, 249, 255]))
    doc.setDrawColor(...(isPriority ? C.red : C.blue)); doc.setLineWidth(0.4)
    const refH = 22
    doc.roundedRect(pad, y, innerW, refH, 2, 2, 'FD')
    doc.setFillColor(...(isPriority ? C.red : C.blue)); doc.roundedRect(pad, y, 3.5, refH, 2, 2, 'F'); doc.rect(pad + 2, y, 1.5, refH, 'F')
    doc.setTextColor(...C.darkText); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold')
    doc.text(`${isPriority ? '🔴' : '🟢'} ${referral.department || 'Department not specified'}`, pad + 7, y + 8)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.midText)
    if (referral.reason) doc.text(`Reason: ${referral.reason}`, pad + 7, y + 14)
    if (referral.notes) doc.text(`Notes: ${referral.notes}`, pad + 7, y + 19)
    doc.setTextColor(...(isPriority ? C.red : C.blue)); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
    doc.text(isPriority ? 'URGENT' : 'ROUTINE', W - pad - 4, y + 8, { align: 'right' })
    y += refH + 6
  }

  // ── Doctor Notes ───────────────────────────────────────────────
  if (doctorNotes && doctorNotes.length > 0) {
    y = sectionHeading(doc, 'CLINICAL NOTES', y, pad, W)
    doctorNotes.slice(0, 3).forEach((n, ni) => {
      const noteH = [n.clinical_assessment, n.diagnosis, n.treatment_plan].filter(Boolean).length * 7 + 13
      doc.setFillColor(...C.bgLight); doc.setDrawColor(...C.border); doc.setLineWidth(0.3)
      doc.roundedRect(pad, y, innerW, noteH, 2, 2, 'FD')
      doc.setFillColor(...C.blue); doc.roundedRect(pad, y, 3.5, noteH, 2, 2, 'F'); doc.rect(pad + 2, y, 1.5, noteH, 'F')
      doc.setTextColor(...C.darkText); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
      doc.text(`Dr. ${n.doctor_name || 'Physician'}`, pad + 7, y + 7)
      doc.setTextColor(...C.lightText); doc.setFontSize(6); doc.setFont('helvetica', 'normal')
      doc.text(n.created_at ? format(new Date(n.created_at), 'dd MMM yyyy') : '', W - pad - 4, y + 7, { align: 'right' })
      let ny = y + 12
      if (n.clinical_assessment) { doc.setTextColor(...C.mutedText); doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.text('Assessment:', pad + 7, ny); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.midText); doc.setFontSize(7); doc.text(n.clinical_assessment.slice(0, 90), pad + 30, ny); ny += 7 }
      if (n.diagnosis) { doc.setTextColor(...C.mutedText); doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.text('Diagnosis:', pad + 7, ny); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.midText); doc.setFontSize(7); doc.text(n.diagnosis.slice(0, 90), pad + 28, ny); ny += 7 }
      if (n.treatment_plan) { doc.setTextColor(...C.mutedText); doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.text('Plan:', pad + 7, ny); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.midText); doc.setFontSize(7); doc.text(n.treatment_plan.slice(0, 90), pad + 20, ny) }
      y += noteH + 4
    })
  }

  // ── Follow-ups ─────────────────────────────────────────────────
  if (followups && followups.length > 0) {
    y = sectionHeading(doc, 'FOLLOW-UP SCHEDULE', y, pad, W)
    const today = new Date().toISOString().split('T')[0]
    followups.slice(0, 5).forEach(fu => {
      const overdue = fu.followup_date < today && fu.status !== 'completed'
      const done = fu.status === 'completed'
      const rowColor = done ? [240, 253, 244] : overdue ? [255, 241, 242] : [248, 250, 252]
      const borderColor = done ? C.green : overdue ? C.red : C.border
      doc.setFillColor(...rowColor); doc.setDrawColor(...borderColor); doc.setLineWidth(0.3)
      doc.roundedRect(pad, y, innerW, 10, 2, 2, 'FD')
      doc.setFillColor(...(done ? C.green : overdue ? C.red : C.blue))
      doc.roundedRect(pad, y, 3.5, 10, 2, 2, 'F'); doc.rect(pad + 2, y, 1.5, 10, 'F')
      doc.setTextColor(...C.darkText); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
      const dateStr = fu.followup_date ? format(new Date(fu.followup_date + 'T12:00:00'), 'dd MMM yyyy') : '—'
      doc.text(dateStr, pad + 7, y + 6.5)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.midText); doc.setFontSize(7)
      if (fu.reason) doc.text(fu.reason.slice(0, 60), pad + 34, y + 6.5)
      if (fu.assigned_to) doc.text(`— ${fu.assigned_to}`, W - pad - 30, y + 6.5)
      const statusLabel = done ? '✓ Complete' : overdue ? '⚠ Overdue' : 'Scheduled'
      doc.setTextColor(...(done ? C.green : overdue ? C.red : C.blue)); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5)
      doc.text(statusLabel, W - pad - 4, y + 6.5, { align: 'right' })
      y += 13
    })
  }

  // ── Signature lines ────────────────────────────────────────────
  y = Math.max(y, H - 50)
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3); doc.line(pad, y, W - pad, y)
  const sigW = innerW / 3
  ;['Screened By', 'Verified By (Nurse)', 'Programme Coordinator'].forEach((lbl, i) => {
    const sx = pad + i * sigW
    doc.setFillColor(248, 250, 252); doc.rect(sx + 2, y + 2, sigW - 4, 8, 'F')
    doc.setTextColor(...C.lightText); doc.setFontSize(6); doc.setFont('helvetica', 'normal')
    doc.text(lbl, sx + sigW / 2, y + 11, { align: 'center' })
  })

  addPageFooter(doc, W, H, pad)

  doc.save(`HealthPod_FullReport_${patient.uhid || 'patient'}.pdf`)
}
