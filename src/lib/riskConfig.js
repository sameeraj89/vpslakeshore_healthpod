// 100-point NCD Risk Assessment — adapted from WHO STEPS, calibrated for Kerala
// Higher score = BETTER health (inverse of old scoring)
import { MAROON } from './brand'

export const DOMAINS = [
  {
    key: 'physical_activity',
    label: { en: 'Physical Activity', ml: 'ശാരീരിക പ്രവർത്തനം' },
    maxPoints: 20,
    questions: [
      {
        key: 'exercise_freq',
        label: { en: 'How often do you take a brisk walk or exercise?', ml: 'നിങ്ങൾ എത്ര തവണ നടക്കുകയോ വ്യായാമം ചെയ്യുകയോ ചെയ്യുന്നു?' },
        fact: { en: '30 minutes of brisk walking daily reduces your risk of heart disease by 35% and type 2 diabetes by 50%.', ml: 'ദിവസം 30 മിനിറ്റ് നടക്കുന്നത് ഹൃദ്രോഗ സാധ്യത 35% കുറയ്ക്കുകയും ടൈപ്പ് 2 ഡയബറ്റീസ് 50% തടയുകയും ചെയ്യും.' },
        options: [
          { label: { en: 'Daily (30+ min)', ml: 'ദിവസവും (30+ മിനിറ്റ്)' }, points: 8 },
          { label: { en: '3–5 days/week', ml: 'ആഴ്ചയിൽ 3-5 ദിവസം' }, points: 6 },
          { label: { en: '1–2 days/week', ml: 'ആഴ്ചയിൽ 1-2 ദിവസം' }, points: 3 },
          { label: { en: 'Rarely / Never', ml: 'അപൂർവ്വം / ഒരിക്കലുമില്ല' }, points: 0 },
        ],
      },
      {
        key: 'occupation_activity',
        label: { en: 'How physically active is your daily work?', ml: 'നിങ്ങളുടെ ദൈനന്ദിന ജോലി എത്രത്തോളം ശാരീരികമാണ്?' },
        fact: { en: 'Prolonged sitting (8+ hours/day) raises your risk of metabolic syndrome even if you exercise regularly.', ml: 'ദിവസം 8+ മണിക്കൂർ ഇരിക്കുന്നത് വ്യായാമം ചെയ്താലും ഉപാപചയ രോഗ സാധ്യത വർദ്ധിപ്പിക്കും.' },
        options: [
          { label: { en: 'Heavy manual work', ml: 'ഭാരമേറിയ ജോലി' }, points: 6 },
          { label: { en: 'Moderate (walking, standing)', ml: 'മിതമായ (നടക്കുക, നിൽക്കുക)' }, points: 4 },
          { label: { en: 'Light (mostly sitting)', ml: 'ഇരിക്കൽ ജോലി' }, points: 2 },
          { label: { en: 'Sedentary (desk/screen all day)', ml: 'ഡസ്ക്/സ്ക്രീൻ ജോലി' }, points: 0 },
        ],
      },
      {
        key: 'sedentary_time',
        label: { en: 'How many hours do you sit/screen daily?', ml: 'ദിവസവും എത്ര മണിക്കൂർ ഇരിക്കുന്നു/സ്ക്രീൻ നോക്കുന്നു?' },
        fact: { en: 'Breaking sitting time with just 2 minutes of walking every hour significantly lowers blood sugar and blood pressure.', ml: 'ഒരു മണിക്കൂർ ഇരിക്കുമ്പോൾ 2 മിനിറ്റ് നടക്കുന്നത് രക്തത്തിലെ പഞ്ചസാരയും രക്തസമ്മർദ്ദവും കുറയ്ക്കും.' },
        options: [
          { label: { en: 'Less than 4 hours', ml: '4 മണിക്കൂറിൽ കുറവ്' }, points: 6 },
          { label: { en: '4–6 hours', ml: '4–6 മണിക്കൂർ' }, points: 4 },
          { label: { en: '6–8 hours', ml: '6–8 മണിക്കൂർ' }, points: 2 },
          { label: { en: 'More than 8 hours', ml: '8 മണിക്കൂറിൽ കൂടുതൽ' }, points: 0 },
        ],
      },
    ],
  },
  {
    key: 'nutrition',
    label: { en: 'Nutrition & Diet', ml: 'പോഷകാഹാരം & ഭക്ഷണക്രമം' },
    maxPoints: 20,
    questions: [
      {
        key: 'fruit_veg',
        label: { en: 'How many servings of fruits & vegetables daily?', ml: 'ദിവസേന എത്ര ഫലം/പച്ചക്കറി കഴിക്കുന്നു?' },
        fact: { en: 'Eating 5 or more servings of fruits and vegetables daily can lower your cancer risk by up to 20%.', ml: 'ദിവസം 5 തവണ ഫലവർഗ്ഗം/പച്ചക്കറി കഴിക്കുന്നത് ക്യാൻസർ സാധ്യത 20% വരെ കുറയ്ക്കുന്നു.' },
        options: [
          { label: { en: '5 or more', ml: '5 അല്ലെങ്കിൽ കൂടുതൽ' }, points: 8 },
          { label: { en: '3–4 servings', ml: '3–4 servings' }, points: 5 },
          { label: { en: '1–2 servings', ml: '1–2 servings' }, points: 2 },
          { label: { en: 'Rarely eat fruits/vegetables', ml: 'അപൂർവ്വം' }, points: 0 },
        ],
      },
      {
        key: 'salt_oil',
        label: { en: 'Salt & oil use in cooking', ml: 'പാചകത്തിൽ ഉപ്പും എണ്ണയും' },
        fact: { en: 'Reducing daily salt intake to under 5g can prevent nearly 1.7 million deaths from cardiovascular disease each year globally.', ml: 'ദൈനിക ഉപ്പ് ഉപഭോഗം 5g-ൽ കുറയ്ക്കുന്നത് ഹൃദ്രോഗ മരണ നിരക്ക് ഗണ്യമായി കുറയ്ക്കും.' },
        options: [
          { label: { en: 'Low salt, low oil', ml: 'കുറഞ്ഞ ഉപ്പ്, കുറഞ്ഞ എണ്ണ' }, points: 6 },
          { label: { en: 'Moderate', ml: 'മിതമായ' }, points: 3 },
          { label: { en: 'High salt or high oil', ml: 'കൂടുതൽ ഉപ്പ്/എണ്ണ' }, points: 1 },
          { label: { en: 'Both high', ml: 'രണ്ടും കൂടുതൽ' }, points: 0 },
        ],
      },
      {
        key: 'sugary_drinks',
        label: { en: 'Sugary drinks / processed food consumption', ml: 'മധുരമുള്ള പാനീയങ്ങൾ / സംസ്കരിച്ച ഭക്ഷണം' },
        fact: { en: 'One can of soda contains up to 10 teaspoons of sugar — exceeding the WHO\'s entire recommended daily limit.', ml: 'ഒരു കാൻ സോഡയിൽ 10 ടീസ്പൂൺ പഞ്ചസാരയുണ്ട് — WHO ദൈനിക പരിധിക്ക് മുകളിൽ.' },
        options: [
          { label: { en: 'Rarely / Never', ml: 'അപൂർവ്വം / ഒരിക്കലുമില്ല' }, points: 6 },
          { label: { en: 'Once a week', ml: 'ആഴ്ചയിൽ ഒരിക്കൽ' }, points: 4 },
          { label: { en: 'Several times a week', ml: 'ആഴ്ചയിൽ പലതവണ' }, points: 2 },
          { label: { en: 'Daily', ml: 'ദിവസവും' }, points: 0 },
        ],
      },
    ],
  },
  {
    key: 'tobacco_alcohol',
    label: { en: 'Tobacco & Alcohol', ml: 'പുകയില & മദ്യം' },
    maxPoints: 15,
    questions: [
      {
        key: 'tobacco',
        label: { en: 'Tobacco use (smoking, gutka, paan)', ml: 'പുകയില ഉപയോഗം' },
        fact: { en: 'Tobacco causes 1 in 3 cancers. Quitting at any age reduces your risk immediately — your body begins healing within 20 minutes.', ml: '3ൽ 1 ക്യാൻസറും പുകയിലയിൽ നിന്നാണ്. ഏത് പ്രായത്തിൽ നിർത്തിയാലും 20 മിനിറ്റിനുള്ളിൽ ശരീരം സൗഖ്യം വീണ്ടെടുക്കാൻ തുടങ്ങും.' },
        options: [
          { label: { en: 'Never used', ml: 'ഒരിക്കലും ഉപയോഗിച്ചിട്ടില്ല' }, points: 8 },
          { label: { en: 'Quit more than 5 years ago', ml: '5 വർഷം മുൻപ് നിറുത്തി' }, points: 6 },
          { label: { en: 'Quit less than 5 years ago', ml: '5 വർഷത്തിൽ കുറഞ്ഞ സമയം' }, points: 3 },
          { label: { en: 'Occasional user', ml: 'ഇടയ്ക്ക് ഉപയോഗിക്കുന്നു' }, points: 1 },
          { label: { en: 'Daily user', ml: 'ദൈനംദിന ഉപയോഗം' }, points: 0 },
        ],
      },
      {
        key: 'alcohol',
        label: { en: 'Alcohol consumption', ml: 'മദ്യ ഉപഭോഗം' },
        fact: { en: 'Even light or moderate drinking raises your risk of breast, colon, and liver cancers. There is no completely safe level.', ml: 'ചെറിയ അളവിൽ മദ്യം കഴിച്ചാലും സ്തന, കോളൻ, കരൾ ക്യാൻസർ സാധ്യത വർദ്ധിക്കുന്നു.' },
        options: [
          { label: { en: 'Never / Non-drinker', ml: 'ഒരിക്കലും / കുടിക്കില്ല' }, points: 7 },
          { label: { en: 'Occasional (< once/week)', ml: 'ഇടയ്ക്ക്' }, points: 5 },
          { label: { en: 'Regular (1–2 drinks/day)', ml: 'ക്രമമായ (1-2 പ്രതിദിനം)' }, points: 2 },
          { label: { en: 'Heavy (3+ drinks/day)', ml: 'അധിക ഉപഭോഗം' }, points: 0 },
        ],
      },
    ],
  },
  {
    key: 'stress_sleep',
    label: { en: 'Stress & Sleep', ml: 'സ്ട്രെസ് & ഉറക്കം' },
    maxPoints: 15,
    questions: [
      {
        key: 'sleep',
        label: { en: 'How many hours do you sleep each night?', ml: 'ദിവസേന എത്ര മണിക്കൂർ ഉറങ്ങുന്നു?' },
        fact: { en: 'Adults need 7–8 hours of sleep. Chronic poor sleep raises your risk of obesity, diabetes, and cardiovascular disease.', ml: 'ആരോഗ്യകരമായ ഉറക്കം 7-8 മണിക്കൂർ. ഉറക്കക്കുറവ് ഡയബറ്റീസ്, ഹൃദ്രോഗ സാധ്യത കൂട്ടും.' },
        options: [
          { label: { en: '7–8 hours', ml: '7–8 മണിക്കൂർ' }, points: 6 },
          { label: { en: '6–7 hours', ml: '6–7 മണിക്കൂർ' }, points: 4 },
          { label: { en: 'Less than 6 hours', ml: '6 മണിക്കൂറിൽ കുറവ്' }, points: 1 },
          { label: { en: 'More than 9 hours', ml: '9 മണിക്കൂറിൽ കൂടുതൽ' }, points: 2 },
        ],
      },
      {
        key: 'stress',
        label: { en: 'How often do you feel stressed or overwhelmed?', ml: 'എത്ര തവണ സ്ട്രെസ് അനുഭവപ്പെടുന്നു?' },
        fact: { en: 'Chronic stress raises cortisol, increasing your risk of hypertension, heart disease, and weakened immunity. Yoga and mindfulness are proven to help.', ml: 'നിരന്തര സ്ട്രെസ് ഹൃദ്രോഗം, രക്തസമ്മർദ്ദം, രോഗ പ്രതിരോധ ശേഷി കുറക്കൽ എന്നിവയ്ക്ക് കാരണമാകും.' },
        options: [
          { label: { en: 'Rarely', ml: 'അപൂർവ്വം' }, points: 5 },
          { label: { en: 'Sometimes', ml: 'ചിലപ്പോൾ' }, points: 3 },
          { label: { en: 'Often', ml: 'പലപ്പോഴും' }, points: 1 },
          { label: { en: 'Almost always', ml: 'മിക്കവാറും' }, points: 0 },
        ],
      },
      {
        key: 'mood',
        label: { en: 'Over the past 2 weeks, have you felt down or hopeless?', ml: 'കഴിഞ്ഞ 2 ആഴ്ച നിരാശ അനുഭവിച്ചോ?' },
        fact: { en: 'Mental health is as important as physical health. Depression is highly treatable — speaking to a counsellor is a sign of strength.', ml: 'മാനസിക ആരോഗ്യം ശാരീരിക ആരോഗ്യം പോലെ പ്രധാനമാണ്. നിരാശ ചികിത്സിക്കാം — സഹായം തേടുക.' },
        options: [
          { label: { en: 'Not at all', ml: 'ഇല്ല' }, points: 4 },
          { label: { en: 'Several days', ml: 'ചില ദിവസങ്ങൾ' }, points: 2 },
          { label: { en: 'More than half the days', ml: 'പകുതിയിലധികം ദിവസം' }, points: 1 },
          { label: { en: 'Nearly every day', ml: 'ഏതാണ്ട് ദിവസവും' }, points: 0 },
        ],
      },
    ],
  },
  {
    key: 'biometrics',
    label: { en: 'Biometrics', ml: 'ബയോമെട്രിക്സ്' },
    maxPoints: 20,
    questions: [
      {
        key: 'blood_pressure',
        label: { en: 'Blood pressure (last reading)', ml: 'രക്തസമ്മർദ്ദം (അവസാന വായന)' },
        fact: { en: 'High blood pressure often has no symptoms but is the #1 risk factor for stroke. Regular checks can save your life.', ml: 'ഉയർന്ന രക്തസമ്മർദ്ദം ലക്ഷണങ്ങളില്ലാതെ ഉണ്ടാകും. ഇത് സ്ട്രോക്കിന്റെ ഏറ്റവും വലിയ കാരണമാണ്.' },
        options: [
          { label: { en: 'Normal (<120/80)', ml: 'സാധാരണ (<120/80)' }, points: 6 },
          { label: { en: 'Elevated (120–129/<80)', ml: 'ഉയർന്നത് (120–129)' }, points: 4 },
          { label: { en: 'High (130–139/80–89)', ml: 'ഉയർന്ന BP' }, points: 2 },
          { label: { en: 'Very high (≥140/90)', ml: 'വളരെ ഉയർന്നത് (≥140/90)' }, points: 0 },
          { label: { en: "Don't know", ml: 'അറിയില്ല' }, points: 3 },
        ],
      },
      {
        key: 'bmi',
        label: { en: 'Body weight / BMI', ml: 'ശരീരഭാരം / BMI' },
        fact: { en: 'Losing even 5–10% of body weight significantly reduces your risk of developing diabetes, heart disease, and joint problems.', ml: 'ശരീര ഭാരം 5-10% കുറയ്ക്കുന്നത് ഡയബറ്റീസ്, ഹൃദ്രോഗ, സന്ധിവാത സാധ്യത ഗണ്യമായി കുറയ്ക്കും.' },
        options: [
          { label: { en: 'Normal (BMI 18.5–24.9)', ml: 'സാധാരണ (BMI 18.5–24.9)' }, points: 6 },
          { label: { en: 'Overweight (BMI 25–29.9)', ml: 'അധിക ഭാരം' }, points: 3 },
          { label: { en: 'Obese (BMI ≥30)', ml: 'പൊണ്ണത്തടി' }, points: 1 },
          { label: { en: 'Underweight (BMI <18.5)', ml: 'ഭാരക്കുറവ്' }, points: 2 },
        ],
      },
      {
        key: 'blood_sugar',
        label: { en: 'Blood sugar (last reading)', ml: 'രക്തത്തിലെ പഞ്ചസാര' },
        fact: { en: 'Pre-diabetes is reversible with diet and exercise changes. Most people don\'t know they have it — early testing is key.', ml: 'പ്രീ-ഡയബറ്റിക് അവസ്ഥ ഭക്ഷണ-വ്യായാമ മാറ്റം കൊണ്ട് മാറ്റാൻ കഴിയും. നേരത്തെ പരിശോധിക്കുക.' },
        options: [
          { label: { en: 'Normal (fasting <100)', ml: 'സാധാരണ' }, points: 5 },
          { label: { en: 'Pre-diabetic (100–125)', ml: 'പ്രീ-ഡയബറ്റിക്' }, points: 2 },
          { label: { en: 'Diabetic (≥126)', ml: 'പ്രമേഹം' }, points: 0 },
          { label: { en: "Don't know / Not tested", ml: 'അറിയില്ല' }, points: 2 },
        ],
      },
      {
        key: 'spo2',
        label: { en: 'Oxygen saturation / SpO₂', ml: 'ഓക്സിജൻ സാച്ചുറേഷൻ / SpO₂' },
        fact: { en: 'SpO₂ below 95% may indicate respiratory or cardiac conditions that need medical evaluation, even without obvious symptoms.', ml: 'SpO₂ 95%-ൽ കുറഞ്ഞാൽ ശ്വാസ/ഹൃദയ പ്രശ്നങ്ങളുണ്ടാകാം. ലക്ഷണങ്ങൾ ഇല്ലെങ്കിലും ഡോക്ടറെ കാണുക.' },
        options: [
          { label: { en: '98–100% (Normal)', ml: '98–100% (സാധാരണ)' }, points: 3 },
          { label: { en: '95–97% (Acceptable)', ml: '95–97% (സ്വീകാര്യം)' }, points: 2 },
          { label: { en: '92–94% (Low-normal)', ml: '92–94% (അൽപ്പം കുറഞ്ഞ)' }, points: 1 },
          { label: { en: 'Below 92% (Concerning)', ml: '92%ൽ താഴെ (ശ്രദ്ധ ആവശ്യം)' }, points: 0 },
          { label: { en: "Don't know / Not measured", ml: 'അറിയില്ല' }, points: 1 },
        ],
      },
    ],
  },
  {
    key: 'screening_history',
    label: { en: 'Screening History', ml: 'സ്ക്രീനിംഗ് ചരിത്രം' },
    maxPoints: 10,
    questions: [
      {
        key: 'last_bp_check',
        label: { en: 'When was your last BP / blood sugar check?', ml: 'അവസാനം BP/ഷുഗർ പരിശോധിച്ചത് എപ്പോൾ?' },
        fact: { en: 'Adults over 30 should check BP and blood sugar every 6 months. Silent hypertension and pre-diabetes are caught only by testing.', ml: '30 വയസ്സ് കഴിഞ്ഞവർ ആറ് മാസം ഒരിക്കൽ BP, ഷുഗർ പരിശോധിക്കണം. ലക്ഷണങ്ങൾ ഇല്ലാതെ ഇരിക്കും.' },
        options: [
          { label: { en: 'Within 6 months', ml: '6 മാസത്തിനുള്ളിൽ' }, points: 4 },
          { label: { en: '6–12 months ago', ml: '6–12 മാസം മുൻപ്' }, points: 3 },
          { label: { en: 'More than 1 year ago', ml: '1 വർഷം മുൻപ്' }, points: 1 },
          { label: { en: 'Never', ml: 'ഒരിക്കലുമില്ല' }, points: 0 },
        ],
      },
      {
        key: 'cancer_screening',
        label: { en: 'Have you ever had a cancer screening?', ml: 'ക്യാൻസർ സ്ക്രീനിംഗ് നടത്തിയിട്ടുണ്ടോ?' },
        fact: { en: 'Cancers detected early have 5-year survival rates above 90%. One visit at HealthPod covers 5 cancer screenings simultaneously.', ml: 'നേരത്തെ കണ്ടെത്തിയ ക്യാൻസറിൽ 90%+ അതിജീവന നിരക്ക് ഉണ്ട്. HealthPod-ൽ ഒരു വിസിറ്റിൽ 5 ക്യാൻസർ സ്ക്രീനിംഗ് ചെയ്യാം.' },
        options: [
          { label: { en: 'Yes, within 2 years', ml: 'ഉണ്ട്, 2 വർഷത്തിനുള്ളിൽ' }, points: 4 },
          { label: { en: 'Yes, more than 2 years ago', ml: 'ഉണ്ട്, 2 വർഷം മുൻപ്' }, points: 2 },
          { label: { en: 'No / Never', ml: 'ഇല്ല' }, points: 0 },
        ],
      },
      {
        key: 'family_history',
        label: { en: 'Family history of cancer, heart disease, or diabetes?', ml: 'കുടുംബ ചരിത്രം?' },
        fact: { en: 'A family history of NCDs can double your personal risk. Share this with your doctor so they can plan targeted prevention for you.', ml: 'കുടുംബ ചരിത്രം ഉണ്ടെങ്കിൽ സ്വന്തം റിസ്ക് ഇരട്ടിയാകുന്നു. ഡോക്ടറോട് ചർച്ച ചെയ്ത് പ്രതിരോധ മാർഗ്ഗം ആസൂത്രണം ചെയ്യുക.' },
        options: [
          { label: { en: 'None', ml: 'ഇല്ല' }, points: 2 },
          { label: { en: 'One condition', ml: 'ഒന്ന്' }, points: 1 },
          { label: { en: 'Two or more conditions', ml: 'രണ്ടോ അതിലധികമോ' }, points: 0 },
        ],
      },
    ],
  },
]

export const SCORE_TIERS = [
  { min: 80, max: 100, level: 'green',  label: { en: 'Thriving', ml: 'ആരോഗ്യകരം' },    color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: '#10b981', voucher: '10%', message: { en: 'Excellent health habits. Keep it up and get your annual wellness check.', ml: 'മികച്ച ആരോഗ്യ ശീലങ്ങൾ. തുടരൂ!' } },
  { min: 60, max: 79,  level: 'amber',  label: { en: 'Watchful', ml: 'ശ്രദ്ധിക്കണം' },   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: '#f59e0b', voucher: '15%', message: { en: 'Some areas need attention. A preventive panel and lifestyle counselling is advised.', ml: 'ചില മേഖലകൾ ശ്രദ്ധ ആവശ്യപ്പെടുന്നു.' } },
  { min: 40, max: 59,  level: 'orange', label: { en: 'At Risk', ml: 'അപകടസാധ്യത' },      color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: '#f97316', voucher: '20%', message: { en: 'Your score indicates risk. Please consult a specialist within 4 weeks.', ml: 'നിങ്ങളുടെ സ്കോർ അപകടസൂചന നൽകുന്നു.' } },
  { min: 0,  max: 39,  level: 'red',    label: { en: 'Act Now', ml: 'ഉടൻ നടപടി' },       color: MAROON,    bg: 'rgba(139,26,74,0.1)',  border: MAROON,    voucher: '25%', message: { en: 'Immediate attention needed. A nurse counsellor will speak with you today.', ml: 'ഉടനടി ശ്രദ്ധ ആവശ്യം. ഇന്ന് നഴ്സ് കൗൺസെലർ സംസാരിക്കും.' } },
]

export function getTier(score) {
  return SCORE_TIERS.find(t => score >= t.min && score <= t.max) || SCORE_TIERS[3]
}

// Stable voucher code: HP-{TierInitial}{Score}-{UHID}-{YYMMDD}
// Single source of truth — used by both ScoreCard and generatePDF
export function generateVoucherCode(patient, score, tier) {
  const d = new Date()
  const yymmdd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const tierInitial = tier.level[0].toUpperCase()
  return `HP-${tierInitial}${score}-${patient?.uhid || 'GUEST'}-${yymmdd}`
}
