// Picks the few profile sections relevant to a question, so the model gets
// grounded facts without paying for the whole knowledge base every time.
//
// Plain keyword retrieval (BM25 over stemmed words, headings weighted 3×,
// mild length normalisation so long skill lists aren't buried) —
// no embeddings, no extra API calls, microseconds per query. Section
// headings in knowledge/*.md double as search keywords.
import SECTIONS from './knowledge-data.js';

const MAX_SECTIONS = 3;
const MAX_CHARS = 3600;          // ≈ 900 tokens of context, worst case
const MAX_NAMED = 4;             // sections a visitor names explicitly ("compare A, B and C")
const MIN_RELATIVE_SCORE = 0.4;  // drop sections far weaker than the best match

// Role-fit questions ("would I fit this role?", a pasted job posting) need the
// gaps as well as the matches, so these sections always come along
const FIT_SECTIONS = 4;          // best matches against the posting's requirements
const FIT_CHARS = 4000;          // ≈ 1000 tokens for those, plus the pinned ones below
// Language, location and hours are common knock-out requirements; both sections are short
const FIT_PINNED = ['Education and degree', 'Spoken languages', 'Availability, job search and contact',
    'Things he does not claim', 'Weaknesses, gaps and working style'];

const STOPWORDS = new Set(('a an and are as at be but by can could did do does for from had has have he her his how i ' +
    'if in into is it its me my of on or our she so tell that the their them there these they this to was we were ' +
    'what when where which who why will with would you your about any some more also just than then mirang ' +
    'bhandari him show give know please explain describe experience experienced use used using familiar ' +
    'good fit much many like really say says word words write short sentence sentences one two three hi hey ' +
    'hello bye thanks thank please okay ok yes no').split(' '));

// Words visitors use → words the profile uses
const SYNONYMS = {
    cv: 'resume experience', resume: 'experience education', job: 'role experience availability',
    jobs: 'role experience availability', hire: 'availability', hiring: 'availability', available: 'availability',
    visa: 'availability', relocate: 'relocation availability', salary: 'availability', internship: 'intern',
    work: 'experience role', worked: 'experience role', employer: 'experience role', company: 'experience role',
    db: 'deutsche bank', bank: 'deutsche', finetune: 'fine-tuning lora', finetuning: 'fine-tuning lora',
    tuning: 'fine-tuning lora', train: 'fine-tuning', llm: 'llm model', llms: 'llm model', ai: 'agentic llm',
    agent: 'agentic agent', agents: 'agentic agent', k8s: 'kubernetes', aws: 'aws cloud', cloud: 'aws cloud devops',
    cicd: 'ci/cd jenkins', pipeline: 'pipeline ci/cd', devops: 'devops jenkins', security: 'security vulnerability',
    study: 'msc coursework education', studied: 'msc coursework education', course: 'coursework', courses: 'coursework',
    university: 'education msc', degree: 'education msc', school: 'education', weakness: 'weaknesses gaps',
    strength: 'differentiators skills', strengths: 'differentiators skills', stack: 'skills', tech: 'skills',
    language: 'languages', speak: 'spoken languages german', german: 'german spoken', hackathon: 'hackathons',
    blockchain: 'mcpay algorand', crypto: 'mcpay algorand', payment: 'mcpay', rag: 'rag retrieval',
    graphrag: 'graphrag knowledge graphs', eval: 'evaluation benchmark', evaluation: 'evaluation benchmark',
    benchmark: 'benchmark evaluation', python: 'python skills', react: 'react frontend', website: 'agentfolio',
    site: 'agentfolio', portfolio: 'agentfolio', certificate: 'certifications', certified: 'certifications',
};

/**
 * Crude stem: the first 6 letters of longer words, so "evaluate", "evaluation"
 * and "evaluating" all become "evalua"; a plural "s" on short words. Hyphenated
 * and slashed words also count as their parts ("fine-tuning" → "fine", "tuning").
 */
const stem = (w) => (w.length > 6 ? w.slice(0, 6) : w.replace(/s$/, ''));

function terms(text) {
    const out = [];
    for (const word of text.toLowerCase().match(/[a-z0-9+#]+(?:[./-][a-z0-9+#]+)*/g) ?? []) {
        const parts = /[./-]/.test(word) && !/\d/.test(word) ? [word, ...word.split(/[./-]/)] : [word];
        for (const p of parts) if (p.length > 1 && !/^\d+$/.test(p) && !STOPWORDS.has(p)) out.push(p.length > 3 ? stem(p) : p);
    }
    return out;
}

// Index built once per cold start (the profile is small)
const docs = SECTIONS.map(s => {
    const tf = new Map();
    const add = (t, weight) => tf.set(t, (tf.get(t) ?? 0) + weight);
    for (const t of terms(s.title)) add(t, 3);
    for (const t of terms(s.text)) add(t, 1);
    return { ...s, tf, len: [...tf.values()].reduce((a, b) => a + b, 0) };
});
const avgLen = docs.reduce((a, d) => a + d.len, 0) / (docs.length || 1);
const df = new Map();
for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
// How many section headings contain each word — a word in only one or two
// headings ("omnic", "keysight") names a specific section
const titleDf = new Map();
for (const d of docs) for (const t of new Set(terms(d.title))) titleDf.set(t, (titleDf.get(t) ?? 0) + 1);
const idf = (t) => Math.log(1 + (docs.length - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));

function bm25(doc, query) {
    let score = 0;
    for (const [t, qWeight] of query) {
        const f = doc.tf.get(t);
        if (!f) continue;
        score += qWeight * idf(t) * (f * 2.2) / (f + 1.2 * (0.5 + 0.5 * doc.len / avgLen));
    }
    return score;
}

/**
 * The best-matching sections for `question`, formatted for the prompt, or ''
 * when nothing is relevant (greetings, small talk). `context` (the previous
 * question) helps follow-ups like "tell me more about that" — at lower weight.
 */
export function retrieve(question, context = '', fit = false) {
    if (!docs.length) return '';
    const query = new Map();
    const add = (text, weight) => {
        for (const w of terms(text)) {
            query.set(w, (query.get(w) ?? 0) + weight);
            const raw = text.toLowerCase().match(new RegExp(`\\b${w}\\w*`))?.[0];
            for (const s of terms(SYNONYMS[w] ?? SYNONYMS[raw] ?? '')) query.set(s, (query.get(s) ?? 0) + weight * 0.6);
        }
    };
    add(question, 1);
    add(context, 0.35);
    if (!query.size) return '';

    const ranked = docs.map(d => ({ d, score: bm25(d, query) })).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
    if (!ranked.length) return '';

    // A word the visitor typed that names a section ("Omnic", "Keysight")
    // guarantees that section a slot, so "compare A, B and C" covers all three
    const asked = new Set(terms(question));
    const named = ranked.filter(({ d }) => terms(d.title).some(t => asked.has(t) && (titleDf.get(t) ?? 0) <= 2));
    const order = [...named, ...ranked.filter(r => !named.includes(r))];
    const maxSections = fit ? FIT_SECTIONS : Math.max(MAX_SECTIONS, Math.min(named.length, MAX_NAMED));
    const maxChars = fit ? FIT_CHARS : named.length > 1 ? MAX_CHARS * 1.5 : MAX_CHARS;

    const picked = [];
    let chars = 0;
    for (const r of order) {
        if (picked.length >= maxSections) break;
        if (!named.includes(r) && r.score < ranked[0].score * MIN_RELATIVE_SCORE) continue;
        if (chars + r.d.text.length > maxChars && picked.length) continue;
        picked.push(r.d);
        chars += r.d.text.length;
    }
    if (fit) for (const d of docs) if (FIT_PINNED.includes(d.title) && !picked.includes(d)) picked.push(d);
    return picked.map(d => `[${d.title}] ${d.text}`).join('\n');
}
