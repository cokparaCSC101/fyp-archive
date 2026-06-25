// =====================================================================
//  Lightweight text-similarity for catching near-duplicate projects.
//  No external dependencies. Builds a term-frequency vector from each
//  project's title + abstract (title weighted more heavily, since
//  duplicates usually share a title) and compares with cosine similarity.
//  Returns a 0–100 score and the closest existing matches.
// =====================================================================

// Common English + domain words that carry little distinguishing signal
// in a CS project archive (so they don't inflate similarity).
const STOPWORDS = new Set(
  `a an the of and or to for in on at by with from as is are was were be been being it its
   this that these those into using use used based system systems project projects study studies
   analysis approach development design implementation model models application applications app
   platform university student students final year department computer science research paper
   propose proposed new towards via their our using able feature features data`
    .split(/\s+/)
);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// Term-frequency map; title tokens are weighted ×3.
function tfMap(title, abstract) {
  const map = new Map();
  const add = (tokens, w) => { for (const t of tokens) map.set(t, (map.get(t) || 0) + w); };
  add(tokenize(title), 3);
  add(tokenize(abstract), 1);
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

// candidate: { title, abstract }
// existing : [{ project_id, title, abstract }]
// returns  : { score, matches } — score is the top match (0–100),
//            matches is up to `top` items [{ project_id, title, score }].
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

module.exports = { compareProject, tokenize };
