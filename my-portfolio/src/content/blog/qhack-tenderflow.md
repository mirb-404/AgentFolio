---
title: Building TenderFlow at Q-Hack (Mannheim, Germany)
excerpt: How our team built an AI-powered RFP automation platform in 24 hours — slashing tender costs from €25k to ~€100 in tokens.
date: 2026-05-03
readTime: 5 min read
category: Hackathon
tags: [langgraph, ai-agents, llm, hackathon]
author: Mirang Bhandari
authorTitle: Software Engineer
---

TLDR, In Q-Hack one of the challenges set was by **ISTARI.AI (Startup)**, it was a competitive, invite-only hackathon where teams were screened before even getting in the door. The brief about our challenge? build something that meaningfully **applies AI to a real business problem.** We picked one of the most overlooked pain points in the enterprise world **Government tender Responses (Goverment Contract Generation)**.

## The Problem

Responding to a government RFP (Request for Proposal) is brutal. A single tender can take weeks of work from multiple consultants, lawyers, and domain experts. The going rate? **€20,000** to **€30,000** per submission **(Yikes...)** and that's before you've won a single contract. Most of that cost is just writing: rephrasing past proposals, assembling team CVs, reformatting methodology docs.

::: info The Opportunity
If **80%** of tender writing is retrieving and reformatting existing content, an `LLM` with a good knowledge base can do that draft in minutes not weeks.
:::

## What We Built

![Q-Hack hackathon — TenderFlow team at Mannheim, Germany](q-hack.jpg "The Q-Hack Team")

**TenderFlow** is an AI agent that takes a raw RFP document containing basic details of the tender and produces a structured, high-quality draft response instantaneously. It pulls from an organisation's internal knowledge base (past tenders, CVs, methodology docs) using `vector search`, drafts each section with `Claude`, scores the output across seven quality dimensions, and then hands control back to a human reviewer before anything goes out the door.

- Automated RFP analysis extracts requirements and compliance checklists
- `pgvector`powered knowledge base retrieval over internal documents
- Multi-section drafting with source traceability
- Quality scoring across track record, methodology, team, compliance, and pricing
- Human-in-the-loop review with up to 3 iteration rounds
- `DOCX` or `PDF` export ready for submission

## The Stack

The core of **TenderFlow** is a six-node `LangGraph` workflow. `LangGraph` let us model the tender process as an explicit state machine each node does one job, the graph handles routing, and `PostgreSQL` checkpointing means the workflow survives restarts.

```python
# Simplified LangGraph workflow
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
workflow.add_edge("human_review",   "polish")
```

## The Human-in-the-Loop Part

Full automation was never the goal. Tenders are legal documents you need a human to sign off. `LangGraph`'s interrupt mechanism let us pause the workflow mid-execution, surface the draft in a **split-pane review UI** alongside the original RFP, and then resume exactly where it left off after the reviewer made edits. The state was persisted in `Supabase` the whole time, so nothing was lost between sessions.

![preview_tender](preview_tender.png "TenderFlow - Preview Page")

## The Numbers

A typical tender submission costs **€20k–€30k** in consultant time. TenderFlow brings that down to roughly **€100** in `API` tokens with a human reviewer still in the loop for quality and compliance. That's not a marginal improvement it's a different order of magnitude.

---

## Beyond the Build

We pitched **TenderFlow** to an investor panel at the end of the hackathon. The conversations that followed were as valuable as the build itself talking with **Y Combinator-backed** founders about **time-to-market**, **token economics**, and what **"profitability in the AI era"** actually means when your infrastructure cost is measured in API calls.

The thing I took away at the end of **Q-Hack** was

> The best AI products right now aren't about replacing humans they're about removing the tedious parts of a job so the expert can focus on the 20% that actually requires their judgement. That's what TenderFlow does, and it's a pattern worth building on.
>
> — Mirang Bhandari

![q_hack_imgr](q-hack_venue.jpg "Q-Hack Venue")
