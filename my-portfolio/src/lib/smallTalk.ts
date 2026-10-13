/**
 * Instant, free replies to messages that are ONLY small talk ("hi!", "thanks",
 * "are you a bot?"). Without this, each one costs a full model call — system
 * prompt included — just to say hello back.
 *
 * Patterns match the whole message after normalising it (lowercase, no
 * punctuation or emoji), so anything with a real question attached
 * ("hi, what's your experience with RAG?") still goes to the model.
 */

const TOPICS = 'my **projects**, **work experience**, **skills**, **résumé** or **recent GitHub activity**';
const FREE_NOTE = 'Those topics — and the buttons in the sidebar — answer instantly and are always free.';

type Rule = { match: RegExp; replies: string[] };

// Optional "hi"/"hey" in front of a phrase: "hey how are you"
const GREET = '(?:(?:hi|hey|hello|yo)\\s+(?:there\\s+)?(?:mirang\\s+)?)?';

const RULES: Rule[] = [
    {
        match: /^(?:hi+|hey+|hello+|heya|hiya|yo|sup|howdy|hallo|servus|moin|namaste|greetings|good (?:morning|afternoon|evening|day)|guten (?:tag|morgen|abend))(?:\s+(?:there|mirang|everyone|all|again|friend))?$/,
        replies: [
            `Hi! 👋 I'm Mirang's portfolio assistant. Ask me about ${TOPICS} — or anything else about my work.`,
            `Hey, welcome! Want to start with ${TOPICS}? ${FREE_NOTE}`,
        ],
    },
    {
        match: new RegExp(`^${GREET}(?:how are you|how r u|how are you doing|hows it going|how is it going|how are things|whats up|wassup|whats new|how do you do)(?:\\s+(?:today|doing|mirang))?$`),
        replies: [
            `Doing well, thanks for asking! What would you like to know — ${TOPICS}?`,
            `All good here! I'm happy to walk you through ${TOPICS}.`,
        ],
    },
    {
        match: /^(?:thanks?|thank you|thank u|thx|ty|tysm|cheers|danke|danke schön|dankeschön|appreciate it|much appreciated|thanks a lot|thanks so much|thank you so much|great thanks|ok thanks|okay thanks|cool thanks|perfect thanks)(?:\s+(?:mirang|a lot|so much|again))?$/,
        replies: [
            `You're welcome! Anything else you'd like to know? If you'd like to reach me directly, just ask for the **contact form**.`,
            `Happy to help! Feel free to ask about anything else — or say **contact me** to send me a message.`,
        ],
    },
    {
        match: /^(?:bye+|goodbye|good bye|see you|see ya|cya|later|ciao|tschüss|tschuss|ttyl|have a (?:good|nice|great) (?:day|one|evening|weekend)|thats all|that is all|im done)(?:\s+(?:mirang|then|for now|now))?$/,
        replies: [
            `Thanks for stopping by! If you want to get in touch later, say **contact me** or use the profile at the bottom of the sidebar. 👋`,
            `Bye, and thanks for visiting! My résumé and contact form are always one click away in the sidebar.`,
        ],
    },
    {
        match: /^(?:ok|okay|k|kk|cool|nice|great|awesome|amazing|got it|gotcha|alright|all right|sure|perfect|wow|interesting|neat|sounds good|makes sense|i see|lol|lmao|(?:ha){2,}h?|(?:he){2,}h?|fair enough|good|very good|noted)$/,
        replies: [
            `Glad that helps! Want to dig into ${TOPICS} next?`,
            `👍 Anything else? Projects, experience, skills and the résumé are all one click away in the sidebar.`,
        ],
    },
    {
        match: /^(?:are you|r u|is this|am i talking to|am i chatting with)\s+(?:(?:a|an|the|really|actually|real|just)\s+)*(?:bot|ai|robot|human|person|real|chatgpt|gpt|llm|mirang|him|you|machine)(?:\s+or\s+(?:a\s+)?(?:bot|ai|human|real|robot))?$/,
        replies: [
            `I'm an AI assistant that answers as Mirang, using his profile and résumé — not Mirang typing live. For a real conversation with him, say **contact me** and send a message.`,
        ],
    },
    {
        match: /^(?:what can you do|what can i ask(?: you)?|what do you do|what should i ask|what is this|what is this (?:site|website|page|place)|whats this|how does this work|how do i use this|help me|menu|options|commands|where do i start|what now)$/,
        replies: [
            `This is Mirang's portfolio as a chat. You can:

- Ask about ${TOPICS}. These answer instantly and are always free, as are the topics in the sidebar.
- Ask anything more specific, like "How did you evaluate your fine-tuned models?". Those are answered by AI and use a small allowance, shown by the ring next to the send button.
- Say **contact me** to send Mirang a message.`,
        ],
    },
    {
        match: /^(?:who (?:made|built|created|designed|coded) (?:this|you|this site|this website|this page|this chatbot)|is this your (?:site|website|portfolio))$/,
        replies: [
            `I built this myself — AgentFolio is a chat-first portfolio (React, TypeScript, Vite, Tailwind) where common questions are answered instantly and everything else goes to an LLM through a serverless proxy. Ask about my **projects** for more.`,
        ],
    },
    {
        match: /^(?:(?:this is |what a |such a )?(?:nice|cool|great|awesome|amazing|beautiful|clean|impressive|sick|love (?:the|this|your)) (?:site|website|portfolio|page|design|ui|work|idea|chatbot|bot)|love it|love this|well done|good job|great job|great work|nice work|impressive)$/,
        replies: [
            `Thank you, that's kind! 😊 It's built as a chat on purpose — ask about my **projects** to see what else I've made.`,
        ],
    },
    {
        match: /^(?:test|testing|test test|asdf|hello world|ping|\?)$/,
        replies: [`Loud and clear! ✅ Try asking about ${TOPICS}.`],
    },
];

const ALL_REPLIES = new Set(RULES.flatMap(r => r.replies));

/** Lowercase, drop punctuation/emoji/apostrophes, collapse spaces ("?" alone survives as "?") */
const normalise = (input: string) => {
    const text = input.toLowerCase().replace(/['’`]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    return text || (/^\s*\?+\s*$/.test(input) ? '?' : '');
};

/** A reply if the whole message is small talk, otherwise null */
export function smallTalkReply(input: string): string | null {
    const text = normalise(input);
    if (!text || text.length > 60) return null;
    const rule = RULES.find(r => r.match.test(text));
    if (!rule) return null;
    return rule.replies[Math.floor(Math.random() * rule.replies.length)];
}

/** True for replies produced here — they skip the "thinking" steps */
export const isSmallTalkReply = (response: string) => ALL_REPLIES.has(response);
