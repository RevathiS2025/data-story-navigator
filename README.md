# Data Story Navigator

**Business question → Data story → Visual recommendation → Ready to build**

A free, browser-based tool that takes a stakeholder question in plain English and returns a specific visual recommendation with axis config, common mistakes, accessibility tips, and an alternative visual — for **Power BI, Tableau, and Looker Studio**. Powered by the Groq free API.

🔗 **Live app:** [revathis2025.github.io/data-story-navigator](https://revathis2025.github.io/data-story-navigator)

---

## What it does

Most chart chooser tools match data types to charts. This tool goes further:

**Stakeholder question → Story type → Visual recommendation → How to set it up**

You type what your stakeholder asked. The app tells you:
- Which **data story type** applies (e.g. Performance Tracking — Trend Over Time)
- Which **visual** to use in your chosen platform
- **Why** that visual works for this question
- **Axis configuration** — what goes on each axis and the color/legend field
- The **most common mistake** to avoid with that visual
- An **accessibility tip** specific to your platform
- An **alternative visual** and when to use it instead

For Power BI users, you can also generate a **ready-to-paste DAX measure** matched to the story card.

---

## Features

| Feature | Description |
|---|---|
| Plain English input | Type the stakeholder question exactly as received |
| Guided Mode | Answer 3 dropdowns (intent / audience / data grain) |
| Stakeholder Translator | Paste a vague request — get back what it means in data terms, what data you need, and what to ask back |
| Multi-platform | Switch between Power BI, Tableau, and Looker Studio — each with platform-specific terminology and visual lists |
| DAX Measure Generator | Power BI only — generates a ready-to-paste DAX measure matched to the story card |
| Persistent Bookmarks | Save story cards to localStorage so they survive tab close — replay any saved card in one click |
| Session History | Last 10 results saved per session — clears when the tab closes |
| Copy to Clipboard | Full story card copied as plain text in one click |
| Dark / Light theme | Toggle between dark and light mode — preference saved across sessions |
| Settings | Paste your Groq API key once — stored in localStorage, never sent anywhere except Groq |

---

## Getting started

### You need a free Groq API key

1. Go to [console.groq.com](https://console.groq.com) and create a free account — no credit card required
2. Generate an API key from the dashboard
3. Open the app, click **⚙ Settings**, and paste the key
4. Key is stored in your browser only — never sent anywhere except directly to Groq

### Run locally

No install needed. Just open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).

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
| Bookmarks | Browser `localStorage` (persistent across sessions) |
| Session history | Browser `sessionStorage` |
| Text copy | Clipboard API |
| Hosting | GitHub Pages |
| Dependencies | None — no npm, no build step |

---

## Platforms supported

### Power BI
Bar Chart · Column Chart · Line Chart · Area Chart · Clustered Bar · Stacked Bar · Clustered Column · Stacked Column · Donut · Pie · Card · Multi-row Card · KPI Visual · Matrix · Table · Scatter Chart · Map · Filled Map · Waterfall Chart · Ribbon Chart · Decomposition Tree · Gauge

### Tableau
Bar Chart · Horizontal Bar Chart · Line Chart · Area Chart · Scatter Plot · Pie · Donut · Filled Map · Symbol Map · Heatmap · Highlight Table · Text Table · Treemap · Dual Axis · Box Plot · Histogram · Gantt Chart · Bullet Chart · Waterfall Chart · KPI (Big Number)

### Looker Studio
Bar Chart · Column Chart · Line Chart · Area Chart · Scatter Chart · Pie · Donut · Table · Pivot Table · Scorecard · Geo Chart · Filled Map · Treemap · Gauge · Bullet Chart · Heatmap · Combo Chart · Funnel Chart

---

## Who this is for

- Data analysts who know their data but want confident visual decisions before presenting
- Junior analysts who have the numbers but are unsure how to frame the narrative
- Career returners rebuilding confidence in report design after a career break
- SQL and BI tool learners working on the storytelling layer
- Anyone who has received a vague stakeholder request and needs to translate it into a report

---

## Privacy

Your Groq API key is stored only in your browser's `localStorage`. It is never sent to any server other than Groq's own API endpoint. No analytics, no tracking, no backend.
