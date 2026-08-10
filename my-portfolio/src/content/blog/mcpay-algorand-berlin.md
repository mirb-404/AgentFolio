---
title: Building mcpay — Stripe for AI Agents at the Algorand x402 Hackathon (Berlin)
excerpt: A payment layer that lets agents buy MCP tools on-demand, settled on-chain per tool call. Built in 36 hours in Berlin — 23 paid calls served for $0.0037.
date: 2026-06-09
readTime: 7 min read
category: Hackathon
tags: [mcp, x402, algorand, ai-agents, hackathon]
author: Mirang Bhandari
authorTitle: Software Engineer
---

TLDR, I spent the weekend of **June 6–7 2026** at **42 Berlin** for the **Algorand Builders: Agentic Commerce x402 Hackathon** a 36-hour sprint with 110+ builders and 42 projects submitted. Our team of five built **mcpay**, a payment layer that lets an AI agent discover a specialised `MCP` tool, pay for it on-chain, and call it all without a single API key, signup form, or subscription.

![Algorand Agentic Commerce x402 Hackathon — builders at 42 Berlin](algorand-berlin-team.jpg "The Algorand x402 crowd at 42 Berlin")

## The Problem

The `MCP` ecosystem exploded in a year everyone is shipping servers. But there is no way to **get paid** for one. If you write a genuinely useful MCP tool, your options are: give it away, or go build an entire SaaS around it billing, auth, dashboards, Stripe integration, a marketing site. That is weeks of work that has nothing to do with the tool itself.

The mirror image of that problem is worse. An agent that needs a tool it does not already have is stuck. It cannot sign up for an account, it cannot enter a credit card, it cannot agree to terms of service. Agents are perfectly capable of *deciding* they need a paid capability and completely incapable of *acquiring* one.

::: info The Opportunity
If a tool call costs a fraction of a cent, the only billing model that makes sense is **per call, settled instantly**. No invoices, no minimums, no accounts. That is exactly the gap `x402` was designed to fill.
:::

## What We Built

**mcpay** is *Stripe for AI agents* a payment layer that lets agents buy specialised MCP tools on-demand, and lets developers monetise their tools without building a SaaS. It runs on the **x402 protocol** over **Algorand**, so every payment is a real on-chain `USDC` transfer with **4-second finality** and sub-cent fees, settled through the **GoPlausible** facilitator.

- `mcpay` **SDK** Python client with agent-side auto-payment and a one-line `enable_paid_mcp()` for server authors
- **Gateway** a multi-tenant proxy that paywalls *any* upstream MCP server, with hot-reload and per-author payouts
- **Registry** a marketplace UI with semantic search across every registered gateway
- **Reference servers** working paid MCP servers for CoinGecko market data and Wikipedia
- **Agent demo** a `Claude` agent that discovers tools through the registry and pays for them by itself

## The Server Side — One Function Call

The design constraint we set early was that **making a tool paid should not change the tool**. A server author writes a normal `FastMCP` server, then wraps it. That is the whole integration.

```python
from mcp.server.fastmcp import FastMCP
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
    uvicorn.run(app, host="0.0.0.0", port=4024)
```

Behind that one call the SDK publishes a pricing manifest at `/.well-known/mcp-pricing.json`, installs a sliding-window rate limiter at **120 requests per IP per minute**, and prints a startup banner listing which protection layers are actually live so you are never guessing whether the paywall is on.

## The Agent Side — Budget Caps, Not Trust

The thing that makes agents-with-wallets frightening is unbounded spend. So the agent client takes a hard budget and refuses over-budget calls **locally, before anything touches the chain**. The agent also does not need to know which gateway owns which tool `connect_multi` routes each call to the right one.

```python
from mcpay import connect_multi, Money

async with connect_multi(
    ["http://localhost:4022"],
    max_spend=Money(0.005, "USDC"),
) as client:
    tools  = await client.list_tools()
    result = await client.call_tool("get_crypto_price", {"symbol": "BTC"})
    print(result.text, "| spent:", client.total_spent)
```

::: tip Why the cap matters
A `$0.005` ceiling means the worst case for a misbehaving agent loop is half a cent not a drained wallet. Refusing locally also means a runaway agent costs **zero** on-chain fees while it fails.
:::

## The Architecture

```text
Agent (Claude / Grok / any LLM)
  |  MCP/SSE + x402-avm payment headers
  v
gateway/main.py  --->  GoPlausible Facilitator (Algorand TestNet)
  |                    verify + settle USDC ASA transfer
  |  SSE forward
  |---> market_data/main.py   :4024
  |---> wikipedia/main.py     :8080
  \---> (any MCP server, no code changes needed)

registry/main.py  --->  aggregates gateways, serves marketplace UI
```

The gateway is the interesting piece. It speaks MCP-over-SSE to the agent, intercepts the payment header, verifies and settles the USDC transfer through GoPlausible, and only then forwards the call downstream. The backing server needs **no code changes at all** you can paywall someone else's MCP server by pointing the gateway at it and POSTing to `/servers`, which hot-reloads without a restart.

## The Part That Ate Our Saturday Night

The first working version had an obvious hole: the gateway collected payment, but the backing server was still reachable directly over SSE. Pay nothing, skip the gateway, call the tool. A paywall with a door next to it.

We closed it with **SHA-256 rotating bearer tokens** on 60-second windows between gateway and backing server, so a leaked token is worthless within a minute. Then we went further than we needed to for a hackathon and added **Layer 3 attestation** the payout address in a manifest is signed with **Algorand Ed25519**, so manifest tampering is *mathematically detectable* rather than merely unlikely. A cold key signs a delegation once, offline; the SDK auto-renews the warm signing key from there.

- Replay protection `(payer, nonce)` pairs tracked in an LRU of 100k, or `SQLite` when you need it to survive restarts
- Phase 2 mode per-tool x402 enforcement directly on the server, which makes the gateway optional entirely
- CIDR-aware IP allowlisting, opt-in
- Per-author payouts and a configurable gateway take rate

## The Demo

![mcpay marketplace live dashboard during the demo at 42 Berlin](algorand-berlin-demo.jpg "Demoing the live marketplace — 2 servers, 4 tools, 23 calls served")

What we put on screen was a `Claude` agent given a plain-language task, with no tools of its own and a funded wallet. It queried the registry, found a tool it did not have, paid for it, and used it and the dashboard behind it ticked up in real time. By the end of the demo the counter read **23 calls served** for a grand total of **$0.0037**.

That number is the entire pitch. Under a cent for two dozen paid tool calls is a price point where per-call billing stops being a novelty and starts being the *obvious* way to do it. Nobody builds a subscription business around fractions of a cent. But an agent with a wallet does not need one.

::: note Source
Built with Yash Annapure, Aryaan Kulkarni, Hrithik Wadile and Haaris Khalil. The full stack SDK, gateway, registry and reference servers is `MIT` licensed at `github.com/Yash-Annapure/MCP-Marketplace`.
:::

---

## What I Took Away

We did not walk away with a prize 42 projects and some genuinely excellent ones in the room. What I did walk away with was a much sharper sense of what is missing in the agent stack. Everyone is building **capability**, and almost nobody is building the **commerce rails** underneath it. Agents can already reason about what they need. They just cannot buy it.

Also, a smaller lesson that keeps repeating for me in hackathons: the security work was the part that made the demo credible. Anyone can show a payment succeeding. Being able to answer *"what stops me from just bypassing your gateway?"* on stage is what turns a demo into a product argument.
