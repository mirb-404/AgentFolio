import { portfolioData } from '../data/portfolioData';
import { smallTalkReply, isSmallTalkReply } from './smallTalk';

/**
 * Canned answers: common questions are matched by keyword and answered from
 * portfolioData without calling the model. `{{TAGS}}` in a reply render as
 * rich widgets (see components/chat/ChatMessage.tsx).
 */

/** Returns a canned reply for `input`, or null to let the model answer */
export const getPredefinedResponse = (input: string): string | null => {
    const normalizedInput = input.trim().toLowerCase();

    if (normalizedInput === 'help') {
        return `A few things you can type:\n\n- \`clear\` to start over\n- \`matrix\` and you'll see`;
    }

    // Before the keyword rules, so "nice work!" is a compliment, not a request for work history
    const chat = smallTalkReply(input);
    if (chat) return chat;

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
    if (isSmallTalkReply(response)) return []; // a "hi" back needs no thinking
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

// Which visitor wording justifies each widget the model may append
const WIDGET_TOPICS: Record<string, RegExp> = {
    '{{PROJECTS}}': /project|built|build|portfolio|made|work on|working on/i,
    '{{SKILLS}}': /skill|stack|tech|tool|language|framework|know|experience with|familiar/i,
    '{{RESUME}}': /r[ée]sum[ée]|\bcv\b/i,
    '{{HOBBIES}}': /hobb|interest|free time|outside (of )?(work|code)|fun/i,
};

/**
 * Models love em dashes and non-breaking hyphens even when asked not to.
 * Number ranges become plain hyphens ("2020-2024"); dashes between words
 * become commas.
 */
const tidyDashes = (text: string): string => text
    .replace(/[\u2010\u2011]/g, '-')
    .replace(/(?<=[\d€$%kKmM])\s*[\u2013\u2014]\s*(?=[\d€$~])/g, '-')
    .replace(/(?<=[:;,.!?])\s*[\u2013\u2014]+\s*/g, ' ')
    .replace(/\s*[\u2013\u2014]\s*(?=\n|$)/g, '')
    .replace(/^\s*[\u2013\u2014]\s*/gm, '')
    .replace(/\s*[\u2013\u2014]+\s*/g, ', ');

/**
 * The model sometimes tacks a widget onto answers that don't need one (a
 * skills grid under "hi!"). Keep a model-added tag only when the visitor's
 * question was about that topic. {{GITHUB}} is left alone — the GitHub tool
 * flow adds it deliberately.
 */
export const cleanModelAnswer = (answer: string, question: string): string =>
    tidyDashes(answer).replace(/\n*\{\{(PROJECTS|SKILLS|RESUME|HOBBIES)\}\}/g, (tag, name) =>
        WIDGET_TOPICS[`{{${name}}}`].test(question) ? tag : '');
