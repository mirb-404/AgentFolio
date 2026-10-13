import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { User, FolderGit2, Briefcase, Github, Mail, ArrowDown, ArrowLeft, Menu } from 'lucide-react';
import { isHidden, motionTier } from '../lib/motion';
import { withViewTransition } from '../lib/viewTransition';
import ChatMessage from './ChatMessage';
import Composer from './Composer';
import ContactForm from './ContactForm';
import { ThinkingIndicator, type Trace } from './Thinking';
import { TONE_PROMPTS, type Tone } from '../lib/tone';
import { portfolioData } from '../data/portfolioData';
import { githubActivityToolDefinition, fetchGithubActivity } from './githubAgent';
import { fetchQuota, exhaustedMessage, type Quota } from '../lib/quota';

const MatrixEffect = lazy(() => import('./MatrixEffect'));
const ProjectDetailModal = lazy(() => import('./ProjectDetailModal'));

type Message = {
    id: string;
    role: 'agent' | 'user' | 'tool';
    content: React.ReactNode;
    isStreaming?: boolean;
    name?: string; // For tool responses
    tool_calls?: any[]; // To track when the LLM decides to use a tool
    trace?: Trace;
};

interface ChatInterfaceProps {
    tone: Tone;
    activePrompt: string | null;
    onPromptHandled: () => void;
    /** Reveal the sidebar's full topic list (it may be collapsed or off-canvas) */
    onBrowseTopics: () => void;
}

const SUGGESTIONS = [
    { label: 'About me', prompt: 'Tell me about yourself', Icon: User },
    { label: 'Projects', prompt: 'Show me your projects', Icon: FolderGit2 },
    { label: 'Experience', prompt: 'Tell me about your experience', Icon: Briefcase },
    { label: "What he's building", prompt: 'Recent GitHub Activity', Icon: Github },
    { label: 'Get in touch', prompt: 'Contact me', Icon: Mail },
];

const WRITING = 'Writing response…';
// Autofocus only where it can't pop a virtual keyboard over the page
const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// rAF is suspended in background tabs — fall back to a timer so answers still land
const schedule = (fn: () => void) => {
    if (isHidden()) window.setTimeout(fn, 100);
    else requestAnimationFrame(fn);
};

/** The visible steps for a canned answer, keyed off the widget it renders */
const planFor = (response: string): string[] => {
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

const ChatInterface: React.FC<ChatInterfaceProps> = ({ tone, activePrompt, onPromptHandled, onBrowseTopics }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [liveLabel, setLiveLabel] = useState<string | null>(null);
    const [showMatrix, setShowMatrix] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    // Token allowance for model answers — canned answers don't touch it
    const [quota, setQuota] = useState<Quota | null>(null);
    const quotaRef = useRef<Quota | null>(null);
    quotaRef.current = quota;

    useEffect(() => {
        let live = true;
        fetchQuota().then(q => { if (live && q) setQuota(q); });
        return () => { live = false; };
    }, []);

    const busy = isTyping;
    const isEmpty = messages.length === 0;

    const abortControllerRef = useRef<AbortController | null>(null);
    // Each send gets a run id; Stop / New chat bump it so in-flight work
    // notices it's stale after every await and quietly bails
    const runRef = useRef(0);
    const traceRef = useRef<{ steps: string[]; start: number }>({ steps: [], start: 0 });
    const toneRef = useRef(tone);
    toneRef.current = tone;

    const messagesRef = useRef<Message[]>(messages);
    messagesRef.current = messages;

    // Abandon in-flight work when the chat is reset (remounted)
    useEffect(() => () => {
        runRef.current++;
        abortControllerRef.current?.abort();
    }, []);

    // --- Scroll follow --------------------------------------------------------
    // One rAF loop eases the transcript toward the bottom while "following".
    // New messages, streamed text and late-growing widgets all just kick the
    // loop, so there is never a second scroll animation to fight with.
    const scrollerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const followingRef = useRef(true);
    const followRafRef = useRef(0);
    const lastTopRef = useRef(0);
    const [showJump, setShowJump] = useState(false);

    const measure = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;
        setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
    }, []);

    const followTick = useCallback(() => {
        followRafRef.current = 0;
        const el = scrollerRef.current;
        if (!el || !followingRef.current) return;
        const target = el.scrollHeight - el.clientHeight;
        const diff = target - el.scrollTop;
        if (diff <= 1) return;
        // Ease ~22% of the remaining distance per frame; reduced motion jumps
        const next = motionTier() === 'off' ? target : el.scrollTop + Math.max(1, diff * 0.22);
        el.scrollTop = Math.min(target, Math.ceil(next));
        lastTopRef.current = el.scrollTop;
        followRafRef.current = requestAnimationFrame(followTick);
    }, []);

    const kickFollow = useCallback(() => {
        if (!followRafRef.current) followRafRef.current = requestAnimationFrame(followTick);
    }, [followTick]);

    useEffect(() => {
        const content = contentRef.current;
        if (!content) return;
        const observer = new ResizeObserver(() => { kickFollow(); measure(); });
        observer.observe(content);
        return () => {
            observer.disconnect();
            cancelAnimationFrame(followRafRef.current);
            followRafRef.current = 0;
        };
    }, [kickFollow, measure, isEmpty]);

    const handleScroll = () => {
        const el = scrollerRef.current;
        if (!el) return;
        // Moving up by something other than our own writes = the visitor scrolled
        if (el.scrollTop < lastTopRef.current - 2) followingRef.current = false;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) followingRef.current = true;
        lastTopRef.current = el.scrollTop;
        measure();
    };
    const disengageFollow = () => { followingRef.current = false; };
    const jumpToBottom = () => { followingRef.current = true; kickFollow(); };
    const touchStartYRef = useRef(0);

    // Prompts from the sidebar
    useEffect(() => {
        if (activePrompt) {
            handleSendMessage(activePrompt);
            onPromptHandled();
        }
    }, [activePrompt]);

    useEffect(() => {
        if (!isEmpty) {
            followingRef.current = true;
            kickFollow();
        }
    }, [messages.length, isEmpty, kickFollow]);

    // --- Thinking trace -------------------------------------------------------

    const beginTrace = () => {
        traceRef.current = { steps: [], start: performance.now() };
    };
    const addStep = (label: string) => {
        traceRef.current.steps.push(label);
        setLiveLabel(label);
    };
    /** Freeze the trace onto the message that ends the thinking phase */
    const snapshotTrace = (writing: boolean): Trace | undefined => {
        const { steps, start } = traceRef.current;
        if (!steps.length) return undefined;
        return { steps: writing ? [...steps, WRITING] : [...steps], ms: performance.now() - start };
    };
    const finish = () => {
        setIsTyping(false);
        setLiveLabel(null);
    };

    // --- Sending --------------------------------------------------------------

    const dispatchMessage = (text: string) => {
        followingRef.current = true;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
        // The trace resets now; the visible state may land a frame later inside
        // a view transition, and must not wipe steps added in the meantime
        beginTrace();
        const start = () => {
            setMessages(prev => [...prev, userMsg]);
            setIsTyping(true);
        };
        // First message: the composer glides from the centre down to its dock
        if (messagesRef.current.length === 0) withViewTransition(start);
        else start();

        const run = ++runRef.current;
        generateResponseStream(text, [...messagesRef.current, userMsg], run);
    };

    // Routed through a latest-value ref so the callback handed to memoised
    // children keeps a stable identity while responses stream
    const sendRef = useRef<(text: string) => void>(() => {});
    sendRef.current = (text: string) => {
        if (!text.trim() || busy) return;
        if (processCommand(text)) return;
        dispatchMessage(text);
    };
    const handleSendMessage = useCallback((text: string) => sendRef.current(text), []);

    const handleStop = useCallback(() => {
        runRef.current++;
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setMessages(prev => prev
            .filter(m => !(m.isStreaming && m.content === ''))
            .map(m => (m.isStreaming ? { ...m, isStreaming: false } : m)));
        finish();
    }, []);

    const processCommand = (input: string): boolean => {
        const cmd = input.trim().toLowerCase();
        if (cmd === 'clear' || cmd === 'cls') {
            setMessages([]);
            return true;
        }
        if (cmd === 'matrix') {
            setShowMatrix(true);
            return true;
        }
        return false;
    };

    const getPredefinedResponse = (input: string): string | null => {
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
            if (import.meta.env.DEV) return null; // Local dev: let the normal Groq flow handle it
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

    const streamLocalResponse = async (responseText: string, run: number) => {
        if (run !== runRef.current) return;
        const msgId = (Date.now() + 1).toString();

        setMessages(prev => [...prev, {
            id: msgId,
            role: 'agent',
            content: "",
            isStreaming: true,
            trace: snapshotTrace(true),
        }]);

        const ctrl = new AbortController();
        abortControllerRef.current = ctrl;

        // Typewriter driven by elapsed time, committed at most once per COMMIT_MS
        const CHARS_PER_SECOND = 320;
        const COMMIT_MS = 32;

        await new Promise<void>((resolve) => {
            const startedAt = performance.now();
            let shown = 0;
            let lastCommit = 0;

            const step = () => {
                if (ctrl.signal.aborted) { resolve(); return; }

                const now = performance.now();
                const target = Math.min(
                    responseText.length,
                    Math.floor(((now - startedAt) / 1000) * CHARS_PER_SECOND)
                );
                const done = target >= responseText.length;

                if (target !== shown && (done || now - lastCommit >= COMMIT_MS)) {
                    shown = target;
                    lastCommit = now;
                    const slice = responseText.slice(0, shown);
                    setMessages(prev => prev.map(msg =>
                        msg.id === msgId ? { ...msg, content: slice } : msg
                    ));
                }

                if (done) { resolve(); return; }
                schedule(step);
            };
            schedule(step);
        });

        if (run !== runRef.current) return;
        setMessages(prev => prev.map(msg =>
            msg.id === msgId ? { ...msg, isStreaming: false } : msg
        ));
        finish();
        if (abortControllerRef.current === ctrl) abortControllerRef.current = null;
    };

    /**
     * Model tokens arrive in bursts. Rather than painting each burst as it
     * lands, the writer drains a backlog a little every frame — a sixth of
     * what's outstanding, so it keeps pace with the network but never lurches.
     */
    const createWriter = (msgId: string, run: number) => {
        let target = '';
        let shown = 0;
        let lastCommit = 0;
        let scheduled = false;
        let onDrained: (() => void) | null = null;

        const commit = (text: string) =>
            setMessages(prev => prev.map(msg => msg.id === msgId ? { ...msg, content: text } : msg));

        const frame = () => {
            scheduled = false;
            if (run !== runRef.current) { onDrained?.(); return; }
            const backlog = target.length - shown;
            if (backlog > 0) {
                shown += Math.max(1, Math.ceil(backlog / 6));
                const now = performance.now();
                if (shown >= target.length || now - lastCommit >= 32) {
                    commit(target.slice(0, shown));
                    lastCommit = now;
                }
            }
            if (shown < target.length) { scheduled = true; schedule(frame); }
            else onDrained?.();
        };

        return {
            push(text: string) {
                target = text;
                if (!scheduled) { scheduled = true; schedule(frame); }
            },
            /** Resolves once everything pushed so far is on screen */
            drained() {
                if (shown >= target.length) return Promise.resolve();
                return new Promise<void>(resolve => { onDrained = resolve; });
            },
        };
    };

    /**
     * Answers from canned content where possible, otherwise streams from Groq.
     * Handles tool calls by executing them and recursing with the result.
     */
    const generateResponseStream = async (input: string, currentMessages: Message[], run: number) => {
        const alive = () => run === runRef.current;
        // If the last message was a tool result, this is the LLM finalising — skip canned answers
        const isToolFollowUp = currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === 'tool';

        if (!isToolFollowUp) {
            const localResponse = getPredefinedResponse(input);
            if (localResponse) {
                if (localResponse === "{{FETCH_CACHED_LLM_GITHUB}}") {
                    addStep('Fetching GitHub activity…');
                    try {
                        const res = await fetch('/api/github-summary');
                        if (!res.ok) throw new Error("Edge function failed");
                        const data = await res.json();
                        if (!alive()) return;
                        addStep('Reading recent commits…');
                        await sleep(450);
                        await streamLocalResponse(data.summary, run);
                    } catch (err) {
                        console.error("GitHub summary fallback:", err);
                        await streamLocalResponse("I couldn't reach GitHub just now — here's my profile instead.\n\n{{GITHUB}}", run);
                    }
                    return;
                }

                const plan = planFor(localResponse);
                for (const label of plan) {
                    addStep(label);
                    await sleep(plan.length > 1 ? 450 : 700);
                    if (!alive()) return;
                }

                if (localResponse === "{{CONTACT_FORM}}") {
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'agent',
                        content: <ContactForm />,
                        trace: snapshotTrace(false),
                    }]);
                    finish();
                    return;
                }

                await streamLocalResponse(localResponse, run);
                return;
            }
        }

        const sayAndFinish = (content: string) => {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'agent', content, trace: snapshotTrace(false) }]);
            finish();
        };

        if (quotaRef.current?.exhausted) {
            sayAndFinish(exhaustedMessage(quotaRef.current));
            return;
        }

        abortControllerRef.current = new AbortController();
        let isToolCall = false;

        try {
            const systemPrompt = `You are an interactive AI portfolio assistant for Mirang Bhandari.

            CORE INSTRUCTIONS:
            1. Answer questions based on this core data: Mirang Bhandari is a Software Engineer & AI Researcher based in Mannheim, Germany, currently an MSc Applied Data Science & AI student at SRH Heidelberg. He specializes in AI, Backend, and Agentic workflows. He is currently an AI/ML Engineer (Research Partner) at Deutsche Bank, benchmarking agentic AI and LLM-based NLP workflows with Knowledge Graphs and comparing RAG against GraphRAG for financial NLP. Previously he worked at Keysight Technologies (DevOps) and Resolute.AI (Deep Learning). His projects include 'ATS' (a hiring platform), 'Mindwell' (offline mental wellness AI), 'StockScreener', 'TenderFlow' (an AI tender-response agent built at Q-Hack Mannheim), and 'mcpay' (a per-call payment layer for MCP tools built at the Algorand x402 hackathon in Berlin). He is AWS and LangChain certified.
            2. Be professional but personable. Answer in the first person ("I started coding when...").
            3. CRITICAL: When relevant, use the following TAGS to display rich widgets. Do not describe the widget, just output the tag on a new line.
            TAGS:
            - If the user asks about projects/work: Output the text intro, then "{{PROJECTS}}" at the end.
            - If the user asks about skills/stack/technologies: Output the text intro, then "{{SKILLS}}" at the end.
            - If the user asks for a resume/CV: Output a polite message, then "{{RESUME}}".
            - If the user asks about hobbies or interests: Output the text intro, then "{{HOBBIES}}" at the end.
            - If the user asks about recent GitHub activity or coding: Output the text intro, then "{{GITHUB}}" at the end.
            - If the user prompts "Surprise me" or asks for fun facts: Share a fun fact from the data.

            4. Keep responses concise. Use markdown for formatting.

            FORMATTING:
            - Use **bold** for key concepts, technologies, and project names.
            - Use \`code\` blocks for commands, shortcuts, or file names.
            - Use bullet points for lists of skills or steps.
            - Keep responses concise but conversational.
            AGENTIC TOOL INSTRUCTIONS:
            - If you call a tool (like \`fetch_github_activity\`) and receive a JSON response, YOU MUST ONLY cite the exact data inside that JSON API response.
            - CRITICAL: Do NOT add ANY information, filler, conversational tangents, or outside assumptions other than what is directly present in the tool call's returned JSON.
            - The JSON contains an array of repositories. Each has \`activity\` (e.g., "Pushed 2 time(s)", "Opened 1 PR(s)") and \`recent_commits\`.
            - CRITICAL: Only mention the exact actions listed in the \`activity\` array. Do NOT add conversational filler like "and opened a few pull requests" if "Opened PR(s)" is not explicitly listed for that repository.
            - Provide a fluid, concise summary of these exact data points.
            - CRITICAL HALLUCINATION PREVENTION: Under NO circumstances should you mention 'ATS', 'Mindwell', 'StockScreener', 'TenderFlow', 'mcpay' or any other project from my core background data UNLESS they explicitly appear inside the JSON payload.
            - If the JSON says "No recent public coding activity found", simply apologize and state exactly that. Do not pivot to other subjects.
            - Use bullet points ONLY if you are highlighting 2-3 distinct repositories, otherwise write fluid paragraphs.
            - CRITICAL AND MANDATORY: Whenever you receive a tool response from \`fetch_github_activity\`, you MUST end your VERY NEXT final response with EXACTLY the string "{{GITHUB}}". Do not forget this tag.
            - Under no circumstances should you output JSON arrays to the user. Read the tool data and summarize it naturally.
            ${TONE_PROMPTS[toneRef.current]}`;

            // Keep the most recent messages without severing a tool_call / tool response pair
            const slicedMessages = currentMessages.length > 8 ? currentMessages.slice(-8) : currentMessages;

            const apiMessages = [
                { role: "system", content: systemPrompt },
                ...slicedMessages.map(m => {
                    if (m.role === 'tool') {
                        return { role: "tool", content: m.content as string, tool_call_id: m.id, name: m.name };
                    }
                    if (m.tool_calls) {
                        return { role: "assistant", content: null, tool_calls: m.tool_calls };
                    }
                    return {
                        role: m.role === 'agent' ? 'assistant' : 'user',
                        content: typeof m.content === 'string' ? m.content : "Displaying rich content."
                    };
                })
            ];

            // Model, limits and the Groq key live server-side in api/chat.js,
            // which also meters tokens per visitor
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: apiMessages, tools: [githubActivityToolDefinition] }),
                signal: abortControllerRef.current.signal
            });

            if (response.status === 429) {
                const data = await response.json().catch(() => ({}));
                if (!alive()) return;
                if (data.quota) setQuota(data.quota);
                if (data.error === 'quota_exhausted' && data.quota) sayAndFinish(exhaustedMessage(data.quota));
                else if (data.error === 'rate_limited') sayAndFinish("That's a lot of questions in a row — give me a minute to catch my breath, then ask again.");
                else sayAndFinish("The model is busy right now (too many visitors at once). Try again in a minute — the topic shortcuts still work meanwhile.");
                return;
            }
            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText);
                throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
            }
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // The agent message is created on the first text token, so the
            // thinking indicator stays up until there's something to read
            let msgId: string | null = null;
            let writer: ReturnType<typeof createWriter> | null = null;
            let fullContent = "";

            let toolCallName = "";
            let toolCallArgs = "";
            let toolCallId = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ""; // Keep the last incomplete fragment

                for (const line of lines) {
                    if (!line.trim().startsWith('data: ') || line.trim() === 'data: [DONE]') continue;
                    try {
                        const dataStr = line.replace(/^data:\s*/, '').trim();
                        if (!dataStr) continue;
                        const data = JSON.parse(dataStr);

                        // Final event from our proxy with the updated allowance
                        if (data.quota) { setQuota(data.quota); continue; }

                        const deltaTools = data.choices?.[0]?.delta?.tool_calls;
                        if (deltaTools && deltaTools.length > 0) {
                            isToolCall = true;
                            if (deltaTools[0].function?.name) toolCallName = deltaTools[0].function.name;
                            if (deltaTools[0].function?.arguments) toolCallArgs += deltaTools[0].function.arguments;
                            if (deltaTools[0].id) toolCallId = deltaTools[0].id;
                            continue;
                        }

                        const content = data.choices?.[0]?.delta?.content || "";
                        if (!content) continue;
                        fullContent += content;

                        if (!msgId) {
                            const id = (Date.now() + 1).toString();
                            msgId = id;
                            writer = createWriter(id, run);
                            const trace = snapshotTrace(true);
                            setMessages(prev => [...prev, { id, role: 'agent', content: '', isStreaming: true, trace }]);
                        }
                        writer!.push(fullContent);
                    } catch (e) {
                        console.error("Error parsing stream chunk, skipped:", e, "Raw string:", line);
                    }
                }
            }

            if (!alive()) return;

            if (isToolCall) {
                if (msgId) {
                    const id = msgId;
                    setMessages(prev => prev.filter(msg => msg.id !== id));
                }

                const toolRequestMessage: any = { role: "assistant", tool_calls: [{ id: toolCallId, function: { name: toolCallName, arguments: toolCallArgs }, type: "function" }] };
                const updatedMessagesAfterRequest = [...currentMessages, toolRequestMessage];

                let toolResult = "";
                if (toolCallName === 'fetch_github_activity') {
                    addStep('Checking GitHub activity…');
                    const args = JSON.parse(toolCallArgs || "{}");
                    toolResult = await fetchGithubActivity(args.username);
                    if (!alive()) return;
                    addStep('Reading recent commits…');
                } else {
                    toolResult = JSON.stringify({ error: `Tool ${toolCallName} not found or unsupported.` });
                }

                const toolResponseMessage: Message = {
                    id: toolCallId,
                    role: "tool",
                    name: toolCallName,
                    content: toolResult
                };

                // Send the tool result back to the model for the final answer
                await generateResponseStream(input, [...updatedMessagesAfterRequest, toolResponseMessage], run);
                return;
            }

            // The model sometimes forgets the {{GITHUB}} tag after using the tool
            const usedGithubTool = currentMessages.some(m => m.role === 'tool' && m.name === 'fetch_github_activity');
            const finalOutput = usedGithubTool && !fullContent.includes('{{GITHUB}}')
                ? fullContent + "\n\n{{GITHUB}}"
                : fullContent;

            if (msgId) {
                const id = msgId;
                await writer?.drained();
                if (!alive()) return;
                setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, content: finalOutput, isStreaming: false } : msg));
            } else if (finalOutput) {
                setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: finalOutput, trace: snapshotTrace(true) }]);
            }
        } catch (error: any) {
            if (error.name === 'AbortError' || !alive()) return;
            console.error("Groq API Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'agent',
                content: "Something went wrong reaching the model. Give it another try in a moment.",
            }]);
        } finally {
            if (!isToolCall && alive()) {
                finish();
                abortControllerRef.current = null;
            }
        }
    };

    const visibleMessages = messages.filter(m => m.role !== 'tool' && !m.tool_calls && !(m.isStreaming && m.content === ''));
    const showThinking = busy && !messages.some(m => m.isStreaming && m.content !== '');
    const lastAgentId = [...visibleMessages].reverse().find(m => m.role === 'agent')?.id;

    return (
        <div className="flex-1 min-h-0 flex flex-col relative">
            {isEmpty ? (
                /* ---- Empty state ----
                   Desktop: greeting, composer and chips centred as one group.
                   Phones: greeting fills the space, chips sit in one swipeable
                   row, composer docks at the bottom within thumb reach. */
                <div className="relative isolate flex-1 min-h-0 flex flex-col sm:justify-center sm:pb-[12vh]">
                    <div aria-hidden className="home-glow fade-in" />
                    <div className="flex-1 sm:flex-none flex items-center justify-center px-6 sm:mb-7">
                        <h1 className="fade-in text-2xl sm:text-[30px] font-medium tracking-[-0.02em] text-fg text-center text-balance">
                            What would you like to know about Mirang?
                        </h1>
                    </div>
                    <div className="order-3 sm:order-none mx-auto w-full max-w-[46rem] px-3 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0">
                        <Composer onSend={handleSendMessage} onStop={handleStop} busy={busy} autoFocus={canHover} quota={quota} />
                    </div>
                    <div className="scrollbar-hide mx-auto w-full max-w-[46rem] flex gap-2 overflow-x-auto px-3 pb-3 sm:pb-0 sm:mt-4 sm:px-6 sm:flex-wrap sm:justify-center sm:overflow-visible">
                        {SUGGESTIONS.map(({ label, prompt, Icon }, i) => (
                            <button
                                key={label}
                                onClick={() => handleSendMessage(prompt)}
                                style={{ animationDelay: `${120 + i * 40}ms` }}
                                className="msg-in shrink-0 flex items-center gap-2 rounded-full border border-line px-3.5 py-2.5 sm:py-2 text-sm text-muted hover:bg-hover hover:text-fg transition-colors"
                            >
                                <Icon size={15} className="text-subtle" />
                                {label}
                            </button>
                        ))}
                    </div>
                    {/* Points newcomers at the full topic list in the sidebar */}
                    <button
                        onClick={onBrowseTopics}
                        style={{ animationDelay: `${120 + SUGGESTIONS.length * 40}ms` }}
                        className="msg-in mx-auto mb-3 sm:mb-0 sm:mt-5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-subtle hover:text-fg transition-colors"
                    >
                        <ArrowLeft size={13} className="hidden desk:block" />
                        <Menu size={13} className="desk:hidden" />
                        <span className="hidden desk:inline">More topics in the sidebar — skills, certifications, résumé…</span>
                        <span className="desk:hidden">Tap here for all topics — skills, résumé, hobbies…</span>
                    </button>
                </div>
            ) : (
                <>
                    <div
                        ref={scrollerRef}
                        onScroll={handleScroll}
                        onWheel={(e) => { if (e.deltaY < 0) disengageFollow(); }}
                        onTouchStart={(e) => { touchStartYRef.current = e.touches[0].clientY; }}
                        onTouchMove={(e) => { if (e.touches[0].clientY > touchStartYRef.current + 8) disengageFollow(); }}
                        className="flex-1 overflow-y-auto overscroll-contain"
                    >
                        <div ref={contentRef} className="mx-auto w-full max-w-[46rem] px-4 sm:px-6 pt-4 pb-10 flex flex-col gap-7">
                            {visibleMessages.map((msg) => (
                                <ChatMessage
                                    key={msg.id}
                                    role={msg.role}
                                    content={msg.content}
                                    isStreaming={msg.isStreaming}
                                    isLatest={msg.id === lastAgentId}
                                    trace={msg.trace}
                                    onProjectSelect={setSelectedProject}
                                />
                            ))}
                            {showThinking && <ThinkingIndicator label={liveLabel ?? 'Thinking…'} />}
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-[46rem] px-3 sm:px-6 pb-[env(safe-area-inset-bottom)] bg-bg">
                        {/* Scroll-to-latest — appears once you've scrolled away from the bottom */}
                        <button
                            onClick={jumpToBottom}
                            aria-label="Scroll to latest"
                            tabIndex={showJump ? 0 : -1}
                            className={`absolute -top-12 left-1/2 -translate-x-1/2 size-9 grid place-items-center rounded-full border border-line bg-elevated text-muted hover:text-fg shadow-[0_2px_10px_rgba(0,0,0,0.1)] transition-[opacity,transform] duration-200 ${showJump ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
                        >
                            <ArrowDown size={16} />
                        </button>
                        <Composer
                            onSend={handleSendMessage}
                            onStop={handleStop}
                            busy={busy}
                            autoFocus={canHover}
                            quota={quota}
                        />
                        {/* The starter chips are gone by now — the footnote keeps the way back to the topic list */}
                        <p className="py-2 text-center text-xs text-subtle">
                            <button onClick={onBrowseTopics} className="hover:text-fg hover:underline underline-offset-2 transition-colors">
                                Browse all topics
                            </button>
                            {' '}· AgentFolio can make mistakes. The résumé is the source of truth.
                        </p>
                    </div>
                </>
            )}

            {selectedProject && (
                <Suspense fallback={null}>
                    <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />
                </Suspense>
            )}

            {showMatrix && (
                <Suspense fallback={null}>
                    <MatrixEffect onExit={() => setShowMatrix(false)} />
                </Suspense>
            )}
        </div>
    );
};

export default ChatInterface;
