/**
 * DHIS2 Tracker export — TrackedEntityInstance format
 *
 * Before using: map your DHIS2 org unit UID and attribute UIDs below.
 * Kerala HMIS: https://hmis.kerala.gov.in
 * Default UIDs here are placeholders — replace with your programme's UIDs.
 */

const DHIS2_CONFIG = {
  // Replace with your DHIS2 org unit UID (hospital/camp level)
  orgUnit: 'LAKESHORE_OU',
  // Replace with your DHIS2 program UID
  program: 'HEALTHPOD_PROG',
  // TrackedEntityType UID (usually "Person" in DHIS2)
  trackedEntityType: 'MCPQUTHX1Ze',
  // Attribute UIDs — replace with your DHIS2 instance's attribute UIDs
  attributes: {
    uhid:         'w75KJ2mc4zz',
    name:         'zDhUuAYrxNC',
    dob:          'iESIqZ0R0R0',
    gender:       'Bpx9n0Nnq2O',
    phone:        'P2cwLGskgxn',
    abha_number:  'ABHA_NUMBER',
    district:     'VUvgVao8Y5z',
    camp:         'CAMP_NAME_AT',
  },
  // Program stage UIDs for each cancer screening
  stages: {
    risk_assessment: 'RISK_STAGE',
    oral:     'ORAL_STAGE',
    breast:   'BREAST_STAGE',
    cervix:   'CERVIX_STAGE',
    colon:    'COLON_STAGE',
    prostate: 'PROSTATE_STAGE',
  },
  // Data element UIDs per stage
  dataElements: {
    risk_score:   'RISK_SCORE_DE',
    risk_level:   'RISK_LEVEL_DE',
    finding:      'FINDING_DE',
    result:       'RESULT_DE',
    notes:        'NOTES_DE',
  },
}

function toTEI(patient, screenings) {
  const attrs = [
    { attribute: DHIS2_CONFIG.attributes.uhid,     value: patient.uhid || '' },
    { attribute: DHIS2_CONFIG.attributes.name,     value: patient.name || '' },
    { attribute: DHIS2_CONFIG.attributes.dob,      value: patient.dob || '' },
    { attribute: DHIS2_CONFIG.attributes.gender,   value: patient.gender || '' },
    { attribute: DHIS2_CONFIG.attributes.phone,    value: patient.phone || '' },
    { attribute: DHIS2_CONFIG.attributes.district, value: patient.district || '' },
    { attribute: DHIS2_CONFIG.attributes.camp,     value: patient.camp_name || '' },
  ]
  if (patient.abha_number) {
    attrs.push({ attribute: DHIS2_CONFIG.attributes.abha_number, value: patient.abha_number })
  }

  const events = []

  // Risk assessment event
  if (patient.risk_score != null) {
    events.push({
      program: DHIS2_CONFIG.program,
      programStage: DHIS2_CONFIG.stages.risk_assessment,
      orgUnit: DHIS2_CONFIG.orgUnit,
      eventDate: patient.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      status: 'COMPLETED',
      dataValues: [
        { dataElement: DHIS2_CONFIG.dataElements.risk_score, value: String(patient.risk_score) },
        { dataElement: DHIS2_CONFIG.dataElements.risk_level, value: patient.risk_level || '' },
      ],
    })
  }

  // Screening events
  const TYPES = ['oral', 'breast', 'cervix', 'colon', 'prostate']
  TYPES.forEach(type => {
    const sc = screenings.find(s => s.patient_id === patient.id && s.cancer_type === type)
    if (!sc) return
    events.push({
      program: DHIS2_CONFIG.program,
      programStage: DHIS2_CONFIG.stages[type],
      orgUnit: DHIS2_CONFIG.orgUnit,
      eventDate: sc.screened_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      status: 'COMPLETED',
      dataValues: [
        { dataElement: DHIS2_CONFIG.dataElements.finding, value: sc.finding || '' },
        { dataElement: DHIS2_CONFIG.dataElements.result,  value: sc.result || '' },
        { dataElement: DHIS2_CONFIG.dataElements.notes,   value: sc.notes || '' },
      ],
    })
  })

  return {
    trackedEntityType: DHIS2_CONFIG.trackedEntityType,
    orgUnit: DHIS2_CONFIG.orgUnit,
    attributes: attrs,
    enrollments: [{
      program: DHIS2_CONFIG.program,
      orgUnit: DHIS2_CONFIG.orgUnit,
      enrollmentDate: patient.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      incidentDate: patient.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      events,
    }],
  }
}

export function exportDHIS2(patients, screenings) {
  const payload = {
    trackedEntityInstances: patients.map(p => toTEI(p, screenings)),
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `HealthPod_DHIS2_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)

  return payload.trackedEntityInstances.length
}
