import { describe, it, expect } from 'vitest'
import { getTier, SCORE_TIERS, DOMAINS, generateVoucherCode } from './riskConfig'

describe('getTier', () => {
  it('returns red tier for score 0', () => {
    expect(getTier(0).level).toBe('red')
  })

  it('returns red tier for score 39 (boundary)', () => {
    expect(getTier(39).level).toBe('red')
  })

  it('returns orange tier for score 40 (boundary)', () => {
    expect(getTier(40).level).toBe('orange')
  })

  it('returns orange tier for score 59 (boundary)', () => {
    expect(getTier(59).level).toBe('orange')
  })

  it('returns amber tier for score 60 (boundary)', () => {
    expect(getTier(60).level).toBe('amber')
  })

  it('returns amber tier for score 79 (boundary)', () => {
    expect(getTier(79).level).toBe('amber')
  })

  it('returns green tier for score 80 (boundary)', () => {
    expect(getTier(80).level).toBe('green')
  })

  it('returns green tier for score 100 (boundary)', () => {
    expect(getTier(100).level).toBe('green')
  })

  it('returns mid-range values correctly', () => {
    expect(getTier(20).level).toBe('red')
    expect(getTier(50).level).toBe('orange')
    expect(getTier(70).level).toBe('amber')
    expect(getTier(90).level).toBe('green')
  })

  it('falls back to red tier for out-of-range score', () => {
    expect(getTier(-1).level).toBe('red')
    expect(getTier(101).level).toBe('red')
  })

  it('each tier has required display fields', () => {
    SCORE_TIERS.forEach(tier => {
      expect(tier).toHaveProperty('level')
      expect(tier).toHaveProperty('color')
      expect(tier).toHaveProperty('label.en')
      expect(tier).toHaveProperty('message.en')
      expect(tier).toHaveProperty('voucher')
    })
  })
})

describe('DOMAINS — fact field data integrity', () => {
  it('every question has a bilingual fact field', () => {
    DOMAINS.forEach(domain => {
      domain.questions.forEach(q => {
        expect(q.fact, `${domain.key}.${q.key} missing fact`).toBeDefined()
        expect(typeof q.fact.en, `${domain.key}.${q.key} fact.en not a string`).toBe('string')
        expect(typeof q.fact.ml, `${domain.key}.${q.key} fact.ml not a string`).toBe('string')
        expect(q.fact.en.length, `${domain.key}.${q.key} fact.en is empty`).toBeGreaterThan(0)
        expect(q.fact.ml.length, `${domain.key}.${q.key} fact.ml is empty`).toBeGreaterThan(0)
      })
    })
  })
})

describe('generateVoucherCode', () => {
  it('produces HP-{TierInitial}{Score}-{UHID}-{YYMMDD} format', () => {
    const patient = { uhid: 'LH123' }
    const tier = { level: 'green' }
    const code = generateVoucherCode(patient, 85, tier)
    expect(code).toMatch(/^HP-G85-LH123-\d{6}$/)
  })

  it('falls back to GUEST when patient has no uhid', () => {
    const tier = { level: 'amber' }
    const code = generateVoucherCode({}, 65, tier)
    expect(code).toMatch(/^HP-A65-GUEST-\d{6}$/)
  })

  it('uses correct tier initial for each tier level', () => {
    const tiers = [
      { level: 'green', initial: 'G' },
      { level: 'amber', initial: 'A' },
      { level: 'orange', initial: 'O' },
      { level: 'red', initial: 'R' },
    ]
    tiers.forEach(({ level, initial }) => {
      const code = generateVoucherCode({ uhid: 'X' }, 50, { level })
      expect(code.startsWith(`HP-${initial}`)).toBe(true)
    })
  })
})
