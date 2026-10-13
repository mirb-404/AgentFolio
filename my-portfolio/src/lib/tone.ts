export type Tone = 'default' | 'concise' | 'detailed';

/** Tone hint appended to the system prompt for LLM answers */
export const TONE_PROMPTS: Record<Tone, string> = {
    default: '',
    concise: 'TONE: Be brief. Two or three sentences at most, unless you are outputting a widget tag.',
    detailed: 'TONE: Be thorough and technical. Explain architecture, trade-offs, and the specific tools involved.',
};
