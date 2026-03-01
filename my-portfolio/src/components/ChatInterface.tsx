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

        // --- NEW: Block simple inquiries from being caught here so the LLM gets them ---
        if (
            normalizedInput.includes("github") ||
            normalizedInput.includes("working on") ||
            normalizedInput.includes("coding right now") ||
            normalizedInput.includes("repos")
        ) {
            // Let the LLM handle this so it can trigger the tool call
            return null;
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

                // Simulate tool execution delay for realism
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
                className="flex-1 w-full bg-black flex flex-col items-center justify-center p-4 overflow-y-auto"
            >
                <div className="relative mb-4 sm:mb-6 md:mb-8 group">
                    {/* Background Glow - Removed for cleaner look */}
                    <img
                        src={portfolioData.profileImage}
                        alt={portfolioData.name}
                        className="w-28 h-28 sm:w-36 sm:h-36 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-full object-cover border-4 border-gray-900 shadow-2xl relative z-10"
                        fetchPriority="high"
                        decoding="sync"
                        loading="eager"
                    />
                    <div className="absolute bottom-2 right-2 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-blue-500 border-4 border-black rounded-full z-20"></div>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 md:mb-6 text-center tracking-tight">
                    Hi, I'm {portfolioData.name}
                </h2>
                <p className="text-gray-400 text-center max-w-lg md:max-w-xl lg:max-w-2xl text-sm sm:text-base md:text-lg leading-relaxed px-4 mb-6 sm:mb-8">
                    {portfolioData.role}. Ask me anything about my work, skills, or experience.
                </p>

                <button
                    onClick={onStart}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white transition-all hover:scale-105 active:scale-95 text-sm font-medium backdrop-blur-md group"
                >
                    <span className="relative">
                        <span className="absolute -inset-1 rounded-full bg-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity blur-md"></span>
                        Start Chatting
                    </span>
                    <Send size={16} className="text-green-400 group-hover:translate-x-1 transition-transform" />
                </button>
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

                    {/* Consolidated Loading / Tool Execution UI */}
                    {(isTyping || isFetchingTool) && !messages.some(m => m.isStreaming && m.content !== '') && (
                        <div className="flex w-full mb-6 justify-start">
                            <div className="flex max-w-[85%] flex-row gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white text-black">
                                    <Terminal size={18} />
                                </div>
                                <div className="flex flex-col gap-2 max-w-full overflow-hidden">
                                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-900 border border-gray-800 text-gray-400 text-sm flex items-center gap-2 w-fit max-w-full">
                                        <ThinkingVisualizer />
                                        <span className="text-xs text-gray-500 font-mono self-center ml-2 shrink-0 whitespace-nowrap">Process(pid=404)</span>
                                    </div>

                                    {/* Sub-status for Tool Execution (ChatGPT Style) */}
                                    {isFetchingTool && (
                                        <div className="flex flex-wrap items-center gap-2 px-2 text-gray-500 text-xs animate-pulse max-w-full">
                                            <Activity size={12} className="text-gray-400 shrink-0" />
                                            <span className="break-all sm:break-normal">Calling function: <span className="font-mono bg-gray-800/50 px-1 rounded">{fakeToolName || "fetch_github_activity"}</span>...</span>
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
            />

            {/* Toggle Sidebar Button - Animate with Sidebar (Desktop Only) */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`hidden sm:block fixed top-1/2 -translate-y-1/2 z-[60] p-3 text-gray-400 hover:text-white bg-[#171717] border border-[#2f2f2f] transition-all duration-300 ease-out shadow-xl ${isSidebarOpen
                    ? 'left-72 sm:left-80 rounded-r-xl border-l-[#171717]'
                    : 'left-0 rounded-r-xl border-l-0'
                    }`}
                aria-label="Toggle Menu"
            >
                {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>

            {/* Input Area - Always visible but styled to blend */}
            <div className="pt-2 border-t border-gray-800 bg-black z-20 pb-2">
                <ActionButtons prompts={suggestPrompts} onSelect={handleSendMessage} />

                <form
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }}
                    className="flex gap-2 mt-4 relative items-center bg-gray-900 p-2 rounded-xl border border-gray-800 focus-within:border-gray-600 transition-colors"
                >
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask something..."
                        className="flex-1 bg-transparent text-white px-2 py-1 outline-none placeholder:text-gray-500 font-sans"
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isTyping}
                        className="p-2 bg-white text-black rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
