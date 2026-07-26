import qhackImg from '../assets/q-hack.jpg';
import preview_tender from '../assets/preview_tender.png'
import q_hack_img from '../assets/q-hack_venue.jpg'
import algorandTeamImg from '../assets/algorand-berlin-team.jpg'
import algorandDemoImg from '../assets/algorand-berlin-demo.jpg'

export interface BlogAuthor {
  name: string;
  title?: string;
}

// ─── Content block types ────────────────────────────────────────────────────
// Add new posts by pushing a BlogPost object to the `blogPosts` array below.
// Each post's `content` array is made up of the block types listed here.
export type BlogContent =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'image'; url: string; alt: string; caption?: string }
  | { type: 'code'; language: string; content: string }
  | { type: 'quote'; text: string; author?: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'callout'; variant: 'info' | 'tip' | 'warning' | 'note'; title?: string; text: string }
  | { type: 'divider' };

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  tags?: string[];
  author?: BlogAuthor;
  content: BlogContent[];
}

export const blogPosts: BlogPost[] = [
  {
    id: 'mcpay-algorand-berlin',
    title: 'Building mcpay — Stripe for AI Agents at the Algorand x402 Hackathon (Berlin)',
    excerpt: 'A payment layer that lets agents buy MCP tools on-demand, settled on-chain per tool call. Built in 36 hours in Berlin — 23 paid calls served for $0.0037.',
    date: '2026-06-09',
    readTime: '7 min read',
    category: 'Hackathon',
    tags: ['mcp', 'x402', 'algorand', 'ai-agents', 'hackathon'],
    author: { name: 'Mirang Bhandari', title: 'Software Engineer' },
    content: [
      {
        type: 'paragraph',
        text: 'TLDR, I spent the weekend of **June 6–7 2026** at **42 Berlin** for the **Algorand Builders: Agentic Commerce x402 Hackathon** a 36-hour sprint with 110+ builders and 42 projects submitted. Our team of five built **mcpay**, a payment layer that lets an AI agent discover a specialised `MCP` tool, pay for it on-chain, and call it all without a single API key, signup form, or subscription.'
      },
      {
        type: 'image',
        url: algorandTeamImg,
        alt: 'Algorand Agentic Commerce x402 Hackathon — builders at 42 Berlin',
        caption: 'The Algorand x402 crowd at 42 Berlin'
      },
      {
        type: 'heading',
        level: 2,
        text: 'The Problem'
      },
      {
        type: 'paragraph',
        text: 'The `MCP` ecosystem exploded in a year everyone is shipping servers. But there is no way to **get paid** for one. If you write a genuinely useful MCP tool, your options are: give it away, or go build an entire SaaS around it billing, auth, dashboards, Stripe integration, a marketing site. That is weeks of work that has nothing to do with the tool itself.'
      },
      {
        type: 'paragraph',
        text: 'The mirror image of that problem is worse. An agent that needs a tool it does not already have is stuck. It cannot sign up for an account, it cannot enter a credit card, it cannot agree to terms of service. Agents are perfectly capable of *deciding* they need a paid capability and completely incapable of *acquiring* one.'
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'The Opportunity',
        text: 'If a tool call costs a fraction of a cent, the only billing model that makes sense is **per call, settled instantly**. No invoices, no minimums, no accounts. That is exactly the gap `x402` was designed to fill.'
      },
      {
        type: 'heading',
        level: 2,
        text: 'What We Built'
      },
      {
        type: 'paragraph',
        text: '**mcpay** is *Stripe for AI agents* a payment layer that lets agents buy specialised MCP tools on-demand, and lets developers monetise their tools without building a SaaS. It runs on the **x402 protocol** over **Algorand**, so every payment is a real on-chain `USDC` transfer with **4-second finality** and sub-cent fees, settled through the **GoPlausible** facilitator.'
      },
      {
        type: 'list',
        items: [
          '`mcpay` **SDK** Python client with agent-side auto-payment and a one-line `enable_paid_mcp()` for server authors',
          '**Gateway** a multi-tenant proxy that paywalls *any* upstream MCP server, with hot-reload and per-author payouts',
          '**Registry** a marketplace UI with semantic search across every registered gateway',
          '**Reference servers** working paid MCP servers for CoinGecko market data and Wikipedia',
          '**Agent demo** a `Claude` agent that discovers tools through the registry and pays for them by itself'
        ]
      },
      {
        type: 'heading',
        level: 2,
        text: 'The Server Side — One Function Call'
      },
      {
        type: 'paragraph',
        text: 'The design constraint we set early was that **making a tool paid should not change the tool**. A server author writes a normal `FastMCP` server, then wraps it. That is the whole integration.'
      },
      {
        type: 'code',
        language: 'python',
        content: `from mcp.server.fastmcp import FastMCP
from mcpay import enable_paid_mcp
import uvicorn

mcp = FastMCP("market-data", host="0.0.0.0", port=4024)

@mcp.tool()
async def get_crypto_price(symbol: str) -> dict:
    return await coingecko_lookup(symbol)

if __name__ == "__main__":
    app = enable_paid_mcp(
        mcp,
        payout_address="ALGO58CHARBASE32ADDRESS...",  # your Algorand address
        prices={"get_crypto_price": "$0.0002"},
    )
    uvicorn.run(app, host="0.0.0.0", port=4024)`
      },
      {
        type: 'paragraph',
        text: 'Behind that one call the SDK publishes a pricing manifest at `/.well-known/mcp-pricing.json`, installs a sliding-window rate limiter at **120 requests per IP per minute**, and prints a startup banner listing which protection layers are actually live so you are never guessing whether the paywall is on.'
      },
      {
        type: 'heading',
        level: 2,
        text: 'The Agent Side — Budget Caps, Not Trust'
      },
      {
        type: 'paragraph',
        text: 'The thing that makes agents-with-wallets frightening is unbounded spend. So the agent client takes a hard budget and refuses over-budget calls **locally, before anything touches the chain**. The agent also does not need to know which gateway owns which tool `connect_multi` routes each call to the right one.'
      },
      {
        type: 'code',
        language: 'python',
        content: `from mcpay import connect_multi, Money

async with connect_multi(
    ["http://localhost:4022"],
    max_spend=Money(0.005, "USDC"),
) as client:
    tools  = await client.list_tools()
    result = await client.call_tool("get_crypto_price", {"symbol": "BTC"})
    print(result.text, "| spent:", client.total_spent)`
      },
      {
        type: 'callout',
        variant: 'tip',
        title: 'Why the cap matters',
        text: 'A `$0.005` ceiling means the worst case for a misbehaving agent loop is half a cent not a drained wallet. Refusing locally also means a runaway agent costs **zero** on-chain fees while it fails.'
      },
      {
        type: 'heading',
        level: 2,
        text: 'The Architecture'
      },
      {
        type: 'code',
        language: 'text',
        content: `Agent (Claude / Grok / any LLM)
  |  MCP/SSE + x402-avm payment headers
  v
gateway/main.py  --->  GoPlausible Facilitator (Algorand TestNet)
  |                    verify + settle USDC ASA transfer
  |  SSE forward
  |---> market_data/main.py   :4024
  |---> wikipedia/main.py     :8080
  \\---> (any MCP server, no code changes needed)

registry/main.py  --->  aggregates gateways, serves marketplace UI`
      },
      {
        type: 'paragraph',
        text: 'The gateway is the interesting piece. It speaks MCP-over-SSE to the agent, intercepts the payment header, verifies and settles the USDC transfer through GoPlausible, and only then forwards the call downstream. The backing server needs **no code changes at all** you can paywall someone else\'s MCP server by pointing the gateway at it and POSTing to `/servers`, which hot-reloads without a restart.'
      },
      {
        type: 'heading',
        level: 2,
        text: 'The Part That Ate Our Saturday Night'
      },
      {
        type: 'paragraph',
        text: 'The first working version had an obvious hole: the gateway collected payment, but the backing server was still reachable directly over SSE. Pay nothing, skip the gateway, call the tool. A paywall with a door next to it.'
      },
      {
        type: 'paragraph',
        text: 'We closed it with **SHA-256 rotating bearer tokens** on 60-second windows between gateway and backing server, so a leaked token is worthless within a minute. Then we went further than we needed to for a hackathon and added **Layer 3 attestation** the payout address in a manifest is signed with **Algorand Ed25519**, so manifest tampering is *mathematically detectable* rather than merely unlikely. A cold key signs a delegation once, offline; the SDK auto-renews the warm signing key from there.'
      },
      {
        type: 'list',
        items: [
          'Replay protection `(payer, nonce)` pairs tracked in an LRU of 100k, or `SQLite` when you need it to survive restarts',
          'Phase 2 mode per-tool x402 enforcement directly on the server, which makes the gateway optional entirely',
          'CIDR-aware IP allowlisting, opt-in',
          'Per-author payouts and a configurable gateway take rate'
        ]
      },
      {
        type: 'heading',
        level: 2,
        text: 'The Demo'
      },
      {
        type: 'image',
        url: algorandDemoImg,
        alt: 'mcpay marketplace live dashboard during the demo at 42 Berlin',
        caption: 'Demoing the live marketplace — 2 servers, 4 tools, 23 calls served'
      },
      {
        type: 'paragraph',
        text: 'What we put on screen was a `Claude` agent given a plain-language task, with no tools of its own and a funded wallet. It queried the registry, found a tool it did not have, paid for it, and used it and the dashboard behind it ticked up in real time. By the end of the demo the counter read **23 calls served** for a grand total of **$0.0037**.'
      },
      {
        type: 'paragraph',
        text: 'That number is the entire pitch. Under a cent for two dozen paid tool calls is a price point where per-call billing stops being a novelty and starts being the *obvious* way to do it. Nobody builds a subscription business around fractions of a cent. But an agent with a wallet does not need one.'
      },
      {
        type: 'callout',
        variant: 'note',
        title: 'Source',
        text: 'Built with Yash Annapure, Aryaan Kulkarni, Hrithik Wadile and Haaris Khalil. The full stack SDK, gateway, registry and reference servers is `MIT` licensed at `github.com/Yash-Annapure/MCP-Marketplace`.'
      },
      {
        type: 'divider'
      },
      {
        type: 'heading',
        level: 2,
        text: 'What I Took Away'
      },
      {
        type: 'paragraph',
        text: 'We did not walk away with a prize 42 projects and some genuinely excellent ones in the room. What I did walk away with was a much sharper sense of what is missing in the agent stack. Everyone is building **capability**, and almost nobody is building the **commerce rails** underneath it. Agents can already reason about what they need. They just cannot buy it.'
      },
      {
        type: 'paragraph',
        text: 'Also, a smaller lesson that keeps repeating for me in hackathons: the security work was the part that made the demo credible. Anyone can show a payment succeeding. Being able to answer *"what stops me from just bypassing your gateway?"* on stage is what turns a demo into a product argument.'
      },
      {
        type: 'quote',
        text: 'We spent a decade building payment infrastructure for humans clicking buttons. Agents do not click buttons, and they transact in fractions of a cent. That is not a smaller version of the same problem, it is a different one, and it needs different rails.',
        author: 'Mirang Bhandari'
      }
    ]
  },
  {
    id: 'qhack-tenderflow',
    title: 'Building TenderFlow at Q-Hack (Mannheim, Germany)',
    excerpt: 'How our team built an AI-powered RFP automation platform in 24 hours — slashing tender costs from €25k to ~€100 in tokens.',
    date: '2026-05-03',
    readTime: '5 min read',
    category: 'Hackathon',
    tags: ['langgraph', 'ai-agents', 'llm', 'hackathon'],
    author: { name: 'Mirang Bhandari', title: 'Software Engineer' },
    content: [
      {
        type: 'paragraph',
        text: ' TLDR, In Q-Hack one of the challenges set was by **ISTARI.AI (Startup)**, it was a competitive, invite-only hackathon where teams were screened before even getting in the door. The brief about our challenge? build something that meaningfully **applies AI to a real business problem.** We picked one of the most overlooked pain points in the enterprise world **Government tender Responses (Goverment Contract Generation)**.'
      },
      {
        type: 'heading',
        level: 2,
        text: 'The Problem'
      },
      {
        type: 'paragraph',
        text: 'Responding to a government RFP (Request for Proposal) is brutal. A single tender can take weeks of work from multiple consultants, lawyers, and domain experts. The going rate? **€20,000** to **€30,000** per submission **(Yikes...)** and that\'s before you\'ve won a single contract. Most of that cost is just writing: rephrasing past proposals, assembling team CVs, reformatting methodology docs.'
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'The Opportunity',
        text: 'If **80%** of tender writing is retrieving and reformatting existing content, an `LLM` with a good knowledge base can do that draft in minutes not weeks.'
      },
      {
        type: 'heading',
        level: 2,
        text: 'What We Built'
      },
      {
        type: 'image',
        url: qhackImg,
        alt: 'Q-Hack hackathon — TenderFlow team at Mannheim, Germany',
        caption: 'The Q-Hack Team'
      },
      {
        type: 'paragraph',
        text: '**TenderFlow** is an AI agent that takes a raw RFP document containing basic details of the tender and produces a structured, high-quality draft response instantaneously. It pulls from an organisation\'s internal knowledge base (past tenders, CVs, methodology docs) using `vector search`, drafts each section with `Claude`, scores the output across seven quality dimensions, and then hands control back to a human reviewer before anything goes out the door.'
      },
      {
        type: 'list',
        items: [
          'Automated RFP analysis extracts requirements and compliance checklists',
          '`pgvector`powered knowledge base retrieval over internal documents',
          'Multi-section drafting with source traceability',
          'Quality scoring across track record, methodology, team, compliance, and pricing',
          'Human-in-the-loop review with up to 3 iteration rounds',
          '`DOCX` or `PDF` export ready for submission'
        ]
      },
      {
        type: 'heading',
        level: 2,
        text: 'The Stack'
      },
      {
        type: 'paragraph',
        text: 'The core of **TenderFlow** is a six-node `LangGraph` workflow. `LangGraph` let us model the tender process as an explicit state machine each node does one job, the graph handles routing, and `PostgreSQL` checkpointing means the workflow survives restarts.'
      },
      {
        type: 'code',
        language: 'python',
        content: `# Simplified LangGraph workflow
from langgraph.graph import StateGraph

workflow = StateGraph(TenderState)

workflow.add_node("analyse_tender",  analyse_tender)
workflow.add_node("retrieve_context", retrieve_context)
workflow.add_node("draft_sections",  draft_sections)
workflow.add_node("human_review",    human_review)   # HITL interrupt
workflow.add_node("polish",          polish_sections)
workflow.add_node("export",          export_docx)

# graph pauses at human_review — resumes via API after edits
workflow.add_edge("draft_sections", "human_review")
workflow.add_edge("human_review",   "polish")`
      },
      {
        type: 'heading',
        level: 2,
        text: 'The Human-in-the-Loop Part'
      },
      {
        type: 'paragraph',
        text: 'Full automation was never the goal. Tenders are legal documents you need a human to sign off. `LangGraph`\'s interrupt mechanism let us pause the workflow mid-execution, surface the draft in a **split-pane review UI** alongside the original RFP, and then resume exactly where it left off after the reviewer made edits. The state was persisted in `Supabase` the whole time, so nothing was lost between sessions.'
      },
      {
        type: 'image',
        url: preview_tender,
        alt: 'preview_tender',
        caption: 'TenderFlow - Preview Page'
      },
      {
        type: 'heading',
        level: 2,
        text: 'The Numbers'
      },
      {
        type: 'paragraph',
        text: 'A typical tender submission costs **€20k–€30k** in consultant time. TenderFlow brings that down to roughly **€100** in `API` tokens with a human reviewer still in the loop for quality and compliance. That\'s not a marginal improvement it\'s a different order of magnitude.'
      },
      {
        type: 'divider'
      },
      {
        type: 'heading',
        level: 2,
        text: 'Beyond the Build'
      },
      {
        type: 'paragraph',
        text: 'We pitched **TenderFlow** to an investor panel at the end of the hackathon. The conversations that followed were as valuable as the build itself talking with **Y Combinator-backed** founders about **time-to-market**, **token economics**, and what **"profitability in the AI era"** actually means when your infrastructure cost is measured in API calls.'
      },
      {
        type: 'paragraph',
        text: 'The thing I took away at the end of **Q-Hack** was'
      },
      {
        type: 'quote',
        text: 'The best AI products right now aren\'t about replacing humans they\'re about removing the tedious parts of a job so the expert can focus on the 20% that actually requires their judgement. That\'s what TenderFlow does, and it\'s a pattern worth building on.',
        author: 'Mirang Bhandari'
      },
      {
        type: 'image',
        url: q_hack_img,
        alt: 'q_hack_imgr',
        caption: 'Q-Hack Venue'
      }
    ]
  }
];

export const getBlogById = (id: string): BlogPost | undefined =>
  blogPosts.find(post => post.id === id);

export const getCategories = (): string[] =>
  [...new Set(blogPosts.map(post => post.category))];
