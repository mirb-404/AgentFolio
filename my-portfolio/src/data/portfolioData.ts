import mindwellImg from '../assets/gemma.avif';
import stockscreenerImg from '../assets/stockscreener.avif';
import datasetImg from '../assets/electoral.avif';
import mlopsImg from '../assets/Mlflow.avif';
import keysightLogo from '../assets/kt.jpg';
import resoluteLogo from '../assets/rai.jpg';
import githubLogo from '../assets/gh.jpg';
const meImg = "/me.webp";
import wassertumimg from '../assets/wassertum.jpg'
import travelimg from '../assets/travel.avif'
import overwatchimg from '../assets/overwatch.png'
import githubimg from '../assets/githubbg.png'
import atsimg from '../assets/atsimg.png'
import hadoopImg from '../assets/hadoop.png'

// ===================================
// Type Definitions
// ===================================

export interface Experience {
    id: string;
    role: string;
    company: string;
    period: string;
    description: string;
    logo?: string;
}

export interface Certification {
    id: string;
    name: string;
    issuer: string;
    date: string;
    link?: string;
    description: string;
    icon: string;
}

export interface Interest {
    title: string;
    description: string;
    icon: string;
}

// ===================================
// Main Portfolio Data
// ===================================

export const portfolioData = {

    // --- Personal Information ---
    name: "Mirang Bhandari",
    role: "Software Engineer & AI Researcher",
    location: "Mannheim, Germany",
    profileImage: meImg,
    headerImage: wassertumimg,

    // --- Hero Stats (edit these freely) ---
    heroStats: [
        { value: '2', label: 'Companies' },
        { value: '6+', label: 'Projects' },
        { value: 'Mannheim', label: 'Location' },
    ],

    bio: `I am a software engineer who loves experimentation, building impactful software, contributing to open source and reading up on tech documentation.
  
I’m currently a Data Science & AI Grad student at SRH Heidelberg. I build data-driven and AI-powered solutions, combining Data Acquisition, Machine Learning, Backend, DevOps and Cloud Technologies to turn complex data into actionable insights for companies.

I'm also an avid Agentic Ai Researcher who is actively building industry grade agents and trying to create meaningful research with them`,

    // --- Skills ---
    skills: [
        {
            title: "Programming Languages",
            icon: "code",
            skills: ["Python", "TypeScript", "JavaScript", "SQL", "C++"]
        },
        {
            title: "AI & Data Science",
            icon: "cpu",
            skills: ["TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "Computer Vision", "NLP"]
        },
        {
            title: "Web & Backend",
            icon: "globe",
            skills: ["React", "PostgreSQL", "FastAPI"]
        },
        {
            title: "Cloud and DevOps",
            icon: "tool",
            skills: ["Docker", "AWS", "Git", "Linux", "CI/CD", "Jenkins", "MLFlow"]
        },
        {
            title: "Agentic AI",
            icon: "tool",
            skills: ["LangGraph", "LangChain", "Ollama", "n8n"]
        }
    ],

    // --- Work Experience ---
    experience: [
        {
            id: "exp1",
            role: "AI & Full Stack Engineer",
            company: "Freelancer",
            period: "2024 Aug - 2025 Nov",
            description: "Growing open-source presence: 2,000+ GitHub profile views and 30+ stars across repositories.\nBuilt \"MindWell\" for the Google DeepMind Hackathon an offline-first mental wellness desktop app focused on data privacy.\nFormer LangChain contributor identified GROQ model compatibility issues.\nFormer React Native community supporter merged PRs to help developers migrate libraries to Expo and resolve integration bottlenecks.",
            logo: githubLogo
        },
        {
            id: "exp2",
            role: "DevOps Engineer",
            company: "Keysight Technologies",
            period: "2024 Feb - 2024 July",
            description: "Implemented two seamless Jenkins automation pipelines using Groovy and Python that significantly reduced manual effort and improved efficiency for electronics testing.\nOver the course of five months, delivered five major pipeline enhancements using HTML5 and CSS based technologies to create CI/CD Pipelines.\nContributed more than 5,000 lines of production code across 500+ commits.\nCreated detailed documentation to support pipeline improvements and ensure smooth knowledge transfer between US and Penang based DevOps teams.",
            logo: keysightLogo
        },
        {
            id: "exp3",
            role: "Deep Learning Intern",
            company: "Resolute.AI",
            period: "2023 Jan - 2023 May",
            description: "Developed Computer Vision proof-of-concepts and worked extensively with NLP and machine learning using Python.\nBuilt, tested, and evaluated ML/DL models to address real-world challenges.\nConducted image annotation to create custom datasets tailored for object detection tasks.",
            logo: resoluteLogo
        }
    ] as Experience[],

    // --- Certifications ---
    certifications: [
        {
            id: "cert1",
            name: "Deep Agents with LangChain and LangGraph",
            issuer: "Langchain",
            date: "2026",
            description: "Learnt the fundamentals of LangGraph and Langchain to build Deep Agents which perform tool calls to specialized agents while using memory states to recall previous information in the conversation to attain maximum efficiency.",
            link: "https://academy.langchain.com/certificates/og6z4gygcc",
            icon: "https://upload.wikimedia.org/wikipedia/commons/6/60/LangChain_Logo.svg"
        },
        {
            id: "cert2",
            name: "AWS Academy Graduate - Cloud Foundations",
            issuer: "Amazon Web Services",
            date: "2025",
            description: "Validated expertise in designing distributed systems on AWS, covering security, reliability, and scalability best practices.",
            link: "https://www.credly.com/badges/e0596dc5-f400-4a99-a3c0-5bc7caca80dd/print",
            icon: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
        },
        {
            id: "cert3",
            name: "Disaster Risk Monitoring Using Satellite Imagery",
            issuer: "Nvidia",
            date: "2024",
            description: "A course from NVIDIA that teaches how to use AI and satellite imagery to detect and monitor natural disasters (like floods) using deep learning and GPU tools",
            link: "https://drive.google.com/file/d/168UiXJPDRzTOTAJLvu8NbMfU0CFc0QxI/view",
            icon: "https://upload.wikimedia.org/wikipedia/commons/a/a4/NVIDIA_logo.svg"
        },

    ] as Certification[],

    // --- Projects ---
    projects: [
        {
            id: "ats",
            title: "ATS",
            category: "Applicant Tracking System",
            description: "An end-end automated Applicant Tracking System that sources candidates across GitHub, LeetCode, and StackOverflow using Legal API's. Uses Machine Learning algorithms for selection and features a live coding portal. Showcases proficiency in ETL data pipelines, ML, Full-stack (FastAPI/Streamlit), and DevOps (GitHub Actions)",
            link: "https://github.com/mirb-404/ATS",
            image: atsimg,
            techStack: ["FastAPI", "Pandas", "Python", "Streamlit", "Scikit-learn", "Machine Learning", "GitHub CI/CD Actions", "Data Science"],
            isNew: true
        },
        {
            id: "Data-Crawler",
            title: "Gaming Data Crawler",
            category: "Gaming Data Analysis",
            description: "A Python-based data crawler for gaming information, focused on scraping data from various gaming websites. ACADEMIC USE ONLY!",
            link: "https://github.com/mirb-404/Data-Crawler",
            image: hadoopImg,
            techStack: ["SQL-lite", "Docker", "Hadoop", "Apache Spark", "TailScale", "Distributed-Systems", "Linux", "Pandas", "Web-Scraping", "Crawlers", "Data Science"],
            isNew: true
        },
        {
            id: "mindwell",
            title: "Mindwell",
            category: "Offline AI Application",
            description: "An offline AI application focused on mental wellness and privacy-first interactions.",
            link: "https://mirang.framer.ai/projects/mindwell",
            image: mindwellImg,
            techStack: ["Electron", "React", "TypeScript", "TailwindCSS", "Ollama", "NSIS", "Gemma3n"]
        },
        {
            id: "stockscreener",
            title: "StockScreener Agent",
            category: "Local StockAnalyser AI Agent",
            description: "A local AI agent designed to analyze stock market trends and provide screening data.",
            link: "https://mirang.framer.ai/projects/stockscreener",
            image: stockscreenerImg,
            techStack: ["Python", "Pandas", "YahooAPI", "Agentic AI", "Rich Text", "CLI"]
        },
        {
            id: "dataset",
            title: "Electoral Dataset",
            category: "Custom Dataset",
            description: "A comprehensive custom dataset curated for electoral analysis and data science projects.",
            link: "https://mirang.framer.ai/projects/dataset",
            image: datasetImg,
            techStack: ["Python", "Data Engineering", "Web Scraping", "Data Cleaning", "SQL"]
        },
        {
            id: "mlops",
            title: "MLOPS Pipeline",
            category: "MLOPS Simulation",
            description: "A complete simulation of an MLOps pipeline demonstrating CI/CD for machine learning models.",
            link: "https://mirang.framer.ai/projects/mlops",
            image: mlopsImg,
            techStack: ["MLflow", "Docker", "PostgreSQL", "Machine Learning", "GitHub CI/CD Actions"]
        }
    ],

    // --- Social Media ---
    socials: [
        {
            name: "GitHub",
            url: "https://github.com/mirb-404",
            handle: "@mirb-404"
        },
        {
            name: "X (Twitter)",
            url: "https://x.com/Angrycoder97",
            handle: "@Angrycoder97"
        },
        {
            name: "LinkedIn",
            url: "https://www.linkedin.com/in/mirangbhandari/",
            handle: "Mirang Bhandari"
        }
    ],

    // --- Other Interests ---
    hobbies: [
        {
            title: "Travelling",
            description: "Exploring new places and cultures!",
            icon: "camera",
            color: "#ec4899",
            bgImage: travelimg
        },
        {
            title: "Gaming",
            description: "Exploring new stories, worlds or playing competitively!",
            icon: "gamepad",
            color: "#22c55e",
            bgImage: overwatchimg
        },
        {
            title: "OSS",
            description: "Contributing to community-driven projects!",
            icon: "github",
            color: "#22c55e",
            bgImage: githubimg
        }
    ],
    // --- Resume & Fun Facts ---
    resumeUrl: "/resume.pdf",

    funFacts: [
        "I once debugged code in my sleep.",
        "I can explain Neural Networks using pizza toppings.",
        "My favorite keyboard shortcut is Ctrl+Z (for obvious reasons)."
    ]
};

// ===================================
// Chat Prompts
// ===================================

export const suggestPrompts = [
    "Tell me about yourself",
    "Recent GitHub Activity",
    "Show me your projects",
    "What are your skills?",
    "Work Experience",
    "Certifications",
    "My Hobbies",
    "Contact Me"
];
