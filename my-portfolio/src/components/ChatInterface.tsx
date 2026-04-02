import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import ChatMessage from './ChatMessage';
import ActionButtons from './ActionButtons';
import MatrixEffect from './MatrixEffect';
import ThinkingVisualizer from './ThinkingVisualizer';
import Sidebar from './Sidebar';
import ProjectDetailModal from './ProjectDetailModal';
import ContactForm from './ContactForm';
import { portfolioData, suggestPrompts } from '../data/portfolioData';
import { Send, Terminal, Menu, ChevronLeft, Activity } from 'lucide-react';
import { githubActivityToolDefinition, fetchGithubActivity } from './githubAgent';

type Message = {
    id: string;
    role: 'agent' | 'user' | 'tool';
    content: React.ReactNode;
    isStreaming?: boolean;
    name?: string; // For tool responses
    tool_calls?: any[]; // To track when the LLM decides to use a tool
};

interface ChatInterfaceProps {
    hasStarted: boolean;
    onStart: () => void;
    activePrompt: string | null;
    onPromptHandled: () => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
}


const ChatInterface: React.FC<ChatInterfaceProps> = ({ hasStarted, onStart, activePrompt, onPromptHandled, isSidebarOpen, setIsSidebarOpen }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showMatrix, setShowMatrix] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [isFetchingTool, setIsFetchingTool] = useState(false); // New state for tool execution UI
    const [fakeToolName, setFakeToolName] = useState(""); // Track fake tool names for the UI

    // Refs for animations
    const containerRef = useRef<HTMLDivElement>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    // Scroll handling
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);

    const scrollToBottom = (instant = false) => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
        }
    };

    // Monitor scroll position
    const handleScroll = () => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
            shouldAutoScrollRef.current = isAtBottom;
        }
    };

    // Handle External Prompts (Sidebar)
    useEffect(() => {
        if (activePrompt) {
            handleSendMessage(activePrompt);
            onPromptHandled();
        }
    }, [activePrompt]);

    // GSAP Transitions
    useGSAP(() => {
        if (hasStarted) {
            // Animate Hero OUT, Chat IN
            const tl = gsap.timeline();
            tl.to(heroRef.current, {
                opacity: 0,
                y: -20,
                duration: 0.5,
                pointerEvents: 'none',
                display: 'none'
            })
                .to(chatRef.current, {
                    display: 'flex',
                    opacity: 1,
                    y: 0,
                    duration: 0.5,
                    pointerEvents: 'all'
                });
        } else {
            // Animate Hero IN, Chat OUT
            const tl = gsap.timeline();
            tl.to(chatRef.current, {
                opacity: 0,
                y: 20,
                duration: 0.3,
                display: 'none',
                pointerEvents: 'none'
            })
                .to(heroRef.current, {
                    display: 'flex',
                    opacity: 1,
                    y: 0,
                    duration: 0.5,
                    pointerEvents: 'all'
                });
        }
    }, { scope: containerRef, dependencies: [hasStarted] });

    // Auto-scroll on new messages (start of generation)
    useEffect(() => {
        if (hasStarted) {
            scrollToBottom();
            shouldAutoScrollRef.current = true;
        }
    }, [messages.length, hasStarted]);

    // Auto-scroll during streaming (only if already at bottom)
    useEffect(() => {
        if (isTyping && shouldAutoScrollRef.current) {
            scrollToBottom(true); // Instant scroll to prevent jitter
        }
    }, [messages, isTyping]);

    const handleSendMessage = (text: string) => {
        if (!text.trim()) return;

        if (!hasStarted) {
            onStart();
        }

        // Check for special commands
        if (processCommand(text)) {
            setInputValue("");
            return;
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        const currentMessages = [...messages, userMsg]; // Capture immediate state
        generateResponseStream(text, currentMessages);
    };

    const processCommand = (input: string): boolean => {
        const cmd = input.trim().toLowerCase();

        if (cmd === 'clear' || cmd === 'cls' || cmd === 'flush_log') {
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

        // 1. Commands
        if (normalizedInput === 'help') {
            return `System Manual:\n\n- \`clear\`: Clear terminal\n- \`matrix\`: Enter the simulation`;
        }

        // 2. "Tell me about yourself"
        if (
            normalizedInput.includes("tell me about yourself") ||
            normalizedInput === "who are you?" ||
            normalizedInput === "who are you"
        ) {
            return "{{BIO}}";
        }

        // 3. "Show me your projects"
        if (
            normalizedInput.includes("show me your projects") ||
            normalizedInput.includes("list your projects") ||
            (normalizedInput.includes("projects") && normalizedInput.length < 20)
        ) {
            return "Here are some of the key projects I've worked on recently:\n\n{{PROJECTS}}";
        }

        // 4. "What are your skills?"
        if (
            normalizedInput.includes("what are your skills") ||
            normalizedInput.includes("technical skills") ||
            (normalizedInput.includes("skills") && normalizedInput.length < 20)
        ) {
            return "I have experience with a wide range of technologies in AI, Data Science, and Web Development. Here's my technical stack:\n\n{{SKILLS}}";
        }

        // 5. Work Experience
        if (
            normalizedInput.includes("experience") ||
            normalizedInput.includes("work") ||
            normalizedInput.includes("employment")
        ) {
            return "Here is my professional journey:\n\n{{EXPERIENCE}}";
        }

        // 6. Certifications
        if (
            normalizedInput.includes("certification") ||
            normalizedInput.includes("certificate")
        ) {
            return `I have the following certifications:\n\n{{CERTIFICATIONS}}`;
        }

        // 7. Hobbies & Interests
        if (
            normalizedInput.includes("hobbies") ||
            normalizedInput.includes("hobby") ||
            normalizedInput.includes("interest")
        ) {
            return `Here's a bit about what I do outside of work:\n\n{{HOBBIES}}`;
        }

        // 8. Contact / Socials
        if (
            normalizedInput.includes("contact") ||
            normalizedInput.includes("social") ||
            normalizedInput.includes("email") ||
            normalizedInput.includes("reach") ||
            normalizedInput.includes("hire") ||
            normalizedInput.includes("message")
        ) {
            // Check if it's specifically a request for the form
            if (normalizedInput.includes("form") || normalizedInput.includes("message") || normalizedInput.includes("send") || normalizedInput.includes("contact") || normalizedInput.includes("hire") || normalizedInput.includes("hiring")) {
                return "{{CONTACT_FORM}}";
            }
            const socials = portfolioData.socials.map(s => `[${s.name}](${s.url})`).join(' • ');
            return `You can reach me via:\n\n${socials}`;
        }

        // --- NEW: Directly handle GitHub inquiries to bypass Groq API completely ---
        // By returning this tag in production, the frontend fetches the 6-hour Vercel Edge Cached LLM Summary.
        if (
            normalizedInput.includes("github") ||
            normalizedInput.includes("working on") ||
            normalizedInput.includes("coding right now") ||
            normalizedInput.includes("repos") ||
            normalizedInput.includes("commit") ||
            normalizedInput.includes("recent")
        ) {
            if (import.meta.env.DEV) {
                return null; // Local dev: let the normal Groq flow handle it
            }
            return "{{FETCH_CACHED_LLM_GITHUB}}";
        }

        // 9. "Do you have a resume?"
        if (
            normalizedInput.includes("resume") ||
            normalizedInput.includes("cv") ||
            normalizedInput.includes("download resume")
        ) {
            return "Yes! You can view and download my full resume using the button below.\n\n{{RESUME}}";
        }

        // 10. "Surprise me!"
        if (
            normalizedInput.includes("surprise me") ||
            normalizedInput.includes("fun fact")
        ) {
            const randomFact = portfolioData.funFacts[Math.floor(Math.random() * portfolioData.funFacts.length)];
            return `Here's a fun fact about me: ${randomFact}`;
        }

        return null;
    };

    const streamLocalResponse = async (responseText: string) => {
        const msgId = (Date.now() + 1).toString();

        setMessages(prev => [...prev, {
            id: msgId,
            role: 'agent',
            content: "",
            isStreaming: true
        }]);

        setIsTyping(true);
        abortControllerRef.current = new AbortController();

        // Simulate network delay for realism
        await new Promise(resolve => setTimeout(resolve, 600));

        let currentText = "";
        const chunkSize = 4; // Characters per tick

        for (let i = 0; i < responseText.length; i += chunkSize) {
            if (abortControllerRef.current?.signal.aborted) break;

            const chunk = responseText.slice(i, i + chunkSize);
            currentText += chunk;

            setMessages(prev => prev.map(msg =>
                msg.id === msgId
                    ? { ...msg, content: currentText }
                    : msg
            ));

            // Random typing delay
            await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
        }

        setMessages(prev => prev.map(msg =>
            msg.id === msgId ? { ...msg, isStreaming: false } : msg
        ));

        setIsTyping(false);
        abortControllerRef.current = null;
    };

    /**
     * Executes a Groq API request. It handles standard streams and captures tool calls.
     * Uses `currentMessages` to include full conversation history (e.g. tool results).
     */
    const generateResponseStream = async (input: string, currentMessages: Message[] = messages) => {
        // 1. Check for local predefined response (only on initial user input, not tool chains)
        // If the last message was a tool, this is the LLM finalizing the answer, so skip static checks.
        const isToolFollowUp = currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === 'tool';

        if (!isToolFollowUp) {
            const localResponse = getPredefinedResponse(input);
            if (localResponse) {
                // Determine a fake tool name for agentic aesthetic
                let toolStr = "";
                if (localResponse.includes("{{PROJECTS}}")) toolStr = "query_projects_db";
                else if (localResponse.includes("{{SKILLS}}")) toolStr = "get_technical_skills";
                else if (localResponse.includes("{{EXPERIENCE}}")) toolStr = "fetch_work_history";
                else if (localResponse.includes("{{CERTIFICATIONS}}")) toolStr = "verify_certifications";
                else if (localResponse.includes("{{BIO}}")) toolStr = "load_user_profile";
                else if (localResponse.includes("{{HOBBIES}}")) toolStr = "get_interests";
                else if (localResponse.includes("{{CONTACT_FORM}}")) toolStr = "initiate_contact_protocol";
                else if (localResponse.includes("{{RESUME}}")) toolStr = "generate_resume_link";
                else if (localResponse.includes("{{GITHUB}}")) toolStr = "fetch_github_activity";
                else toolStr = "search_knowledge_base";

                if (localResponse === "{{CONTACT_FORM}}") {
                    setIsTyping(true);
                    setIsFetchingTool(true);
                    setFakeToolName(toolStr);
                    await new Promise(resolve => setTimeout(resolve, 800));
                    setIsFetchingTool(false);
                    setFakeToolName("");

                    const msgId = (Date.now() + 1).toString();
                    setMessages(prev => [...prev, {
                        id: msgId,
                        role: 'agent',
                        content: <ContactForm />
                    }]);
                    setIsTyping(false);
                    return;
                }

                if (localResponse === "{{FETCH_CACHED_LLM_GITHUB}}") {
                    // Trigger the UI to look like it's thinking and calling the tool
                    setIsTyping(true);
                    setIsFetchingTool(true);
                    setFakeToolName("fetch_github_activity");

                    try {
                        const res = await fetch('/api/github-summary');
                        if (!res.ok) throw new Error("Vercel Edge failed");

                        const cacheStatus = res.headers.get('x-vercel-cache');
                        if (cacheStatus === 'HIT') {
                            console.log(`✅ SUCCESS: Response successfully cached! (Vercel Edge: ${cacheStatus})`);
                            console.log("Using cached GitHub LLM Summary for the next 6 hours (0 tokens used).");
                        } else if (cacheStatus === 'MISS') {
                            console.log(`⚠️ CACHE MISS: Vercel hit the real GitHub & Groq API. (Vercel Edge: ${cacheStatus})`);
                            console.log("LLM Summary fetched and is now cached for 6 hours.");
                        } else {
                            console.log(`ℹ️ Vercel Edge Cache Status: ${cacheStatus}`);
                        }

                        const data = await res.json();
                        setIsFetchingTool(false);
                        setFakeToolName("");
                        await streamLocalResponse(data.summary);
                    } catch (err) {
                        console.error("Agent Edge Cache fallback:", err);
                        setIsFetchingTool(false);
                        setFakeToolName("");
                        await streamLocalResponse("Failed to fetch recent activity.\n\n{{GITHUB}}");
                    }
                    return;
                }

                // Simulate tool execution delay for realism for generic predefined responses
                setIsTyping(true);
                setIsFetchingTool(true);
                setFakeToolName(toolStr);
                await new Promise(resolve => setTimeout(resolve, 1000));
                setIsFetchingTool(false);
                setFakeToolName("");

                await streamLocalResponse(localResponse);
                return;
            }
        }

        // 2. High-Level Caching for GitHub Tool removed since it's now handled by getPredefinedResponse and Widget UI

        // 3. Fallback to LLM API
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;

        if (!apiKey) {
            const errorMsg: Message = {
                id: Date.now().toString(),
                role: 'agent',
                content: "I'm missing my brain! Please set the VITE_GROQ_API_KEY in the .env file."
            };
            setMessages(prev => [...prev, errorMsg]);
            setIsTyping(false);
            return;
        }

        abortControllerRef.current = new AbortController();

        // Artificial delay for "processing" feel
        await new Promise(resolve => setTimeout(resolve, 1200));

        let isToolCall = false;

        try {
            const systemPrompt = `You are an interactive AI portfolio assistant for Mirang Bhandari.
            
            CORE INSTRUCTIONS:
            1. Answer questions based on this core data: Mirang Bhandari is a Software Engineer & AI Researcher based in Mannheim, Germany. He specializes in AI, Backend, and Agentic workflows. He has worked at Keysight Technologies (DevOps) and Resolute.AI (Deep Learning). His projects include 'ATS' (a hiring platform), 'Mindwell' (offline mental wellness AI), and 'StockScreener'. He is AWS and LangChain certified.
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
            - CRITICAL HALLUCINATION PREVENTION: Under NO circumstances should you mention 'ATS', 'Mindwell', 'StockScreener' or any other project from my core background data UNLESS they explicitly appear inside the JSON payload.
            - If the JSON says "No recent public coding activity found", simply apologize and state exactly that. Do not pivot to other subjects.
            - Use bullet points ONLY if you are highlighting 2-3 distinct repositories, otherwise write fluid paragraphs.
            - CRITICAL AND MANDATORY: Whenever you receive a tool response from \`fetch_github_activity\`, you MUST end your VERY NEXT final response with EXACTLY the string "{{GITHUB}}". Do not forget this tag.
            - Under no circumstances should you output JSON arrays to the user. Read the tool data and summarize it naturally.`;

            // ==========================================
            // AGENTIC BEHAVIOR: Build Messages for API
            // ==========================================
            // Safely limit history. We keep the most recent messages, but ensure we don't sever a tool_call / tool response pair.
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

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: apiMessages,
                    tools: [githubActivityToolDefinition], // <--- PASS TOOLS HERE
                    tool_choice: "auto",
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 1500
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText);
                throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
            }
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            const msgId = (Date.now() + 1).toString();
            let fullContent = "";

            setMessages(prev => [...prev, {
                id: msgId,
                role: 'agent',
                content: "",
                isStreaming: true
            }]);

            let lastUpdateTime = 0;
            const THROTTLE_MS = 50;

            let toolCallName = "";
            let toolCallArgs = "";
            let toolCallId = "";

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process only complete lines split by double newline (SSE standard)
                const lines = buffer.split('\n');
                buffer = lines.pop() || ""; // Keep the last incomplete fragment in the buffer

                for (const line of lines) {
                    if (line.trim().startsWith('data: ') && line.trim() !== 'data: [DONE]') {
                        try {
                            const dataStr = line.replace(/^data:\s*/, '').trim();
                            if (!dataStr) continue;

                            const data = JSON.parse(dataStr);

                            // Check if LLM decided to use a tool
                            const deltaTools = data.choices?.[0]?.delta?.tool_calls;
                            if (deltaTools && deltaTools.length > 0) {
                                isToolCall = true;
                                if (deltaTools[0].function?.name) toolCallName = deltaTools[0].function.name;
                                if (deltaTools[0].function?.arguments) toolCallArgs += deltaTools[0].function.arguments;
                                if (deltaTools[0].id) toolCallId = deltaTools[0].id;
                                continue;
                            }

                            // Standard text content
                            const content = data.choices?.[0]?.delta?.content || "";
                            if (content) {
                                fullContent += content;

                                const now = Date.now();
                                if (now - lastUpdateTime > THROTTLE_MS) {
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === msgId
                                            ? { ...msg, content: fullContent }
                                            : msg
                                    ));
                                    lastUpdateTime = now;
                                }
                            }
                        } catch (e) {
                            console.error("Error parsing stream chunk, skipped:", e, "Raw string:", line);
                        }
                    }
                }
            }

            // ==========================================
            // AGENTIC BEHAVIOR: Execute Tool Chain
            // ==========================================
            if (isToolCall) {
                // Remove the empty streaming message placeholder
                setMessages(prev => prev.filter(msg => msg.id !== msgId));
                setIsFetchingTool(true); // Trigger UI indicator

                // 1. Add Assistant Tool Call request to history
                const toolRequestMessage: any = { role: "assistant", tool_calls: [{ id: toolCallId, function: { name: toolCallName, arguments: toolCallArgs }, type: "function" }] };
                const updatedMessagesAfterRequest = [...currentMessages, toolRequestMessage];

                // 2. Execute the physical tool function
                let toolResult = "";
                if (toolCallName === 'fetch_github_activity') {
                    const args = JSON.parse(toolCallArgs || "{}");
                    toolResult = await fetchGithubActivity(args.username);
                } else {
                    toolResult = JSON.stringify({ error: `Tool ${toolCallName} not found or unsupported.` });
                }

                // 3. Add Tool Response to history
                const toolResponseMessage: Message = {
                    id: toolCallId,
                    role: "tool",
                    name: toolCallName,
                    content: toolResult
                };

                // Recursively call generateResponseStream to send the tool result back to Groq
                const messagesWithToolOutput = [...updatedMessagesAfterRequest, toolResponseMessage];
                await generateResponseStream(input, messagesWithToolOutput);

                return; // Exit this execution since the recursive call handles the rest
            }

            // Handle the case where the LLM successfully retrieved the GitHub data via the tool
            // but completely failed to listen to the prompt to append the {{GITHUB}} tag.
            // We can detect this if the tool was called in this request chain, but the final text lacks the tag.
            const containedToolCall = isToolCall || currentMessages.some(m => m.role === 'tool' && m.name === 'fetch_github_activity');
            let finalOutput = fullContent;

            if (containedToolCall && !fullContent.includes('{{GITHUB}}') && !isToolCall) {
                console.log("LLM forgot the GITHUB tag after tool call. Manually injecting fail-safe tag.");
                finalOutput = fullContent + "\n\n{{GITHUB}}";
            }

            // Ensure final content is set for normal text
            setMessages(prev => prev.map(msg =>
                msg.id === msgId
                    ? { ...msg, content: finalOutput, isStreaming: false }
                    : msg
            ));

        } catch (error: any) {
            if (error.name === 'AbortError') return;
            console.error("Groq API Error:", error);
            const errorMsg: Message = {
                id: Date.now().toString(),
                role: 'agent',
                content: `Error: ${error.message}. Please check your connection or API key.`
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
            if (!isToolCall) {
                setIsFetchingTool(false);
                setFakeToolName("");
            }
            abortControllerRef.current = null;
        }
    };

    return (
        <div ref={containerRef} className="flex flex-col h-full relative overflow-hidden">
            {/* Hero Section */}
            <div
                ref={heroRef}
                className="flex-1 w-full flex flex-col items-center justify-center py-3 sm:py-5 lg:py-6 px-4 overflow-y-auto"
            >
                <div className="flex flex-col items-center text-center max-w-sm w-full mx-auto gap-3 sm:gap-4 lg:gap-5">

                    {/* Profile image — gradient ring */}
                    <div className="relative">
                        <div className="p-[2px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                            <div className="p-[3px] rounded-full bg-[#080808]">
                                <img
                                    src={portfolioData.profileImage}
                                    alt={portfolioData.name}
                                    width="128"
                                    height="128"
                                    className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full object-cover"
                                    fetchPriority="high"
                                    decoding="sync"
                                    loading="eager"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Name + Role */}
                    <div className="space-y-1">
                        <p className="text-[#484848] text-[10px] sm:text-[11px] font-mono tracking-[0.18em] uppercase">Hi, I'm</p>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.05]">
                            {portfolioData.name}
                        </h2>
                        <p className="text-sm sm:text-[15px] font-medium pt-0.5 bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">
                            {portfolioData.role}
                        </p>
                    </div>

                    {/* Tagline */}
                    <p className="text-[#545454] text-xs sm:text-sm leading-relaxed max-w-xs">
                        Ask me anything about my work, projects, or experience.
                    </p>

                    {/* Stats strip */}
                    <div className="flex items-center gap-4 sm:gap-6 lg:gap-7 py-2.5 sm:py-3 px-5 sm:px-6 rounded-2xl border border-[#161616] bg-[#0d0d0d]">
                        {portfolioData.heroStats.map((stat, i, arr) => (
                            <React.Fragment key={stat.label}>
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-white font-bold text-sm sm:text-base lg:text-lg leading-none">{stat.value}</span>
                                    <span className="text-[#484848] text-[9px] sm:text-[10px] lg:text-[11px] font-mono">{stat.label}</span>
                                </div>
                                {i < arr.length - 1 && <span className="w-px h-6 sm:h-7 bg-[#181818]" />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* CTA */}
                    <button
                        onClick={onStart}
                        className="group flex items-center gap-2 sm:gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 bg-white text-black font-semibold text-sm rounded-xl hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-white/5"
                    >
                        Start Chatting
                        <Send size={13} className="group-hover:translate-x-0.5 transition-transform duration-150" />
                    </button>

                </div>
            </div>

            {/* Messages Area - Initially Hidden via GSAP */}
            <div
                ref={chatRef}
                className="flex-1 flex flex-col overflow-hidden opacity-0 hidden"
            >
                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-2 py-4"
                >
                    {messages.filter(m => m.role !== 'tool' && !m.tool_calls && !(m.isStreaming && m.content === '')).map((msg) => (
                        <ChatMessage
                            key={msg.id}
                            role={msg.role}
                            content={msg.content}
                            onProjectSelect={setSelectedProject}
                        />
                    ))}

                    {/* Loading / Tool Execution indicator */}
                    {(isTyping || isFetchingTool) && !messages.some(m => m.isStreaming && m.content !== '') && (
                        <div className="flex w-full mb-5 justify-start">
                            <div className="flex max-w-[85%] flex-row gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#111] border border-[#1f1f1f] text-[#484848]">
                                    <Terminal size={15} />
                                </div>
                                <div className="flex flex-col gap-1.5 max-w-full overflow-hidden">
                                    <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-[#0f0f0f] border border-[#1c1c1c] text-gray-400 text-sm flex items-center gap-3 w-fit max-w-full">
                                        <ThinkingVisualizer />
                                        <span className="text-[11px] text-[#404040] font-mono self-center whitespace-nowrap">pid:404</span>
                                    </div>
                                    {isFetchingTool && (
                                        <div className="flex flex-wrap items-center gap-1.5 px-1 text-[#404040] text-[11px] mt-0.5 max-w-full">
                                            <Activity size={11} className="text-[#4a4a4a] shrink-0 animate-pulse" />
                                            <span className="break-all sm:break-normal font-mono">
                                                calling{' '}
                                                <span className="text-blue-400/70 bg-blue-500/8 border border-blue-500/15 px-1.5 py-0.5 rounded-md">
                                                    {fakeToolName || "fetch_github_activity"}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Project Detail Modal */}
            {selectedProject && (
                <ProjectDetailModal
                    project={selectedProject}
                    onClose={() => setSelectedProject(null)}
                />
            )}

            {/* Matrix Effect Overlay */}
            {showMatrix && <MatrixEffect onExit={() => setShowMatrix(false)} />}

            {/* Sidebar */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onClear={() => setMessages([])}
                onCommandSelect={handleSendMessage}
                isDisabled={isTyping || isFetchingTool}
            />

            {/* Toggle Sidebar Button - Desktop Only */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`hidden sm:block fixed top-1/2 -translate-y-1/2 z-[60] p-2.5 text-[#484848] hover:text-white bg-[#0f0f0f] border border-[#1e1e1e] transition-all duration-300 ease-out shadow-xl hover:border-[#2a2a2a] ${isSidebarOpen
                    ? 'left-72 sm:left-80 rounded-r-xl border-l-[#0f0f0f]'
                    : 'left-0 rounded-r-xl border-l-0'
                    }`}
                aria-label="Toggle Menu"
            >
                {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>

            {/* Input Area */}
            <div className="relative pb-3 z-20">
                {/* Gradient bleed — dissolves messages into the input card */}
                <div className="absolute -top-10 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-[#080808] pointer-events-none" />

                {/* Floating card */}
                <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-2xl p-2 pt-1.5">
                    <ActionButtons
                        prompts={suggestPrompts}
                        onSelect={handleSendMessage}
                        isDisabled={isTyping || isFetchingTool}
                    />

                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }}
                        className="flex gap-2 mt-1.5 relative items-center bg-[#111] p-1.5 rounded-xl border border-[#1e1e1e] focus-within:border-blue-500/30 focus-within:ring-1 focus-within:ring-blue-500/8 transition-all duration-200"
                    >
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask me anything..."
                            disabled={isTyping || isFetchingTool}
                            className="flex-1 bg-transparent text-[#e8e8e8] px-3 py-2 text-sm sm:text-[15px] outline-none placeholder:text-[#363636] font-sans disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isTyping || isFetchingTool}
                            className="p-2 sm:p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shrink-0"
                        >
                            <Send size={14} className="sm:hidden" />
                            <Send size={15} className="hidden sm:block" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
