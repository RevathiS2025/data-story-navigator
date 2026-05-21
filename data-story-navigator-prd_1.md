# PRD: Data Story Navigator — Web App

**Version:** 2.0  
**Status:** Live  
**Last updated:** 2026-05-20

---

## 1. Problem Statement

Data analysts building BI reports know their data but struggle to translate vague stakeholder business questions into the right data story and the right visual. Existing chart chooser tools match data types to charts — they do not go from business language to platform-specific implementation guidance.

This gap causes analysts to:
- Pick the wrong visual for the story they are trying to tell
- Frame the wrong narrative for the wrong audience
- Lose credibility with stakeholders when the report does not answer the actual question

No existing tool addresses the full chain: **business question → data story → BI visual → implementation guidance — across Power BI, Tableau, and Looker Studio.**

---

## 2. Objective

Build a web app that takes a stakeholder business question — typed in plain English or built via guided selection — and returns a specific, actionable data story recommendation with the exact visual to use, why it works, and how to set it up — for the analyst's chosen BI platform.

AI-powered via Groq free API. No login. No install. No cost to the user. Opens in any browser via a shared link.

---

## 3. Target Users

| User Group | Context |
|---|---|
| Data analysts in Power BI, Tableau, or Looker Studio | Need fast, confident visual decisions before presenting to stakeholders |
| Career returners | Rebuilding confidence in report design after a career break |
| SQL and BI tool learners | Know the data but not the storytelling layer |
| Junior analysts | Have the numbers, unsure how to frame the narrative |
| Community members | Need a free, accessible tool with no barriers to entry |

---

## 4. Distribution

- **Format:** Web app — static site (HTML + CSS + JavaScript)
- **Hosting:** Vercel (free tier, auto-deploys on every push to main)
- **Access:** Public URL — anyone with the link can use it instantly
- **Install required:** None
- **Cost to user:** Free
- **Cost to maintain:** Free
- **Backend required:** None
- **AI Provider:** Groq free API (user brings their own key)

**How it gets published:**
1. Claude Code builds all the files
2. Files are pushed to the GitHub repository (`RevathiS2025/data-story-navigator`)
3. Vercel is connected to the repository — auto-deploys on every push to `main`
4. A public URL is generated and shared with the community

---

## 5. API Key Setup (First Time Only)

The app uses the Groq free API for AI-powered responses. Each user provides their own Groq API key. This keeps the tool free, serverless, and secure — no key is ever shared or exposed.

**User setup steps:**
1. Go to console.groq.com and create a free account (no credit card required)
2. Generate an API key from the dashboard
3. Open the Data Story Navigator app
4. Click Settings and paste the key once
5. Key is stored in browser localStorage — never sent anywhere except directly to Groq

**Why Groq:**
- Free tier is genuinely generous — 30 requests per minute, no daily hard cap for typical personal use
- Fastest inference speed among free providers
- Runs Llama 3.3 70B (default), Llama 3.1 8B, and Mixtral — all capable of handling structured DA questions accurately
- No credit card required to start

---

## 6. Core Features

### 6.1 Tab Structure

The app is organised into five tabs in this order:

| Tab | Purpose |
|---|---|
| **Ask** | Type a stakeholder question in plain English |
| **DAX Builder** | Describe a calculation in plain English — get a ready-to-paste Power BI DAX measure |
| **New to this?** | Guided mode — answer three dropdowns to build a story recommendation |
| **Bookmarks** | Saved story cards — persist across sessions via localStorage |
| **History** | Last 10 story recommendations from the current session |

---

### 6.2 Three Input Modes

**Mode 1 — Ask (Plain English Input)**

User types the stakeholder question exactly as received:

> "Show me how sales is doing"  
> "Why did revenue drop last month"  
> "Which region is performing best"  
> "Are we on track to hit our target"

Question is sent to Groq API with a platform-specific system prompt that constrains the response to the correct visual list and terminology for the selected BI tool.

**Mode 2 — New to this? (Guided Selection)**

User answers three dropdown questions:

| Question | Options |
|---|---|
| What is your stakeholder asking? | Compare / Track over time / Show composition / Find outliers / Check progress toward goal / Understand distribution |
| Who is the audience? | Executive / Operations team / Sales team / Finance team / General |
| What is your data grain? | Daily / Weekly / Monthly / Yearly / By category / By geography |

Selections are combined into a structured prompt and sent to Groq API. Produces the same structured story card output as Ask mode.

**Mode 3 — DAX Builder**

Power BI specific. User describes what they want to calculate in plain English, then provides:
- Table name
- Key columns (comma-separated)
- Measure name (optional — auto-generated if left blank)

The app sends this to Groq with a DAX-specific system prompt and returns a ready-to-paste DAX measure with explanation.

---

### 6.3 Data Story Card (Output)

Every story recommendation returns a structured card with the following fields — all tailored to the selected platform:

**Story Type**  
e.g. Performance Tracking — Trend Over Time

**Recommended Visual**  
e.g. Line Chart (Power BI) / Line Chart (Tableau) / Line Chart (Looker Studio)

**Why this visual**  
One sentence tied directly to the business question.

**Axis / Field Configuration**  
Platform-specific field labels:
- Power BI: X Axis / Y Axis / Legend
- Tableau: Columns / Rows / Color / Size
- Looker Studio: Dimension / Metric / Breakdown Dimension

**Common Mistake to Avoid**  
e.g. "Do not use a bar chart here — it breaks the sense of continuity over time."

**Accessibility Tip**  
e.g. "Add a data label at the last point so the trend endpoint is readable without hovering."

**Alternative Visual**  
One alternative with a brief reason for when to use it instead.

---

### 6.4 Multi-Platform Support

The platform switcher (Power BI / Tableau / Looker Studio) controls which system prompt is used. Each platform has a dedicated prompt with:
- The correct visual list for that platform
- Platform-specific terminology (e.g. "Columns shelf" for Tableau, "Dimension" for Looker Studio)
- Platform-appropriate implementation notes

**Power BI visual coverage:**  
Bar Chart · Column Chart · Line Chart · Area Chart · Clustered Bar · Stacked Bar · Clustered Column · Stacked Column · Donut · Pie · Card · Multi-row Card · KPI Visual · Matrix · Table · Scatter Chart · Map · Filled Map · Waterfall Chart · Ribbon Chart · Decomposition Tree · Gauge

**Tableau visual coverage:**  
Bar Chart · Horizontal Bar Chart · Line Chart · Area Chart · Scatter Plot · Pie · Donut · Filled Map · Symbol Map · Heatmap · Highlight Table · Text Table · Treemap · Dual Axis · Box Plot · Histogram · Gantt Chart · Bullet Chart · Waterfall Chart · KPI (Big Number)

**Looker Studio visual coverage:**  
Bar Chart · Column Chart · Line Chart · Area Chart · Scatter Chart · Pie · Donut · Table · Pivot Table · Scorecard · Geo Chart · Filled Map · Treemap · Gauge · Bullet Chart · Heatmap · Combo Chart · Funnel Chart

---

### 6.5 Compare Platforms

Available on every story card. When clicked, the app fires two parallel API calls to the other two platforms (not the currently selected one) and renders a three-column grid showing:
- Story type
- Recommended visual
- Why this visual

The current platform column is highlighted. This lets analysts see meaningful differences in chart recommendations across Power BI, Tableau, and Looker Studio side by side.

---

### 6.6 DAX Builder Output

Returns a dedicated DAX card with:
- Measure name
- Ready-to-paste DAX code (syntax-highlighted)
- Plain-English explanation of what the measure calculates
- Copy button — copies the DAX code to clipboard

---

### 6.7 Bookmarks

- User clicks the Bookmark button on any story card to save it
- Bookmarks are stored in browser localStorage — they persist across sessions and tab closes
- Saved cards are listed in the Bookmarks tab
- Each saved card shows the original question and platform, and can be expanded to see the full card

---

### 6.8 Session History

- Last 10 story recommendations saved in browser sessionStorage
- User can revisit any result within the same session
- Clears when browser tab is closed — no persistent data stored

---

### 6.9 Copy to Clipboard

- User clicks a single Copy button on the story card
- Full recommendation copied as plain text
- DAX Builder has a separate Copy DAX button — copies only the DAX code

---

### 6.10 Settings Panel

- API key input field (masked, with show/hide toggle)
- Model selector: Llama 3.3 70B (default) / Llama 3.1 8B / Mixtral 8x7B
- Save key to localStorage
- Clear key option
- Link to Groq console for users who need to generate a key
- Brief explanation of why a key is needed and how it is used

---

### 6.11 App Accessibility

- Minimum WCAG AA contrast ratio on all text and interactive elements
- All actions reachable via keyboard (Tab, Enter, Escape)
- Input fields and buttons have visible focus states
- Screen reader compatible labels on all interactive elements
- ARIA roles on tabs, panels, dialogs, and live regions
- Mobile responsive — usable on phone and tablet without horizontal scrolling

---

## 7. Prompt Engineering (System Prompt Design)

Three platform-specific system prompts are used — one for Power BI, one for Tableau, one for Looker Studio. Each prompt:

- Constrains the AI to respond only in the defined story card format
- Restricts visual recommendations to the correct platform visual list
- Uses the correct platform terminology for axis/field configuration
- Discourages pie/donut charts unless the use case is genuinely compositional with under 5 categories
- Returns output as structured JSON so the app can render each field separately
- Never recommends visuals that do not exist natively in the target platform

A fourth prompt is used for the DAX Builder — it accepts a plain-English calculation description and returns a named DAX measure with explanation.

**Story card output schema (JSON):**
```json
{
  "story_type": "",
  "recommended_visual": "",
  "why_this_visual": "",
  "axis_config": {
    "x_axis": "",
    "y_axis": "",
    "legend": ""
  },
  "mistake_to_avoid": "",
  "accessibility_tip": "",
  "alternative_visual": "",
  "alternative_reason": ""
}
```

**DAX output schema (JSON):**
```json
{
  "measure_name": "",
  "dax_code": "",
  "explanation": ""
}
```

---

## 8. Edge Case Handling

### 8.1 Missing API Key

If the user has not set a Groq API key:

- Do not attempt the API call
- Show a clear inline banner: "Add your free Groq API key in Settings to get started."
- Banner includes a direct link to open Settings

### 8.2 API Error or Timeout

If the Groq API call fails:

- Show a plain error message: "Something went wrong. Check your API key in Settings or try again."
- Do not show a blank screen
- Do not expose raw API error messages to the user

### 8.3 Unstructured or Off-Topic Input

If the user types something unrelated to data or business questions:

- The system prompt instructs the AI to respond with: "This does not look like a stakeholder question. Try something like: Show me how sales is doing."
- App renders this as a soft prompt, not an error

### 8.4 DAX Builder Validation

If required DAX Builder fields are missing (calculation description, table name, or columns):

- Highlight the empty field in red
- Focus the field automatically
- Do not attempt the API call

---

## 9. Out of Scope

- No backend server
- No shared API key hosted by the tool owner
- No user accounts or cloud sync
- No file export (PNG, PDF, print)
- No live Power BI / Tableau / Looker file connection
- No multi-page report analysis
- No Chrome Web Store submission

---

## 10. Technical Architecture

| Component | Technology |
|---|---|
| App type | Static web app |
| UI layer | HTML + CSS + Vanilla JavaScript |
| AI provider | Groq free API (Llama 3.3 70B default) |
| API calls | `fetch()` from browser directly to Groq endpoint |
| Parallel API calls | `Promise.all()` — used for Compare Platforms feature |
| API key storage | Browser `localStorage` (user's machine only) |
| Bookmarks | Browser `localStorage` (persistent across sessions) |
| Session history | Browser `sessionStorage` |
| Text copy | Clipboard API |
| Hosting | Vercel (auto-deploys from GitHub main branch) |
| Repository | github.com/RevathiS2025/data-story-navigator |
| External dependencies | Groq API only — no npm, no build step |

---

## 11. User Flow

```
First time user
        ↓
Opens app via link (no install, no login)
        ↓
Banner prompts: Add your free Groq API key in Settings
        ↓
Creates free Groq account → generates key → pastes in Settings
        ↓
────────────────────────────────────────
Returning user (key already saved)
        ↓
Opens app → key loaded from localStorage automatically
        ↓
────────────────────────────────────────
Both paths continue here
        ↓
Select platform: Power BI / Tableau / Looker Studio
        ↓
Choose tab: Ask / DAX Builder / New to this?
        ↓
Submit question, guided selections, or DAX description
        ↓
  [API error or missing key?]
  → Show inline error or banner
        ↓
Story card or DAX card renders with all fields populated
        ↓
User reads recommendation
  → Copy to clipboard
  → Bookmark to save across sessions
  → Compare Platforms to see differences across BI tools
        ↓
Result saved to session history (story cards only)
```

---

## 12. Competitive Landscape

| Tool | What it does | What it misses |
|---|---|---|
| Data to Viz (data-to-viz.com) | Data type → chart type decision tree | No business language input, no platform specifics |
| Chart Doctor (Financial Times) | Static chart chooser flowchart | No stakeholder framing, no implementation guidance |
| Power BI built-in suggestions | Basic visual picker inside Desktop | No story framing, single platform only |

**This app is the only tool that goes:**  
Business question → Data story type → Platform-specific visual → Implementation guidance → Cross-platform comparison

---

## 13. Success Criteria

- Story card generates in under 3 seconds on a standard connection
- Works for all story types accurately across all three platforms
- Off-topic inputs are handled gracefully without errors
- API key setup takes under 5 minutes for a first-time user
- Copy to clipboard works correctly across major browsers (Chrome, Edge, Firefox, Safari)
- Mobile responsive on screens 375px wide and above
- App passes WCAG AA contrast ratio minimum
- App is fully navigable by keyboard
- API key never appears in the GitHub source code
- Vercel auto-deploys within 60 seconds of a push to main

---

## 14. Demo Story for Audience

> "I used Claude Code to build this in one session. Free for everyone — you just need a free Groq account which takes two minutes to set up. You type what your stakeholder asked you, and it tells you exactly which visual to use in Power BI, Tableau, or Looker Studio, why, and what mistake to avoid. You can even compare all three platforms side by side."

---

## 15. Future Considerations (V3+)

- Community-contributed prompt improvements via GitHub
- Multilingual support for non-English stakeholder questions
- Custom domain if adoption grows
- Excel chart mapping mode
- Saved workspaces — group bookmarks by project or client
- Export story card as PDF or image for stakeholder presentations
