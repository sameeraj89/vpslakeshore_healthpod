import jsPDF from 'jspdf'
import { format } from 'date-fns'
import QRCode from 'qrcode'
import { generateVoucherCode } from './riskConfig'

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

// Loads /logo.svg → PNG data-URL via an off-screen canvas
async function loadLogoDataUrl() {
  try {
    const res = await fetch('/logo.svg')
    const svgText = await res.text()
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    return await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 560; canvas.height = 130
        canvas.getContext('2d').drawImage(img, 0, 0, 560, 130)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
      img.src = url
    })
  } catch { return null }
}

// ── Main export ────────────────────────────────────────────────────────────

export async function generateScorecard(patient, score, tier, domainScores) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297, pad = 14
  const tc = TIER_C[tier.level] || C.maroon
  const innerW = W - pad * 2   // 182 mm

  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════

  // Top brand stripe
  doc.setFillColor(...C.blue)
  doc.rect(0, 0, W, 3.5, 'F')

  // Logo (left)
  let y = 7
  const logoUrl = await loadLogoDataUrl()
  if (logoUrl) {
    doc.addImage(logoUrl, 'PNG', pad, y, 74, 17)
  } else {
    doc.setTextColor(...C.maroon)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
    doc.text('vps', pad, y + 10)
    doc.setTextColor(...C.blue)
    doc.text(' Lakeshore', pad + 12, y + 10)
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
    doc.text('Medical Centre', pad + 12, y + 15)
  }

  // Hospital address sub-line
  doc.setTextColor(...C.mutedText)
  doc.setFontSize(6.2)
  doc.setFont('helvetica', 'normal')
  doc.text('Global Lifecare · Nettoor P.O., Maradu, Kochi, Kerala 682 040', pad, y + 23)
  doc.text('Tel: +91-484-2701000  ·  healthpod@vpskeralahealthcare.com', pad, y + 27.5)

  // Right info panel
  const rpX = 130, rpW = W - rpX - pad
  doc.setFillColor(...C.bgLight)
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(rpX, y, rpW, 30, 2, 2, 'FD')

  doc.setFillColor(...C.blue)
  doc.roundedRect(rpX, y, rpW, 7, 2, 2, 'F')
  doc.rect(rpX, y + 4, rpW, 3, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('NCD HEALTH RISK SCORECARD', rpX + rpW / 2, y + 4.8, { align: 'center' })

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
  rpRow('Report Date', format(new Date(), 'dd MMM yyyy'), y + 12.5)
  rpRow('UHID', patient.uhid || '—', y + 18.5)
  rpRow('Report Ref', `HPR-${(patient.uhid || 'XXXXXX').slice(-6)}`, y + 24.5)

  y += 34

  // Header / content divider
  doc.setDrawColor(...C.blue)
  doc.setLineWidth(0.6)
  doc.line(pad, y, W - pad, y)
  y += 6

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
  doc.text('VPS Lakeshore Hospital · Global Lifecare', W / 2, H - 9.5, { align: 'center' })
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text('Nettoor P.O., Maradu, Kochi, Kerala 682 040  ·  Tel: +91-484-2701000  ·  healthpod@vpskeralahealthcare.com', W / 2, H - 5.5, { align: 'center' })

  doc.save(`HealthPod_Scorecard_${patient.uhid || 'patient'}.pdf`)
}
