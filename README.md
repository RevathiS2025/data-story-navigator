# Data Story Navigator

**Business question → Data story → Power BI visual → Ready to build**

A free, browser-based tool that takes a stakeholder question in plain English and returns a specific Power BI visual recommendation with axis config, common mistakes, accessibility tips, and an alternative visual — all powered by the Groq free API.

🔗 **Live app:** [revathis2025.github.io/data-story-navigator](https://revathis2025.github.io/data-story-navigator)

---

## What it does

Most chart chooser tools match data types to charts. This tool goes further:

**Stakeholder question → Story type → Power BI visual → How to set it up**

You type what your stakeholder asked. The app tells you:
- Which **data story type** applies (e.g. Performance Tracking — Trend Over Time)
- Which **Power BI visual** to use
- **Why** that visual works for this question
- **Axis configuration** — what goes on X, Y, and Legend
- The **most common mistake** to avoid with that visual
- An **accessibility tip** specific to Power BI
- An **alternative visual** and when to use it instead

---

## Features

| Feature | Description |
|---|---|
| Plain English input | Type the stakeholder question exactly as received |
| Guided Mode | Answer 3 dropdowns (intent / audience / data grain) |
| Stakeholder Translator | Paste a vague request — get back what it means in data terms, what data you need, and what to ask back |
| Session History | Last 10 results saved per session, click to replay |
| Copy to Clipboard | Full story card copied as plain text in one click |
| Settings | Paste your Groq API key once — stored in localStorage |

---

## Getting started

### You need a free Groq API key

1. Go to [console.groq.com](https://console.groq.com) and create a free account — no credit card required
2. Generate an API key from the dashboard
3. Open the app, click **⚙ Settings**, and paste the key
4. Key is stored in your browser only — never sent anywhere except directly to Groq

### Run locally

No install needed. Just open `index.html` in any modern browser (Chrome, Edge, Firefox).

```
index.html   ← open this
styles.css
app.js
```

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | HTML + CSS + Vanilla JavaScript |
| AI | Groq free API (Llama 3.3 70B) |
| API calls | `fetch()` from browser directly to Groq |
| Key storage | Browser `localStorage` |
| Session history | Browser `sessionStorage` |
| Hosting | GitHub Pages |
| Dependencies | None — no npm, no build step |

---

## Power BI visuals covered

Bar Chart · Column Chart · Line Chart · Area Chart · Clustered Bar · Stacked Bar · Donut · Pie · Card · Multi-row Card · KPI Visual · Matrix · Table · Scatter Chart · Map · Filled Map · Waterfall Chart · Ribbon Chart · Decomposition Tree · Gauge

---

## Who this is for

- Data analysts who know their data but want confident visual decisions before presenting
- Junior analysts who have the numbers but are unsure how to frame the narrative
- Career returners rebuilding confidence in Power BI report design
- SQL and Power BI learners working on the storytelling layer
- Anyone who has received a vague stakeholder request and needs to translate it into a report

---

## Privacy

Your Groq API key is stored only in your browser's `localStorage`. It is never sent to any server other than Groq's own API endpoint. No analytics, no tracking, no backend.

---

## Built with

[Claude Code](https://claude.ai/code) — built in a single session from a PRD.
