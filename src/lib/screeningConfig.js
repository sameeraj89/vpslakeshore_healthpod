// HealthPod Screening Configuration
// To add a new screening type: add one entry to SCREENING_TYPES. No other files need changes.

export const SCREENING_CATEGORIES = [
  { key: 'cancer',        label: { en: 'Cancer Screening',          ml: 'കാൻസർ സ്ക്രീനിംഗ്' },          icon: '🔬', color: '#A6215A' },
  { key: 'ncd',           label: { en: 'NCD & Vitals',              ml: 'NCD & ജീവൽ ക്രിയകൾ' },          icon: '🩺', color: '#1B75BC' },
  { key: 'questionnaire', label: { en: 'Validated Questionnaires',  ml: 'അംഗീകൃത ചോദ്യാവലി' },          icon: '📋', color: '#7c3aed' },
]

export const SCREENING_TYPES = [

  // ─── CANCER ─────────────────────────────────────────────────────────────────

  {
    key: 'oral',
    category: 'cancer',
    label: { en: 'Oral Cancer', ml: 'വായ്-അർബുദ സ്ക്രീനിംഗ്' },
    icon: '👄',
    color: '#e67e22',
    method: { en: 'OVE (Oral Visual Examination)', ml: 'OVE (വാക്ക് ദൃശ്യ പരിശോധന)' },
    type: 'clinical',
    allowImages: true,
    fields: [
      {
        key: 'finding', label: 'Examination Finding', type: 'radio', required: true,
        options: [
          'Normal oral mucosa',
          'Leukoplakia (white patch)',
          'Erythroplakia (red patch)',
          'Submucous fibrosis (OSMF)',
          'Ulcer / non-healing wound',
          'Suspicious lesion',
          'Growth / mass',
        ],
      },
      {
        key: 'result', label: 'Overall Result / Recommendation', type: 'select', required: true,
        options: ['Negative', 'Suspicious — monitor', 'Positive — refer immediately'],
      },
      { key: 'notes', label: 'Clinical Notes', type: 'textarea', placeholder: 'Location, size, duration…' },
    ],
    isPositive: d => /positive|suspicious|refer/i.test(d.result || ''),
  },

  {
    key: 'breast',
    category: 'cancer',
    label: { en: 'Breast Cancer', ml: 'സ്തനഅർബുദ സ്ക്രീനിംഗ്' },
    icon: '🩷',
    color: '#e91e8c',
    method: { en: 'CBE (Clinical Breast Examination)', ml: 'CBE (ക്ലിനിക്കൽ സ്തന പരിശോധന)' },
    type: 'clinical',
    allowImages: true,
    genderFilter: ['Female'],
    fields: [
      {
        key: 'finding', label: 'Examination Finding', type: 'radio', required: true,
        options: ['Normal', 'Lump / mass felt', 'Nipple discharge', 'Skin changes', 'Asymmetry', 'Axillary lymph nodes palpable'],
      },
      {
        key: 'result', label: 'Overall Result', type: 'select', required: true,
        options: ['Negative', 'Inconclusive — rescan', 'Positive — refer'],
      },
      { key: 'notes', label: 'Clinical Notes', type: 'textarea', placeholder: 'Location, size, consistency, mobility…' },
    ],
    isPositive: d => /positive|refer/i.test(d.result || ''),
  },

  {
    key: 'cervix',
    category: 'cancer',
    label: { en: 'Cervical Cancer', ml: 'ഗർഭ-അർബുദ സ്ക്രീനിംഗ്' },
    icon: '🔴',
    color: '#9b59b6',
    method: { en: 'VIA / VILI', ml: 'VIA / VILI' },
    type: 'clinical',
    allowImages: true,
    genderFilter: ['Female'],
    fields: [
      {
        key: 'finding', label: 'Examination Finding', type: 'radio', required: true,
        options: [
          'Normal (VIA negative)',
          'VIA positive — acetowhite lesion',
          'VILI positive — mustard/saffron lesion',
          'Suspicious growth',
          'HPV result: positive',
          'HPV result: negative',
        ],
      },
      {
        key: 'result', label: 'Overall Result', type: 'select', required: true,
        options: ['Negative', 'VIA/VILI Positive — refer for colposcopy', 'Suspicious — immediate referral'],
      },
      { key: 'notes', label: 'Clinical Notes', type: 'textarea', placeholder: 'Size of lesion, zone, other findings…' },
    ],
    isPositive: d => /positive|refer/i.test(d.result || ''),
  },

  {
    key: 'colon',
    category: 'cancer',
    label: { en: 'Colorectal Cancer', ml: 'കൊളൊറെക്റ്റൽ കാൻസർ' },
    icon: '🟢',
    color: '#27ae60',
    method: { en: 'FOBT (Faecal Occult Blood Test)', ml: 'FOBT (മലരക്ത പരിശോധന)' },
    type: 'clinical',
    fields: [
      {
        key: 'finding', label: 'Examination Finding', type: 'radio', required: true,
        options: ['FOBT: Negative', 'FOBT: Positive', 'Blood in stool (visible)', 'Change in bowel habits noted'],
      },
      {
        key: 'result', label: 'Overall Result', type: 'select', required: true,
        options: ['Negative', 'FOBT Positive — refer for colonoscopy', 'Symptomatic — refer'],
      },
      { key: 'notes', label: 'Clinical Notes', type: 'textarea', placeholder: 'Any symptoms, family history…' },
    ],
    isPositive: d => /positive|refer/i.test(d.result || ''),
  },

  {
    key: 'prostate',
    category: 'cancer',
    label: { en: 'Prostate Cancer', ml: 'പ്രോസ്റ്റേറ്റ് കാൻസർ' },
    icon: '🔵',
    color: '#2980b9',
    method: { en: 'PSA (Prostate Specific Antigen)', ml: 'PSA (പ്രോസ്റ്റേറ്റ് സ്പെസിഫിക് ആൻ്റിജൻ)' },
    type: 'clinical',
    genderFilter: ['Male'],
    fields: [
      {
        key: 'finding', label: 'Examination Finding', type: 'radio', required: true,
        options: [
          'PSA < 4 ng/mL (normal)',
          'PSA 4–10 ng/mL (borderline)',
          'PSA > 10 ng/mL (elevated)',
          'DRE: Normal',
          'DRE: Enlarged / nodular',
        ],
      },
      { key: 'psa_value', label: 'PSA Value (ng/mL)', type: 'number', placeholder: 'e.g. 3.8', min: 0, max: 1000, step: 0.01 },
      {
        key: 'result', label: 'Overall Result', type: 'select', required: true,
        options: ['PSA Normal (<4)', 'PSA Borderline (4–10) — retest in 3 months', 'PSA Elevated (>10) — refer urology'],
      },
      { key: 'notes', label: 'Clinical Notes', type: 'textarea', placeholder: 'PSA value, DRE findings…' },
    ],
    isPositive: d => /elevated|refer/i.test(d.result || ''),
  },

  {
    key: 'lung',
    category: 'cancer',
    label: { en: 'Lung Cancer', ml: 'ശ്വാസകോശ കാൻസർ' },
    icon: '🫁',
    color: '#0891b2',
    method: { en: 'Sputum Cytology / CXR Ref.', ml: 'തുപ്പൽ കോശ / CXR' },
    type: 'clinical',
    fields: [
      {
        key: 'finding', label: 'Clinical Finding', type: 'radio', required: true,
        options: [
          'No symptoms — screen negative',
          'Persistent cough (>3 weeks)',
          'Haemoptysis (blood in sputum)',
          'Unexplained weight loss + cough',
          'Chest pain / breathlessness',
        ],
      },
      {
        key: 'result', label: 'Screening Outcome', type: 'select', required: true,
        options: [
          'Negative — low risk',
          'Intermediate — refer for chest X-ray',
          'High risk — urgent chest clinic referral',
        ],
      },
      { key: 'notes', label: 'Clinical Notes', type: 'textarea', placeholder: 'Tobacco history, pack-years, duration of symptoms…' },
    ],
    isPositive: d => /refer|high risk/i.test(d.result || ''),
  },

  // ─── NCD & VITALS ────────────────────────────────────────────────────────────

  {
    key: 'hypertension',
    category: 'ncd',
    label: { en: 'Hypertension', ml: 'രക്തസമ്മർദ്ദം' },
    icon: '🩺',
    color: '#1B75BC',
    method: { en: 'BP Measurement', ml: 'BP അളക്കൽ' },
    type: 'clinical',
    fields: [
      { key: 'systolic', label: 'Systolic (mmHg)', type: 'number', placeholder: '120', min: 60, max: 260, required: true },
      { key: 'diastolic', label: 'Diastolic (mmHg)', type: 'number', placeholder: '80', min: 40, max: 160, required: true },
      {
        key: 'result', label: 'BP Category', type: 'select', required: true,
        options: [
          'Normal (<120/80)',
          'Elevated (120–129 / <80)',
          'Stage 1 (130–139 / 80–89)',
          'Stage 2 (≥140 / ≥90)',
          'Hypertensive Crisis (≥180 / ≥120) — refer emergency',
        ],
      },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'On medication? Reading taken after rest?' },
    ],
    isPositive: d => /stage 2|crisis|refer/i.test(d.result || ''),
    computeResult: d => {
      const s = parseInt(d.systolic), di = parseInt(d.diastolic)
      if (!s || !di) return ''
      if (s >= 180 || di >= 120) return 'Hypertensive Crisis (≥180 / ≥120) — refer emergency'
      if (s >= 140 || di >= 90) return 'Stage 2 (≥140 / ≥90)'
      if (s >= 130 || di >= 80) return 'Stage 1 (130–139 / 80–89)'
      if (s >= 120 && di < 80) return 'Elevated (120–129 / <80)'
      return 'Normal (<120/80)'
    },
  },

  {
    key: 'diabetes',
    category: 'ncd',
    label: { en: 'Diabetes / Blood Glucose', ml: 'പ്രമേഹം / രക്ത ഗ്ലൂക്കോസ്' },
    icon: '🩸',
    color: '#e67e22',
    method: { en: 'RBS / FBS / HbA1c', ml: 'RBS / FBS / HbA1c' },
    type: 'clinical',
    fields: [
      {
        key: 'test_type', label: 'Test Type', type: 'radio', required: true,
        options: ['Fasting blood sugar (FBS)', 'Random blood sugar (RBS)', 'Post-prandial (PPBS)', 'HbA1c (%)'],
      },
      { key: 'glucose_value', label: 'Value (mg/dL or %)', type: 'number', placeholder: '110', min: 20, max: 800, step: 0.1, required: true },
      {
        key: 'result', label: 'Interpretation', type: 'select', required: true,
        options: [
          'Normal',
          'Pre-diabetic — lifestyle counselling',
          'Diabetic — refer for management',
          'Hypoglycaemia — immediate management needed',
        ],
      },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Known diabetic? On medication? Fasting hours…' },
    ],
    isPositive: d => /diabetic|refer|hypoglycaemia/i.test(d.result || ''),
  },

  {
    key: 'anaemia',
    category: 'ncd',
    label: { en: 'Anaemia', ml: 'രക്തക്കുറവ്' },
    icon: '💉',
    color: '#A6215A',
    method: { en: 'Haemoglobin (Hb)', ml: 'ഹീമോഗ്ലോബിൻ (Hb)' },
    type: 'clinical',
    fields: [
      { key: 'hb_value', label: 'Haemoglobin (g/dL)', type: 'number', placeholder: '11.5', min: 2, max: 20, step: 0.1, required: true },
      {
        key: 'finding', label: 'Clinical Signs', type: 'radio',
        options: ['None', 'Pallor (conjunctival)', 'Pallor + fatigue', 'Pallor + breathlessness'],
      },
      {
        key: 'result', label: 'Severity', type: 'select', required: true,
        options: [
          'Normal (≥12 women / ≥13 men g/dL)',
          'Mild anaemia (10–11.9 g/dL) — iron supplementation',
          'Moderate anaemia (7–9.9 g/dL) — refer',
          'Severe anaemia (<7 g/dL) — urgent referral',
        ],
      },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Dietary history, menstrual history…' },
    ],
    isPositive: d => /moderate|severe|refer/i.test(d.result || ''),
  },

  {
    key: 'vision',
    category: 'ncd',
    label: { en: 'Vision Screening', ml: 'ദൃഷ്ടി സ്ക്രീനിംഗ്' },
    icon: '👁️',
    color: '#0891b2',
    method: { en: 'Snellen Chart', ml: 'സ്നെല്ലൻ ചാർട്ട്' },
    type: 'clinical',
    fields: [
      {
        key: 'right_eye', label: 'Right Eye (OD)', type: 'select', required: true,
        options: ['6/6 (Normal)', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', '<6/60 (Severe impairment)'],
      },
      {
        key: 'left_eye', label: 'Left Eye (OS)', type: 'select', required: true,
        options: ['6/6 (Normal)', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', '<6/60 (Severe impairment)'],
      },
      {
        key: 'glasses', label: 'Corrective lenses?', type: 'radio',
        options: ['No glasses', 'Tested with glasses', 'Tested without glasses (has glasses)'],
      },
      {
        key: 'result', label: 'Overall Result', type: 'select', required: true,
        options: ['Normal', 'Mild impairment — spectacles advised', 'Moderate impairment — refer ophthalmology', 'Severe impairment — urgent referral'],
      },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Other observations…' },
    ],
    isPositive: d => /impairment|refer/i.test(d.result || ''),
  },

  {
    key: 'dental',
    category: 'ncd',
    label: { en: 'Dental Screening', ml: 'ദന്ത സ്ക്രീനിംഗ്' },
    icon: '🦷',
    color: '#64748b',
    method: { en: 'Basic Oral Examination', ml: 'അടിസ്ഥാന ദന്ത പരിശോധന' },
    type: 'clinical',
    allowImages: true,
    fields: [
      {
        key: 'caries', label: 'Dental Caries', type: 'radio', required: true,
        options: ['None', '1–2 teeth affected', '3–5 teeth affected', '>5 teeth affected'],
      },
      {
        key: 'gum', label: 'Gum / Periodontal Status', type: 'radio',
        options: ['Healthy gums', 'Mild gingivitis', 'Moderate periodontitis', 'Severe periodontitis'],
      },
      {
        key: 'finding', label: 'Other Findings', type: 'radio',
        options: ['None', 'Missing teeth', 'Fractured teeth', 'Abscess / swelling', 'Impacted teeth'],
      },
      {
        key: 'result', label: 'Overall Result', type: 'select', required: true,
        options: [
          'Healthy — routine hygiene only',
          'Minor issues — dentist in 6 months',
          'Moderate — dentist appointment needed',
          'Urgent — refer dentist',
        ],
      },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Specific observations, pain reported…' },
    ],
    isPositive: d => /moderate|urgent|refer/i.test(d.result || ''),
  },

  {
    key: 'thyroid',
    category: 'ncd',
    label: { en: 'Thyroid', ml: 'തൈറോയ്ഡ്' },
    icon: '🦋',
    color: '#7c3aed',
    method: { en: 'Palpation / TSH', ml: 'സ്പർശ പരിശോധന / TSH' },
    type: 'clinical',
    fields: [
      {
        key: 'finding', label: 'Neck Palpation', type: 'radio', required: true,
        options: ['No goitre', 'Grade 1 goitre (palpable, not visible)', 'Grade 2 goitre (visible)', 'Nodule palpable', 'Tenderness on palpation'],
      },
      { key: 'tsh_value', label: 'TSH (mIU/L) — if available', type: 'number', placeholder: '2.5', min: 0, max: 100, step: 0.01 },
      {
        key: 'symptoms', label: 'Reported Symptoms', type: 'radio',
        options: ['None', 'Fatigue / weight gain (hypothyroid)', 'Weight loss / tremor (hyperthyroid)', 'Difficulty swallowing / hoarseness'],
      },
      {
        key: 'result', label: 'Overall Result', type: 'select', required: true,
        options: ['Normal — no further action', 'Mild — recheck TSH in 3 months', 'Refer endocrinology / surgery'],
      },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Known thyroid condition? On medication?' },
    ],
    isPositive: d => /refer/i.test(d.result || ''),
  },

  {
    key: 'kidney',
    category: 'ncd',
    label: { en: 'Kidney (Urine Dipstick)', ml: 'വൃക്ക (മൂത്ര പരിശോധന)' },
    icon: '🧪',
    color: '#0891b2',
    method: { en: 'Urine dipstick analysis', ml: 'മൂത്ര ഡിപ്‌സ്റ്റിക് പരിശോധന' },
    type: 'clinical',
    fields: [
      {
        key: 'protein', label: 'Protein', type: 'radio', required: true,
        options: ['Negative', 'Trace', '1+ (30 mg/dL)', '2+ (100 mg/dL)', '3+ (≥300 mg/dL)'],
      },
      {
        key: 'glucose_urine', label: 'Glucose', type: 'radio', required: true,
        options: ['Negative', 'Trace', '1+ (100 mg/dL)', '2+ (250 mg/dL)', '3+ (≥500 mg/dL)'],
      },
      {
        key: 'blood_urine', label: 'Blood / Haematuria', type: 'radio',
        options: ['Negative', 'Trace', 'Positive (1+)', 'Positive (2+/3+)'],
      },
      {
        key: 'result', label: 'Overall Result', type: 'select', required: true,
        options: [
          'Normal — all negative',
          'Minor abnormality — repeat in 1 month',
          'Proteinuria / glycosuria — refer nephrology',
          'Haematuria — refer urology',
          'Multiple abnormalities — urgent referral',
        ],
      },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Known kidney condition, UTI symptoms…' },
    ],
    isPositive: d => /refer|haematuria|proteinuria/i.test(d.result || ''),
  },

  // ─── VALIDATED QUESTIONNAIRES ─────────────────────────────────────────────────

  {
    key: 'phq2',
    category: 'questionnaire',
    label: { en: 'PHQ-2 (Depression Screen)', ml: 'PHQ-2 (വിഷാദ ശ്രേണി)' },
    icon: '🧠',
    color: '#7c3aed',
    method: { en: 'Patient Health Questionnaire — 2 items', ml: 'രോഗി ആരോഗ്യ ചോദ്യാവലി — 2 ഇനങ്ങൾ' },
    type: 'questionnaire',
    description: 'Validated 2-question screen for depression. Score ≥3 = positive — refer for PHQ-9.',
    maxScore: 6,
    questions: [
      {
        key: 'q1',
        label: 'Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?',
        options: [
          { label: 'Not at all', points: 0 },
          { label: 'Several days', points: 1 },
          { label: 'More than half the days', points: 2 },
          { label: 'Nearly every day', points: 3 },
        ],
      },
      {
        key: 'q2',
        label: 'Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?',
        options: [
          { label: 'Not at all', points: 0 },
          { label: 'Several days', points: 1 },
          { label: 'More than half the days', points: 2 },
          { label: 'Nearly every day', points: 3 },
        ],
      },
    ],
    scoreInterpretation: (score) => {
      if (score >= 3) return { result: `Score ${score}/6 — Positive screen — refer for PHQ-9 and counselling`, flag: true }
      return { result: `Score ${score}/6 — Negative screen`, flag: false }
    },
  },

  {
    key: 'auditc',
    category: 'questionnaire',
    label: { en: 'AUDIT-C (Alcohol Use)', ml: 'AUDIT-C (മദ്യ ഉപയോഗം)' },
    icon: '🍺',
    color: '#f59e0b',
    method: { en: 'Alcohol Use Disorders Identification Test — Consumption (WHO)', ml: 'മദ്യ ഉപയോഗ ശ്രേണി — WHO' },
    type: 'questionnaire',
    description: 'WHO validated 3-question screen. Positive: score ≥3 women, ≥4 men.',
    maxScore: 12,
    questions: [
      {
        key: 'q1',
        label: 'How often do you have a drink containing alcohol?',
        options: [
          { label: 'Never', points: 0 },
          { label: 'Monthly or less', points: 1 },
          { label: '2–4 times a month', points: 2 },
          { label: '2–3 times a week', points: 3 },
          { label: '4 or more times a week', points: 4 },
        ],
      },
      {
        key: 'q2',
        label: 'How many standard drinks do you have on a typical drinking day?',
        options: [
          { label: '1–2', points: 0 },
          { label: '3–4', points: 1 },
          { label: '5–6', points: 2 },
          { label: '7–9', points: 3 },
          { label: '10 or more', points: 4 },
        ],
      },
      {
        key: 'q3',
        label: 'How often do you have 6 or more drinks on one occasion?',
        options: [
          { label: 'Never', points: 0 },
          { label: 'Less than monthly', points: 1 },
          { label: 'Monthly', points: 2 },
          { label: 'Weekly', points: 3 },
          { label: 'Daily or almost daily', points: 4 },
        ],
      },
    ],
    scoreInterpretation: (score, patient) => {
      const threshold = patient?.gender === 'Male' ? 4 : 3
      if (score >= threshold) return { result: `Score ${score}/12 — Hazardous alcohol use — counselling advised`, flag: true }
      return { result: `Score ${score}/12 — Low risk`, flag: false }
    },
  },

  {
    key: 'idrs',
    category: 'questionnaire',
    label: { en: 'IDRS (Diabetes Risk)', ml: 'IDRS (പ്രമേഹ അപകടസാധ്യത)' },
    icon: '📊',
    color: '#e67e22',
    method: { en: 'Indian Diabetes Risk Score — MDRF validated', ml: 'ഇന്ത്യൻ പ്രമേഹ അപകടസ്കോർ — MDRF' },
    type: 'questionnaire',
    description: 'Validated for Indian population. Score ≥60 = high risk for Type 2 Diabetes.',
    maxScore: 100,
    questions: [
      {
        key: 'age',
        label: 'Age',
        options: [
          { label: 'Less than 35 years', points: 0 },
          { label: '35 to 49 years', points: 20 },
          { label: '50 years or above', points: 30 },
        ],
      },
      {
        key: 'waist',
        label: 'Waist circumference (men: <80 / 80–89 / ≥90 cm · women: <70 / 70–79 / ≥80 cm)',
        options: [
          { label: 'Below cut-off (low)', points: 0 },
          { label: 'Borderline (intermediate)', points: 10 },
          { label: 'Above cut-off (high)', points: 20 },
        ],
      },
      {
        key: 'activity',
        label: 'Physical activity level',
        options: [
          { label: 'Vigorous (farming, construction, daily sport)', points: 0 },
          { label: 'Moderate (brisk walking, cycling)', points: 10 },
          { label: 'Sedentary (desk work, driving, minimal walking)', points: 20 },
        ],
      },
      {
        key: 'family',
        label: 'Family history of diabetes',
        options: [
          { label: 'No family history', points: 0 },
          { label: 'One parent with diabetes', points: 10 },
          { label: 'Both parents or sibling with diabetes', points: 20 },
        ],
      },
    ],
    scoreInterpretation: (score) => {
      if (score >= 60) return { result: `Score ${score}/100 — High risk — refer for FBS/PPBS`, flag: true }
      if (score >= 30) return { result: `Score ${score}/100 — Moderate risk — lifestyle counselling`, flag: false }
      return { result: `Score ${score}/100 — Low risk`, flag: false }
    },
  },

  {
    key: 'cbac',
    category: 'questionnaire',
    label: { en: 'CBAC (NHM Community Assessment)', ml: 'CBAC (NHM സമൂഹ വിലയിരുത്തൽ)' },
    icon: '📋',
    color: '#10b981',
    method: { en: 'Community Based Assessment Checklist — NHM India', ml: 'സമൂഹ അടിസ്ഥാന മൂല്യനിർണ്ണയ ചെക്ക്‌ലിസ്റ്റ് — NHM' },
    type: 'questionnaire',
    description: 'India NHM tool used by ASHAs for community NCD screening across 5 domains.',
    maxScore: 18,
    questions: [
      // Domain 1: Known diseases
      { key: 'd1_diabetes', section: 'Known Diseases', label: 'Has the person been diagnosed with diabetes?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      { key: 'd1_bp', section: 'Known Diseases', label: 'Has the person been diagnosed with high blood pressure?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      { key: 'd1_heart', section: 'Known Diseases', label: 'Has the person been diagnosed with heart disease?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      { key: 'd1_cancer', section: 'Known Diseases', label: 'Has the person been diagnosed with cancer?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      // Domain 2: Symptoms
      { key: 'd2_oral', section: 'Symptoms', label: 'Any non-healing ulcer, white or red patch in the mouth?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      { key: 'd2_breast', section: 'Symptoms', label: 'Any lump or thickening in the breast or armpit?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      { key: 'd2_bleeding', section: 'Symptoms', label: 'Any unusual or unexplained bleeding (vaginal, rectal, urine)?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      { key: 'd2_cough', section: 'Symptoms', label: 'Persistent cough (>3 weeks) or blood in cough?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      { key: 'd2_weightloss', section: 'Symptoms', label: 'Unexplained weight loss in the last 3 months?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      // Domain 3: Lifestyle
      { key: 'd3_tobacco', section: 'Lifestyle', label: 'Does the person use tobacco (smoking, gutka, paan with tobacco)?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      { key: 'd3_alcohol', section: 'Lifestyle', label: 'Does the person consume alcohol?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      { key: 'd3_inactive', section: 'Lifestyle', label: 'Is the person physically inactive (<150 min moderate activity/week)?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      { key: 'd3_diet', section: 'Lifestyle', label: 'Unhealthy diet (high salt/oil/processed food, low fruits/vegetables)?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      // Domain 4: Biometrics
      { key: 'd4_obese', section: 'Biometrics', label: 'Is BMI ≥25 (overweight or obese)?', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      { key: 'd4_waist', section: 'Biometrics', label: 'Elevated waist circumference? (Men >90 cm / Women >80 cm)', options: [{ label: 'No', points: 0 }, { label: 'Yes', points: 1 }] },
      // Domain 5: Screening history
      { key: 'd5_bp', section: 'Screening History', label: 'BP not checked in the last 6 months?', options: [{ label: 'Checked — up to date', points: 0 }, { label: 'Not checked / overdue', points: 1 }] },
      { key: 'd5_sugar', section: 'Screening History', label: 'Blood sugar not checked in the last 6 months?', options: [{ label: 'Checked — up to date', points: 0 }, { label: 'Not checked / overdue', points: 1 }] },
      { key: 'd5_cancer', section: 'Screening History', label: 'No cancer screening in the last 2 years?', options: [{ label: 'Done within 2 years', points: 0 }, { label: 'Never / more than 2 years ago', points: 1 }] },
    ],
    scoreInterpretation: (score) => {
      if (score >= 5) return { result: `Score ${score}/18 — High risk — refer for full NCD assessment`, flag: true }
      if (score >= 2) return { result: `Score ${score}/18 — Moderate risk — lifestyle counselling + follow-up`, flag: false }
      return { result: `Score ${score}/18 — Low risk`, flag: false }
    },
  },
]

export function getScreeningType(key) {
  return SCREENING_TYPES.find(t => t.key === key)
}

export function getScreeningsByCategory(catKey) {
  return SCREENING_TYPES.filter(t => t.category === catKey)
}
