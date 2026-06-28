// =====================================================================
//  Project similarity — catches near-duplicates by MEANING, not just
//  exact words. Pipeline per word:
//    1. drop common/domain stop-words
//    2. map known synonyms to a shared concept (forecast -> predict,
//       pupil -> student, automobile -> vehicle, ...)
//    3. light-stem the rest (predicting/prediction/predicts -> predict)
//  Then TF cosine over the resulting concepts (title weighted x3).
//  Dependency-free. It's a HELPER — the HoD/admin make the final call.
// =====================================================================

const STOPWORDS = new Set(
  `a an the of and or to for in on at by with from as is are was were be been being it its
   this that these those into using use used based system systems project projects study studies
   analysis approach development design implementation application applications app applied
   platform university student-archive department research paper propose proposed new towards
   via their our able feature features data model models method methods technique techniques
   case study smart efficient effective novel improved enhanced framework tool toolkit`
    .split(/\s+/)
);

// Surface words grouped under a shared concept. Extend freely.
const SYN_GROUPS = {
  predict: ['forecast','forecasts','forecasting','forecasted','predicting','prediction','predictions','predictive','predict','predicts','estimate','estimates','estimating','estimation','anticipate','anticipating','projection','projecting'],
  student: ['pupil','pupils','learner','learners','undergraduate','undergraduates','undergrad','trainee','trainees','scholar','scholars','students','student'],
  performance: ['result','results','grade','grades','grading','scoremark','achievement','achievements','cgpa','gpa','mark','marks','outcome','outcomes','attainment','performance'],
  ai: ['ml','ai','artificial','intelligence'],
  classify: ['classification','classifier','classifiers','classify','classifying','categorize','categorise','categorization','categorisation','categories','category'],
  detect: ['detection','detecting','detector','recognition','recognize','recognise','recognizing','recognising','identify','identification','identifying','detect'],
  recommend: ['recommendation','recommendations','recommender','recommending','recommend','suggest','suggestion','suggestions'],
  vehicle: ['car','cars','automobile','automobiles','vehicles','vehicle'],
  disease: ['illness','illnesses','ailment','ailments','sickness','disorder','disorders','diseases','disease'],
  diagnose: ['diagnosis','diagnosing','diagnostic','diagnostics','diagnose'],
  security: ['secure','secured','protection','protecting','safeguard','safety','cybersecurity','security'],
  fraud: ['fraudulent','scam','scams','fraudulence','fraud'],
  sentiment: ['opinion','opinions','emotion','emotions','emotional','feeling','feelings','mood','sentiment'],
  chatbot: ['bot','bots','assistant','assistants','conversational','chatbots','chatbot'],
  image: ['images','photo','photos','picture','pictures','visual','visuals','imagery','image'],
  text: ['textual','nlp','language','languages','linguistic','text'],
  web: ['online','internet','website','websites','webbased','www','web'],
  mobile: ['android','ios','smartphone','smartphones','phone','phones','handheld','mobile'],
  schedule: ['timetable','timetables','timetabling','scheduling','scheduler','schedules','calendar','schedule'],
  attendance: ['attend','attending','attendee','attendees','presence','attendance'],
  inventory: ['stock','stocks','warehousing','warehouse','inventory'],
  ecommerce: ['commerce','shopping','marketplace','store','stores','shop','shops','retail','ecommerce'],
  payment: ['pay','paying','payments','billing','invoice','invoicing','transaction','transactions','payment'],
  health: ['healthcare','medical','medicine','clinical','clinic','hospital','patient','patients','health'],
  monitor: ['monitoring','surveillance','tracking','track','tracker','tracing','observation','monitor'],
  manage: ['manage','managing','manager','administration','administer','administrative','governance','management'],
  automate: ['automation','automated','automating','automatic','automate'],
};
const SYNONYMS = {};
for (const [canon, words] of Object.entries(SYN_GROUPS)) for (const w of words) SYNONYMS[w] = canon;

// Conservative stemmer for words that aren't in the synonym map.
function stem(w) {
  if (w.length <= 4) return w;
  let s = w;
  if (s.endsWith('ies') && s.length > 4) s = s.slice(0, -3) + 'y';
  else if (s.endsWith('ing') && s.length > 5) s = s.slice(0, -3);
  else if (s.endsWith('ed') && s.length > 4) s = s.slice(0, -2);
  if (s.endsWith('ion') && s.length > 5) s = s.slice(0, -3);   // prediction -> predict
  if (s.endsWith('s') && !s.endsWith('ss') && s.length > 4) s = s.slice(0, -1);
  if (/([^aeiou])\1$/.test(s)) s = s.slice(0, -1);             // runn -> run
  return s;
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
    .map((t) => (SYNONYMS[t] ? SYNONYMS[t] : stem(t)));
}

function tfMap(title, abstract) {
  const map = new Map();
  const add = (tokens, w) => { for (const t of tokens) map.set(t, (map.get(t) || 0) + w); };
  add(normalize(title), 3);
  add(normalize(abstract), 1);
  return map;
}

function cosine(a, b) {
  let dot = 0;
  for (const [t, av] of a) { const bv = b.get(t); if (bv) dot += av * bv; }
  let na = 0; for (const v of a.values()) na += v * v;
  let nb = 0; for (const v of b.values()) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function compareProject(candidate, existing, { top = 3, threshold = 12 } = {}) {
  const cand = tfMap(candidate.title, candidate.abstract);
  const scored = (existing || [])
    .map((p) => ({
      project_id: p.project_id,
      title: p.title,
      score: Math.round(cosine(cand, tfMap(p.title, p.abstract)) * 100),
    }))
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
  return { score: scored.length ? scored[0].score : 0, matches: scored };
}

module.exports = { compareProject, tokenize: normalize };
