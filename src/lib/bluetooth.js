// Web Bluetooth helpers for biometric device reads (GATT standard profiles)

export function isSupported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth
}

// Parse SFLOAT (IEEE 11073-20601 SFLOAT-Type)
function sfloat(raw) {
  const exp = raw >> 12
  const mant = raw & 0x0FFF
  const signedMant = mant >= 0x800 ? mant - 0x1000 : mant
  const e = exp >= 8 ? exp - 16 : exp
  return signedMant * Math.pow(10, e)
}

// Wait for a single BLE notification with timeout
function waitNotification(char, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      char.stopNotifications().catch(() => {})
      reject(new Error('No reading received within 30 seconds'))
    }, timeoutMs)
    char.addEventListener('characteristicvaluechanged', e => {
      clearTimeout(timer)
      resolve(e.target.value)
    }, { once: true })
  })
}

// Blood Pressure Monitor — GATT Blood Pressure service (0x1810)
export async function readBP() {
  if (!isSupported()) throw new Error('Web Bluetooth not available in this browser')
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [0x1810] }],
    optionalServices: [0x1810],
  })
  const server = await device.gatt.connect()
  const service = await server.getPrimaryService(0x1810)
  const char = await service.getCharacteristic(0x2A35)
  await char.startNotifications()
  const dv = await waitNotification(char)
  await char.stopNotifications().catch(() => {})
  server.disconnect()

  const kpa = !!(dv.getUint8(0) & 0x01)
  const sys = sfloat(dv.getUint16(1, true))
  const dia = sfloat(dv.getUint16(3, true))
  const factor = kpa ? 7.5006 : 1
  return { systolic: Math.round(sys * factor), diastolic: Math.round(dia * factor) }
}

// Pulse Oximeter — GATT Pulse Oximetry service (0x1822)
export async function readSpO2() {
  if (!isSupported()) throw new Error('Web Bluetooth not available in this browser')
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [0x1822] }],
    optionalServices: [0x1822],
  })
  const server = await device.gatt.connect()
  const service = await server.getPrimaryService(0x1822)
  const char = await service.getCharacteristic(0x2A5F)
  await char.startNotifications()
  const dv = await waitNotification(char)
  await char.stopNotifications().catch(() => {})
  server.disconnect()

  const pct = Math.round(sfloat(dv.getUint16(1, true)))
  return { spo2: pct }
}

// Weight Scale — GATT Weight Scale service (0x181D)
export async function readWeight() {
  if (!isSupported()) throw new Error('Web Bluetooth not available in this browser')
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [0x181D] }],
    optionalServices: [0x181D],
  })
  const server = await device.gatt.connect()
  const service = await server.getPrimaryService(0x181D)
  const char = await service.getCharacteristic(0x2A9D)
  await char.startNotifications()
  const dv = await waitNotification(char)
  await char.stopNotifications().catch(() => {})
  server.disconnect()

  const imperial = !!(dv.getUint8(0) & 0x01)
  const raw = dv.getUint16(1, true)
  const kg = imperial ? raw * 0.01 * 0.453592 : raw * 0.005
  return { kg: Math.round(kg * 10) / 10 }
}

// Glucose Meter — GATT Glucose service (0x1808)
export async function readGlucose() {
  if (!isSupported()) throw new Error('Web Bluetooth not available in this browser')
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [0x1808] }],
    optionalServices: [0x1808],
  })
  const server = await device.gatt.connect()
  const service = await server.getPrimaryService(0x1808)
  const char = await service.getCharacteristic(0x2A18)
  await char.startNotifications()
  const dv = await waitNotification(char)
  await char.stopNotifications().catch(() => {})
  server.disconnect()

  // Glucose Measurement: flags(1) + seqNum(2) + [baseTime(7)] + concentration
  const flags = dv.getUint8(0)
  const offset = (flags & 0x01) ? 10 : 3
  const raw = dv.getUint16(offset, true)
  const mmolL = sfloat(raw) * 1000 // mol/L → mmol/L
  // Convert mol/L to mg/dL: most BT glucometers report in mol/L
  const mgdl = Math.round(mmolL * 18)
  return { mgdl }
}

// ─── Classification to riskConfig option labels ───────────────────────────────

export function classifyBP(sys, dia) {
  if (sys < 120 && dia < 80) return 'Normal (<120/80)'
  if (sys >= 120 && sys <= 129 && dia < 80) return 'Elevated (120–129/<80)'
  if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return 'High (130–139/80–89)'
  return 'Very high (≥140/90)'
}

export function classifySpO2(pct) {
  if (pct >= 98) return '98–100% (Normal)'
  if (pct >= 95) return '95–97% (Acceptable)'
  if (pct >= 92) return '92–94% (Low-normal)'
  return 'Below 92% (Concerning)'
}

export function classifyBMI(bmi) {
  if (bmi < 18.5) return 'Underweight (BMI <18.5)'
  if (bmi < 25) return 'Normal (BMI 18.5–24.9)'
  if (bmi < 30) return 'Overweight (BMI 25–29.9)'
  return 'Obese (BMI ≥30)'
}

export function classifyGlucose(mgdl) {
  if (mgdl < 100) return 'Normal (fasting <100)'
  if (mgdl <= 125) return 'Pre-diabetic (100–125)'
  return 'Diabetic (≥126)'
}
