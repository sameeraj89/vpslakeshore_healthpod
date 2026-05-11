// 100-point Wellness Scorecard — Module 1: 1st Patient Wellness Status Evaluation
// Higher score = BETTER health. Max per domain → total 100.
// Question keys intentionally preserved where possible so existing DB answers remain valid.
import { MAROON } from './brand'

export const DOMAINS = [
  // ─── 1. Physical Activity (max 20 pts) ──────────────────────────────────────
  {
    key: 'physical_activity',
    label: { en: 'Physical Activity', ml: 'ശാരീരിക പ്രവർത്തനം' },
    maxPoints: 20,
    questions: [
      {
        key: 'exercise_freq',
        label: { en: 'In a typical week, how many days do you do 30+ minutes of moderate exercise?', ml: 'ഒരു സാധാരണ ആഴ്ചയിൽ, 30+ മിനിറ്റ് മിതമായ വ്യായാമം ചെയ്യുന്നത് എത്ര ദിവസം?' },
        hint: { en: 'Brisk walking, cycling, housework', ml: 'ഊർജ്ജിത നടത്തം, സൈക്ലിംഗ്, വീട്ടുജോലി' },
        fact: { en: '30 minutes of brisk walking 5 days a week reduces your risk of heart disease by 35% and type 2 diabetes by 50%.', ml: 'ആഴ്ചയിൽ 5 ദിവസം 30 മിനിറ്റ് നടക്കുന്നത് ഹൃദ്രോഗ സാധ്യത 35% കുറയ്ക്കുകയും ടൈപ്പ് 2 ഡയബറ്റീസ് 50% തടയുകയും ചെയ്യും.' },
        options: [
          { label: { en: '0 days',   ml: '0 ദിവസം' },  points: 0  },
          { label: { en: '1–2 days', ml: '1–2 ദിവസം' }, points: 4  },
          { label: { en: '3–4 days', ml: '3–4 ദിവസം' }, points: 7  },
          { label: { en: '5+ days',  ml: '5+ ദിവസം' },  points: 10 },
        ],
      },
      {
        key: 'occupation_activity',
        label: { en: 'What best describes your daily work / activity?', ml: 'നിങ്ങളുടെ ദൈനന്ദിന ജോലി/പ്രവർത്തനം ഏതാണ്?' },
        fact: { en: 'Prolonged sitting raises your risk of metabolic syndrome even if you exercise regularly. Short breaks every hour help.', ml: 'ദൈനംദിന ഇരിക്കൽ ഉപാപചയ രോഗ സാധ്യത വർദ്ധിപ്പിക്കും. ഒരു മണിക്കൂർ ഇടവിട്ട് ചെറിയ ഇടവേളകൾ സഹായിക്കും.' },
        options: [
          { label: { en: 'Mostly sitting / desk job',         ml: 'കൂടുതലും ഇരിക്കൽ / ഡസ്ക് ജോലി' },         points: 0 },
          { label: { en: 'Standing / walking job',            ml: 'നിൽക്കൽ / നടക്കൽ ജോലി' },                  points: 4 },
          { label: { en: 'Heavy manual labour / farming',     ml: 'ഭാരമേറിയ ജോലി / കൃഷി' },                   points: 6 },
        ],
      },
      {
        key: 'sedentary_time',
        label: { en: 'Total sitting time per day (excluding sleep)?', ml: 'ഉറക്കം ഒഴികെ ദിവസേന ഇരിക്കുന്ന ആകെ സമയം?' },
        fact: { en: 'Breaking sitting time with just 2 minutes of walking every hour significantly lowers blood sugar and blood pressure.', ml: 'ഒരു മണിക്കൂർ ഇരിക്കുമ്പോൾ 2 മിനിറ്റ് നടക്കുന്നത് രക്തത്തിലെ പഞ്ചസാരയും രക്തസമ്മർദ്ദവും കുറയ്ക്കും.' },
        options: [
          { label: { en: '>8 hours',  ml: '8 മണിക്കൂറിൽ കൂടുതൽ' }, points: 0 },
          { label: { en: '6–8 hours', ml: '6–8 മണിക്കൂർ' },          points: 2 },
          { label: { en: '<6 hours',  ml: '6 മണിക്കൂറിൽ കുറവ്' },    points: 4 },
        ],
      },
    ],
  },

  // ─── 2. Nutrition & Diet (max 20 pts) ────────────────────────────────────────
  {
    key: 'nutrition',
    label: { en: 'Nutrition & Diet', ml: 'പോഷകാഹാരം & ഭക്ഷണക്രമം' },
    maxPoints: 20,
    questions: [
      {
        key: 'fruit_veg',
        label: { en: 'Servings of fruits + vegetables per day?', ml: 'ദിവസേന ഫലവർഗ്ഗം + പച്ചക്കറി servings?' },
        hint: { en: '1 serving = 1 medium fruit or ½ cup cooked veg', ml: '1 serving = 1 ഇടത്തരം പഴം അല്ലെങ്കിൽ ½ കപ്പ് പാകം ചെയ്ത പച്ചക്കറി' },
        fact: { en: 'Eating 5 or more servings of fruits and vegetables daily can lower your cancer risk by up to 20%.', ml: 'ദിവസം 5 തവണ ഫലവർഗ്ഗം/പച്ചക്കറി കഴിക്കുന്നത് ക്യാൻസർ സാധ്യത 20% വരെ കുറയ്ക്കുന്നു.' },
        options: [
          { label: { en: '<1 serving',   ml: '1-ൽ കുറവ്' },  points: 0 },
          { label: { en: '1–2 servings', ml: '1–2 servings' }, points: 2 },
          { label: { en: '3–4 servings', ml: '3–4 servings' }, points: 4 },
          { label: { en: '5+ servings',  ml: '5+ servings' },  points: 7 },
        ],
      },
      {
        key: 'salt_intake',
        label: { en: 'Do you add extra salt at the table or eat salty snacks / pickles daily?', ml: 'ഭക്ഷണത്തിൽ അധിക ഉപ്പ് ചേർക്കുകയോ ഉപ്പേറിയ ലഘുഭക്ഷണം/അച്ചാർ ദിവസവും കഴിക്കുകയോ ചെയ്യുന്നുണ്ടോ?' },
        fact: { en: 'Reducing daily salt intake to under 5 g can prevent nearly 1.7 million deaths from cardiovascular disease each year.', ml: 'ദൈനിക ഉപ്പ് ഉപഭോഗം 5 g-ൽ കുറയ്ക്കുന്നത് ഹൃദ്രോഗ മരണ നിരക്ക് ഗണ്യമായി കുറയ്ക്കും.' },
        options: [
          { label: { en: 'Yes, daily',      ml: 'അതെ, ദിവസവും' },      points: 0 },
          { label: { en: '3–5 days/week',   ml: '3–5 ദിവസം/ആഴ്ച' },    points: 2 },
          { label: { en: '<3 days/week',    ml: 'ആഴ്ചയിൽ 3-ൽ കുറവ്' }, points: 4 },
        ],
      },
      {
        key: 'oil_intake',
        label: { en: 'Oil / ghee used per person per month in your house?', ml: 'നിങ്ങളുടെ വീട്ടിൽ ഒരു മാസം ഒരാൾക്ക് ഉപയോഗിക്കുന്ന എണ്ണ/നെയ്യ്?' },
        fact: { en: 'Excess saturated fat raises LDL cholesterol and doubles your risk of heart disease. Plant oils in moderation are heart-healthy.', ml: 'അധിക കൊഴുപ്പ് LDL കൊളസ്ട്രോൾ ഉയർത്തി ഹൃദ്രോഗ സാധ്യത ഇരട്ടിയാക്കും.' },
        options: [
          { label: { en: '>1 litre',     ml: '1 ലിറ്ററിൽ കൂടുതൽ' }, points: 0 },
          { label: { en: '0.5–1 litre',  ml: '0.5–1 ലിറ്റർ' },        points: 3 },
          { label: { en: '<0.5 litre',   ml: '0.5 ലിറ്ററിൽ കുറവ്' },  points: 5 },
        ],
      },
      {
        key: 'sugary_drinks',
        label: { en: 'How often do you drink sugar-sweetened beverages / juice / cola?', ml: 'മധുരമുള്ള പാനീയങ്ങൾ / ജ്യൂസ് / കോള എത്ര തവണ കുടിക്കുന്നു?' },
        fact: { en: 'One can of soda contains up to 10 teaspoons of sugar — exceeding the WHO\'s entire recommended daily limit.', ml: 'ഒരു കാൻ സോഡയിൽ 10 ടീസ്പൂൺ പഞ്ചസാരയുണ്ട് — WHO ദൈനിക പരിധിക്ക് മുകളിൽ.' },
        options: [
          { label: { en: 'Daily',               ml: 'ദിവസവും' },                points: 0 },
          { label: { en: '3–5 days/week',       ml: '3–5 ദിവസം/ആഴ്ച' },        points: 1 },
          { label: { en: '<3 days/week or never', ml: 'ആഴ്ചയിൽ 3-ൽ കുറവ്/ഒരിക്കലുമില്ല' }, points: 4 },
        ],
      },
    ],
  },

  // ─── 3. Tobacco & Alcohol (max 15 pts) ───────────────────────────────────────
  {
    key: 'tobacco_alcohol',
    label: { en: 'Tobacco & Alcohol', ml: 'പുകയില & മദ്യം' },
    maxPoints: 15,
    questions: [
      {
        key: 'tobacco',
        label: { en: 'Do you use tobacco in any form now?', ml: 'ഇപ്പോൾ ഏതെങ്കിലും രൂപത്തിൽ പുകയില ഉപയോഗിക്കുന്നുണ്ടോ?' },
        hint: { en: 'Cigarette, beedi, gutka, pan, etc.', ml: 'സിഗരറ്റ്, ബീഡി, ഗുട്ക, പാൻ മുതലായവ' },
        fact: { en: 'Tobacco causes 1 in 3 cancers. Quitting at any age reduces your risk immediately — your body begins healing within 20 minutes.', ml: '3-ൽ 1 ക്യാൻസറും പുകയിലയിൽ നിന്നാണ്. ഏത് പ്രായത്തിൽ നിർത്തിയാലും 20 മിനിറ്റിനുള്ളിൽ ശരീരം സൗഖ്യം വീണ്ടെടുക്കാൻ തുടങ്ങും.' },
        options: [
          { label: { en: 'Yes, daily',        ml: 'അതെ, ദിവസവും' },          points: 0 },
          { label: { en: 'Yes, occasional',   ml: 'അതെ, ഇടയ്ക്ക്' },         points: 2 },
          { label: { en: 'Quit >1 year ago',  ml: '1 വർഷം മുൻപ് നിർത്തി' },  points: 6 },
          { label: { en: 'Never used',        ml: 'ഒരിക്കലും ഉപയോഗിച്ചിട്ടില്ല' }, points: 9 },
        ],
      },
      {
        key: 'alcohol',
        label: { en: 'Do you drink alcohol?', ml: 'മദ്യം കഴിക്കുന്നുണ്ടോ?' },
        fact: { en: 'Even light or moderate drinking raises your risk of breast, colon, and liver cancers. There is no completely safe level.', ml: 'ചെറിയ അളവിൽ മദ്യം കഴിച്ചാലും സ്തന, കോളൻ, കരൾ ക്യാൻസർ സാധ്യത വർദ്ധിക്കുന്നു.' },
        options: [
          { label: { en: '>5 days/week',  ml: 'ആഴ്ചയിൽ 5+ ദിവസം' },  points: 0 },
          { label: { en: '1–4 days/week', ml: 'ആഴ്ചയിൽ 1–4 ദിവസം' }, points: 2 },
          { label: { en: '<1 day/week',   ml: 'ആഴ്ചയിൽ 1 ദിവസത്തിൽ കുറവ്' }, points: 4 },
          { label: { en: 'Never',         ml: 'ഒരിക്കലുമില്ല' },        points: 6 },
        ],
      },
    ],
  },

  // ─── 4. Stress & Sleep (max 15 pts) ──────────────────────────────────────────
  {
    key: 'stress_sleep',
    label: { en: 'Stress & Sleep', ml: 'സ്ട്രെസ് & ഉറക്കം' },
    maxPoints: 15,
    questions: [
      {
        key: 'phq2_1',
        label: { en: 'Over the last 2 weeks, how often have you felt down, depressed, or hopeless?', ml: 'കഴിഞ്ഞ 2 ആഴ്ചയിൽ, നിരാശ അല്ലെങ്കിൽ ആശയറ്റ തോന്നൽ എത്ര തവണ ഉണ്ടായി?' },
        hint: { en: 'PHQ-2 Q1', ml: 'PHQ-2 Q1' },
        fact: { en: 'Mental health is as important as physical health. Depression is highly treatable — speaking to a counsellor is a sign of strength.', ml: 'മാനസിക ആരോഗ്യം ശാരീരിക ആരോഗ്യം പോലെ പ്രധാനമാണ്. നിരാശ ചികിത്സിക്കാം.' },
        options: [
          { label: { en: 'Nearly every day',       ml: 'ഏതാണ്ട് ദിവസവും' },         points: 0 },
          { label: { en: 'More than half the days', ml: 'പകുതിയിലധികം ദിവസം' },     points: 1 },
          { label: { en: 'Several days',            ml: 'ചില ദിവസങ്ങൾ' },            points: 2 },
          { label: { en: 'Not at all',              ml: 'ഇല്ല' },                      points: 3 },
        ],
      },
      {
        key: 'phq2_2',
        label: { en: 'Over the last 2 weeks, how often have you had little interest or pleasure in doing things?', ml: 'കഴിഞ്ഞ 2 ആഴ്ചയിൽ, കാര്യങ്ങൾ ചെയ്യാൻ താൽപ്പര്യക്കുറവ് അനുഭവപ്പെട്ടിട്ടുണ്ടോ?' },
        hint: { en: 'PHQ-2 Q2', ml: 'PHQ-2 Q2' },
        fact: { en: 'Loss of interest or pleasure is one of the core signs of depression. Early support makes a real difference.', ml: 'താൽപ്പര്യക്കുറവ് വിഷാദത്തിന്റെ പ്രധാന ലക്ഷണമാണ്. നേരത്തെ സഹായം തേടുക.' },
        options: [
          { label: { en: 'Nearly every day',       ml: 'ഏതാണ്ട് ദിവസവും' },         points: 0 },
          { label: { en: 'More than half the days', ml: 'പകുതിയിലധികം ദിവസം' },     points: 1 },
          { label: { en: 'Several days',            ml: 'ചില ദിവസങ്ങൾ' },            points: 2 },
          { label: { en: 'Not at all',              ml: 'ഇല്ല' },                      points: 3 },
        ],
      },
      {
        key: 'sleep',
        label: { en: 'Average sleep duration per night?', ml: 'രാത്രി ശരാശരി ഉറക്ക ദൈർഘ്യം?' },
        fact: { en: 'Adults need 6–8 hours of sleep. Chronic poor sleep raises your risk of obesity, diabetes, and cardiovascular disease.', ml: 'ആരോഗ്യകരമായ ഉറക്കം 6–8 മണിക്കൂർ. ഉറക്കക്കുറവ് ഡയബറ്റീസ്, ഹൃദ്രോഗ സാധ്യത കൂട്ടും.' },
        options: [
          { label: { en: '<5 hours',  ml: '5 മണിക്കൂറിൽ കുറവ്' },  points: 0 },
          { label: { en: '5–6 hours', ml: '5–6 മണിക്കൂർ' },          points: 1 },
          { label: { en: '6–8 hours', ml: '6–8 മണിക്കൂർ' },          points: 5 },
          { label: { en: '>8 hours',  ml: '8 മണിക്കൂറിൽ കൂടുതൽ' }, points: 2 },
        ],
      },
      {
        key: 'stress',
        label: { en: 'How often do you feel stressed or unable to cope?', ml: 'സ്ട്രെസ് അനുഭവപ്പെടുകയോ കൈകാര്യം ചെയ്യാൻ കഴിയാതിരിക്കുകയോ ചെയ്യുന്നത് എത്ര തവണ?' },
        fact: { en: 'Chronic stress raises cortisol, increasing your risk of hypertension, heart disease, and weakened immunity. Yoga and mindfulness are proven to help.', ml: 'നിരന്തര സ്ട്രെസ് ഹൃദ്രോഗം, രക്തസമ്മർദ്ദം, രോഗ പ്രതിരോധ ശേഷി കുറക്കൽ എന്നിവയ്ക്ക് കാരണമാകും.' },
        options: [
          { label: { en: 'Always',       ml: 'എപ്പോഴും' },     points: 0 },
          { label: { en: 'Often',        ml: 'പലപ്പോഴും' },    points: 1 },
          { label: { en: 'Sometimes',    ml: 'ചിലപ്പോൾ' },     points: 2 },
          { label: { en: 'Rarely/Never', ml: 'അപൂർവ്വം/ഇല്ല' }, points: 4 },
        ],
      },
    ],
  },

  // ─── 5. Biometrics — Auto-populated from Bluetooth device (max 20 pts) ───────
  {
    key: 'biometrics',
    label: { en: 'Biometrics', ml: 'ബയോമെട്രിക്സ്' },
    maxPoints: 20,
    questions: [
      {
        key: 'bmi',
        label: { en: 'BMI (Height + Weight)', ml: 'BMI (ഉയരം + ഭാരം)' },
        hint: { en: 'Auto-calculated from Bluetooth scale', ml: 'Bluetooth സ്കെയിൽ വഴി സ്വയം കണക്കാക്കും' },
        fact: { en: 'Losing even 5–10% of body weight significantly reduces your risk of developing diabetes, heart disease, and joint problems.', ml: 'ശരീര ഭാരം 5–10% കുറയ്ക്കുന്നത് ഡയബറ്റീസ്, ഹൃദ്രോഗ, സന്ധിവാത സാധ്യത ഗണ്യമായി കുറയ്ക്കും.' },
        options: [
          { label: { en: '<18.5 or >30',  ml: '<18.5 അല്ലെങ്കിൽ >30' }, points: 0  },
          { label: { en: '25–29.9',       ml: '25–29.9' },                 points: 4  },
          { label: { en: '23–24.9',       ml: '23–24.9' },                 points: 7  },
          { label: { en: '18.5–22.9',     ml: '18.5–22.9' },               points: 10 },
        ],
      },
      {
        key: 'blood_pressure',
        label: { en: 'Blood Pressure (from BP machine)', ml: 'രക്തസമ്മർദ്ദം (BP മഷീൻ)' },
        hint: { en: 'Auto-read from Bluetooth BP device', ml: 'Bluetooth BP ഉപകരണം വഴി സ്വയം വായിക്കും' },
        fact: { en: 'High blood pressure often has no symptoms but is the #1 risk factor for stroke. Regular checks can save your life.', ml: 'ഉയർന്ന രക്തസമ്മർദ്ദം ലക്ഷണങ്ങളില്ലാതെ ഉണ്ടാകും. ഇത് സ്ട്രോക്കിന്റെ ഏറ്റവും വലിയ കാരണമാണ്.' },
        options: [
          { label: { en: '≥160/100',         ml: '≥160/100' },         points: 0 },
          { label: { en: '140–159 / 90–99',  ml: '140–159 / 90–99' },  points: 3 },
          { label: { en: '130–139 / 85–89',  ml: '130–139 / 85–89' },  points: 5 },
          { label: { en: '<130/85',          ml: '<130/85' },           points: 7 },
        ],
      },
      {
        key: 'spo2',
        label: { en: 'SpO₂ (from pulse oximeter)', ml: 'SpO₂ (പൾസ് ഓക്സിമീറ്റർ)' },
        hint: { en: 'Auto-read from Bluetooth oximeter', ml: 'Bluetooth ഓക്സിമീറ്റർ വഴി സ്വയം വായിക്കും' },
        fact: { en: 'SpO₂ below 95% may indicate respiratory or cardiac conditions that need medical evaluation, even without obvious symptoms.', ml: 'SpO₂ 95%-ൽ കുറഞ്ഞാൽ ശ്വാസ/ഹൃദയ പ്രശ്നങ്ങളുണ്ടാകാം. ഡോക്ടറെ കാണുക.' },
        options: [
          { label: { en: '<95%',   ml: '<95%' },   points: 0 },
          { label: { en: '95–96%', ml: '95–96%' }, points: 1 },
          { label: { en: '≥97%',   ml: '≥97%' },   points: 3 },
        ],
      },
    ],
  },

  // ─── 6. Screening History (max 10 pts) ───────────────────────────────────────
  {
    key: 'screening_history',
    label: { en: 'Screening History', ml: 'സ്ക്രീനിംഗ് ചരിത്രം' },
    maxPoints: 10,
    questions: [
      {
        key: 'last_bp_check',
        label: { en: 'When was your last BP check?', ml: 'അവസാനം BP പരിശോധിച്ചത് എപ്പോൾ?' },
        fact: { en: 'Adults over 30 should check BP every 6 months. Silent hypertension is caught only by testing.', ml: '30 വയസ്സ് കഴിഞ്ഞവർ 6 മാസം ഒരിക്കൽ BP പരിശോധിക്കണം.' },
        options: [
          { label: { en: '>2 years / Never', ml: '2 വർഷത്തിൽ കൂടുതൽ / ഒരിക്കലുമില്ല' }, points: 0 },
          { label: { en: '1–2 years ago',    ml: '1–2 വർഷം മുൻപ്' },                      points: 2 },
          { label: { en: '<1 year ago',       ml: '1 വർഷത്തിൽ കുറവ്' },                   points: 4 },
        ],
      },
      {
        key: 'last_sugar_check',
        label: { en: 'When was your last blood sugar check?', ml: 'അവസാനം രക്തത്തിലെ പഞ്ചസാര പരിശോധിച്ചത് എപ്പോൾ?' },
        fact: { en: 'Pre-diabetes is reversible with diet and exercise changes. Most people don\'t know they have it — early testing is key.', ml: 'പ്രീ-ഡയബറ്റിക് അവസ്ഥ ഭക്ഷണ-വ്യായാമ മാറ്റം കൊണ്ട് മാറ്റാൻ കഴിയും. നേരത്തെ പരിശോധിക്കുക.' },
        options: [
          { label: { en: '>2 years / Never', ml: '2 വർഷത്തിൽ കൂടുതൽ / ഒരിക്കലുമില്ല' }, points: 0 },
          { label: { en: '1–2 years ago',    ml: '1–2 വർഷം മുൻപ്' },                      points: 2 },
          { label: { en: '<1 year ago',       ml: '1 വർഷത്തിൽ കുറവ്' },                   points: 3 },
        ],
      },
      {
        key: 'cancer_screening',
        label: { en: 'If age ≥30 (women) / ≥50 (men): Are your cancer screenings up-to-date?', ml: 'പ്രായം ≥30 (സ്ത്രീകൾ) / ≥50 (പുരുഷൻ): ക്യാൻസർ സ്ക്രീനിംഗ് കൃത്യമാണോ?' },
        hint: { en: 'Cervical, Breast, Oral, Colon', ml: 'സർവൈക്കൽ, ബ്രെസ്റ്റ്, ഓറൽ, കോളൻ' },
        fact: { en: 'Cancers detected early have 5-year survival rates above 90%. One visit at HealthPod covers 5 cancer screenings simultaneously.', ml: 'നേരത്തെ കണ്ടെത്തിയ ക്യാൻസറിൽ 90%+ അതിജീവന നിരക്ക് ഉണ്ട്. HealthPod-ൽ ഒരു വിസിറ്റിൽ 5 ക്യാൻസർ സ്ക്രീനിംഗ് ചെയ്യാം.' },
        options: [
          { label: { en: 'No / Not applicable by age', ml: 'ഇല്ല / പ്രായം ബാധകമല്ല' }, points: 0 },
          { label: { en: 'Overdue',                    ml: 'കാലം കഴിഞ്ഞത്' },           points: 1 },
          { label: { en: 'Up-to-date',                 ml: 'കൃത്യമാണ്' },                points: 3 },
        ],
      },
    ],
  },
]

// ─── Scoring tiers (unchanged) ────────────────────────────────────────────────
export const SCORE_TIERS = [
  { min: 80, max: 100, level: 'green',  label: { en: 'Thriving',  ml: 'ആരോഗ്യകരം' },    color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: '#10b981', voucher: '10%', message: { en: 'Excellent health habits. Keep it up and get your annual wellness check.',             ml: 'മികച്ച ആരോഗ്യ ശീലങ്ങൾ. തുടരൂ!' } },
  { min: 60, max: 79,  level: 'amber',  label: { en: 'Watchful',  ml: 'ശ്രദ്ധിക്കണം' },   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: '#f59e0b', voucher: '15%', message: { en: 'Some areas need attention. A preventive panel and lifestyle counselling is advised.', ml: 'ചില മേഖലകൾ ശ്രദ്ധ ആവശ്യപ്പെടുന്നു.' } },
  { min: 40, max: 59,  level: 'orange', label: { en: 'At Risk',   ml: 'അപകടസാധ്യത' },      color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: '#f97316', voucher: '20%', message: { en: 'Your score indicates risk. Please consult a specialist within 4 weeks.',             ml: 'നിങ്ങളുടെ സ്കോർ അപകടസൂചന നൽകുന്നു.' } },
  { min: 0,  max: 39,  level: 'red',    label: { en: 'Act Now',   ml: 'ഉടൻ നടപടി' },       color: MAROON,    bg: 'rgba(139,26,74,0.1)',   border: MAROON,    voucher: '25%', message: { en: 'Immediate attention needed. A nurse counsellor will speak with you today.',        ml: 'ഉടനടി ശ്രദ്ധ ആവശ്യം. ഇന്ന് നഴ്സ് കൗൺസെലർ സംസാരിക്കും.' } },
]

export function getTier(score) {
  return SCORE_TIERS.find(t => score >= t.min && score <= t.max) || SCORE_TIERS[3]
}

// Maps 4-tier level to the 3-level DB field used by Patients / Dashboard.
export function tierToRiskLevel(tierLevel) {
  if (tierLevel === 'green') return 'low'
  if (tierLevel === 'amber') return 'medium'
  return 'high'
}

// Stable voucher code: HP-{TierInitial}{Score}-{UHID}-{YYMMDD}
export function generateVoucherCode(patient, score, tier) {
  const d = new Date()
  const yymmdd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const tierInitial = tier.level[0].toUpperCase()
  return `HP-${tierInitial}${score}-${patient?.uhid || 'GUEST'}-${yymmdd}`
}
