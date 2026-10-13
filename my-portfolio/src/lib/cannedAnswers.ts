import { portfolioData } from '../data/portfolioData';

/**
 * Canned answers: common questions are matched by keyword and answered from
 * portfolioData without calling the model. `{{TAGS}}` in a reply render as
 * rich widgets (see components/chat/ChatMessage.tsx).
 */

/** Returns a canned reply for `input`, or null to let the model answer */
export const getPredefinedResponse = (input: string): string | null => {
    const normalizedInput = input.trim().toLowerCase();

    if (normalizedInput === 'help') {
        return `A few things you can type:\n\n- \`clear\` — start over\n- \`matrix\` — you'll see`;
    }

    if (
        normalizedInput.includes("tell me about yourself") ||
        normalizedInput === "who are you?" ||
        normalizedInput === "who are you"
    ) {
        return "{{BIO}}";
    }

    if (
        normalizedInput.includes("show me your projects") ||
        normalizedInput.includes("list your projects") ||
        (normalizedInput.includes("projects") && normalizedInput.length < 20)
    ) {
        return "Here are some of the key projects I've worked on recently:\n\n{{PROJECTS}}";
    }

    if (
        normalizedInput.includes("what are your skills") ||
        normalizedInput.includes("technical skills") ||
        (normalizedInput.includes("skills") && normalizedInput.length < 20)
    ) {
        return "I work across AI, data science, and web development. Here's my stack:\n\n{{SKILLS}}";
    }

    if (
        normalizedInput.includes("experience") ||
        normalizedInput.includes("work") ||
        normalizedInput.includes("employment")
    ) {
        return "Here's my professional journey so far:\n\n{{EXPERIENCE}}";
    }

    if (normalizedInput.includes("certification") || normalizedInput.includes("certificate")) {
        return `These are my certifications:\n\n{{CERTIFICATIONS}}`;
    }

    if (
        normalizedInput.includes("hobbies") ||
        normalizedInput.includes("hobby") ||
        normalizedInput.includes("interest")
    ) {
        return `Here's a bit about what I do outside of work:\n\n{{HOBBIES}}`;
    }

    if (
        normalizedInput.includes("contact") ||
        normalizedInput.includes("social") ||
        normalizedInput.includes("email") ||
        normalizedInput.includes("reach") ||
        normalizedInput.includes("hire") ||
        normalizedInput.includes("message")
    ) {
        if (normalizedInput.includes("form") || normalizedInput.includes("message") || normalizedInput.includes("send") || normalizedInput.includes("contact") || normalizedInput.includes("hire") || normalizedInput.includes("hiring")) {
            return "{{CONTACT_FORM}}";
        }
        const socials = portfolioData.socials.map(s => `[${s.name}](${s.url})`).join(' · ');
        return `You can reach me via:\n\n${socials}`;
    }

    // GitHub questions use the 6-hour edge-cached summary in production
    if (
        normalizedInput.includes("github") ||
        normalizedInput.includes("working on") ||
        normalizedInput.includes("coding right now") ||
        normalizedInput.includes("repos") ||
        normalizedInput.includes("commit") ||
        normalizedInput.includes("recent")
    ) {
        return "{{FETCH_CACHED_LLM_GITHUB}}";
    }

    if (
        normalizedInput.includes("resume") ||
        normalizedInput.includes("cv") ||
        normalizedInput.includes("download resume")
    ) {
        return "Here's my full résumé:\n\n{{RESUME}}";
    }

    if (normalizedInput.includes("surprise me") || normalizedInput.includes("fun fact")) {
        const randomFact = portfolioData.funFacts[Math.floor(Math.random() * portfolioData.funFacts.length)];
        return `Here's a fun fact about me: ${randomFact}`;
    }

    return null;
};

/** The visible steps for a canned answer, keyed off the widget it renders */
export const planFor = (response: string): string[] => {
    const { projects, experience, skills, certifications } = portfolioData;
    if (response.includes('{{PROJECTS}}')) return ['Searching projects…', `Found ${projects.length} projects`];
    if (response.includes('{{EXPERIENCE}}')) return ['Looking up work history…', `${experience.length} roles found`];
    if (response.includes('{{SKILLS}}')) return ['Reading tech stack…', `${skills.length} areas`];
    if (response.includes('{{CERTIFICATIONS}}')) return ['Checking certifications…', `${certifications.length} found`];
    if (response.includes('{{BIO}}')) return ['Loading profile…'];
    if (response.includes('{{HOBBIES}}')) return ['Looking up interests…'];
    if (response.includes('{{CONTACT_FORM}}')) return ['Preparing contact form…'];
    if (response.includes('{{RESUME}}')) return ['Fetching résumé…'];
    return ['Searching knowledge base…'];
};
