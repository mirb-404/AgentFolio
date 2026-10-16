// Shared by the server (api/chat.js: fit-mode prompt and retrieval) and the
// browser (src/lib/cannedAnswers.ts: such questions skip the canned widgets,
// which would otherwise answer a posting that says "experience" with the work history).

/**
 * True for a pasted job posting, or a question about fitting a role. Postings
 * are long and use recruiting words; short questions need "fit"-type wording
 * plus a role word ("am I a good fit for an ML intern role?").
 */
export function isRoleFit(question) {
    const q = question.toLowerCase();
    const postingWords = q.match(/\b(requirements?|responsibilit|qualifications?|about the (job|role)|we are looking|you will|your tasks|tasks|we offer|must have|nice to have|hiring|apply|candidate|anforderungen|aufgaben|wir bieten|dein profil|ihr profil|qualifikation|bewerb|stellenangebot)/g) ?? [];
    if (q.length >= 300 && new Set(postingWords).size >= 2) return true;
    return /\b(fit|suit(ed|able)?|match|qualified|right candidate|hire (you|mirang)|passt|passen|geeignet)\b/.test(q)
        && /\b(role|job|position|intern(ship)?|werkstudent|working student|team|opening|vacancy|stelle|rolle|praktikum)\b/.test(q);
}
