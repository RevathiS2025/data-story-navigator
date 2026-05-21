'use strict';

// ===== STATE =====
let apiKey    = localStorage.getItem('dsn_api_key') || '';
const LEGACY_MODELS = new Set(['llama3-70b-8192', 'llama3-8b-8192']);
const _storedModel = localStorage.getItem('dsn_model') || '';
let model     = (LEGACY_MODELS.has(_storedModel) || !_storedModel) ? 'llama-3.3-70b-versatile' : _storedModel;
let history   = JSON.parse(sessionStorage.getItem('dsn_history')  || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dsn_bookmarks')  || '[]');
let platform  = localStorage.getItem('dsn_platform') || 'powerbi';
let theme     = localStorage.getItem('dsn_theme')    || 'dark';

let _clipboardText   = '';
let _currentStory    = null;
let _currentResult   = null;
let _currentQuery    = '';
let _currentCardType = '';
let _currentCardId   = null;
let _currentDaxCode  = '';

// ===== PLATFORM METADATA =====
const PLATFORM_META = {
  powerbi: { name: 'Power BI',       axis: { x: 'X Axis',    y: 'Y Axis',  color: 'Legend'    } },
  tableau: { name: 'Tableau',         axis: { x: 'Columns',   y: 'Rows',    color: 'Color'     } },
  looker:  { name: 'Looker Studio',   axis: { x: 'Dimension', y: 'Metric',  color: 'Breakdown' } },
};

// ===== PLATFORM CHIPS =====
const PLATFORM_CHIPS = {
  powerbi: [
    'Show me how sales is doing',
    'Why did revenue drop last month',
    'Which region is performing best',
    'Are we on track to hit our target',
  ],
  tableau: [
    'Compare sales performance by category',
    'Show me revenue trend over the last 12 months',
    'Which products have the highest profit margin',
    'How are our top 10 customers performing',
  ],
  looker: [
    'What is our website traffic by channel',
    'Show me conversion rate by campaign',
    'Which pages have the highest bounce rate',
    'How is our revenue trending this quarter',
  ],
};

// ===== SYSTEM PROMPTS =====
const STORY_PROMPTS = {

powerbi: `You are a Power BI data storytelling expert. A data analyst has received a stakeholder business question and needs to know the right data story type and Power BI visual.

Respond with ONLY a valid JSON object — no markdown, no code fences, no explanation text. Raw JSON only.

Required JSON structure:
{
  "story_type": "Brief name of the data story type (e.g. Performance Tracking — Trend Over Time)",
  "recommended_visual": "Exact name of the Power BI native visual",
  "why_this_visual": "One sentence explaining why this visual suits this specific business question",
  "axis_config": {
    "x_axis": "What field or dimension belongs on the X axis",
    "y_axis": "What measure or metric belongs on the Y axis",
    "legend": "Optional breakdown field, or 'Not required'"
  },
  "mistake_to_avoid": "The single most common mistake analysts make with this visual and why it harms the story",
  "accessibility_tip": "One specific, actionable Power BI accessibility tip for this visual",
  "alternative_visual": "Name of one alternative Power BI native visual",
  "alternative_reason": "When to use the alternative instead of the recommended visual"
}

STRICT RULES:
1. Only recommend visuals from this list: Bar Chart, Clustered Bar Chart, Stacked Bar Chart, 100% Stacked Bar Chart, Column Chart, Clustered Column Chart, Stacked Column Chart, 100% Stacked Column Chart, Line Chart, Area Chart, Stacked Area Chart, Line and Stacked Column Chart, Line and Clustered Column Chart, Donut Chart, Pie Chart, Funnel Chart, Treemap, Card, Multi-row Card, KPI Visual, Matrix, Table, Scatter Chart, Map, Filled Map, Shape Map, Waterfall Chart, Ribbon Chart, Decomposition Tree, Key Influencers, Gauge, Small Multiples
2. Only recommend Pie or Donut if the question is genuinely about part-to-whole composition AND has fewer than 5 categories
3. Never recommend a visual that does not exist natively in Power BI Desktop
4. Use these chart types for specific scenarios: Funnel Chart for pipeline/conversion stages, Treemap for hierarchical part-to-whole with many categories, 100% Stacked Bar/Column for normalized composition comparison, Stacked Area Chart for cumulative trend over time, Line and Stacked Column Chart for combining volume and trend, Waterfall Chart for variance and contribution analysis, Ribbon Chart for ranking changes over time, Decomposition Tree for root-cause exploration, Key Influencers for identifying what drives a metric, Small Multiples for comparing the same chart across multiple segments
5. If the input is not about data analysis or reporting, respond with exactly: {"error": "This does not look like a stakeholder question. Try something like: Show me how sales is doing."}`,

tableau: `You are a Tableau data storytelling expert. A data analyst has received a stakeholder business question and needs to know the right data story type and Tableau chart type.

Respond with ONLY a valid JSON object — no markdown, no code fences, no explanation text. Raw JSON only.

Required JSON structure:
{
  "story_type": "Brief name of the data story type (e.g. Performance Tracking — Trend Over Time)",
  "recommended_visual": "Exact name of the Tableau chart type",
  "why_this_visual": "One sentence explaining why this visual suits this specific business question",
  "axis_config": {
    "x_axis": "What dimension or measure goes on the Columns shelf",
    "y_axis": "What measure goes on the Rows shelf",
    "legend": "Color, Size, or Shape encoding field — or 'Not required'"
  },
  "mistake_to_avoid": "The single most common mistake analysts make with this chart type in Tableau and why it weakens the story",
  "accessibility_tip": "One specific, actionable Tableau accessibility tip for this chart",
  "alternative_visual": "Name of one alternative Tableau chart type",
  "alternative_reason": "When to use the alternative instead"
}

STRICT RULES:
1. Only recommend visuals from this list: Bar Chart, Stacked Bar Chart, Horizontal Bar Chart, Lollipop Chart, Line Chart, Step Line Chart, Area Chart, Stacked Area Chart, Scatter Plot, Packed Bubbles, Pie Chart, Donut Chart, Filled Map, Symbol Map, Density Map, Heatmap, Highlight Table, Text Table, Treemap, Dual Axis Chart, Combo Chart, Box Plot, Histogram, Gantt Chart, Bullet Chart, Waterfall Chart, Bump Chart, Slope Chart, KPI (Big Number)
2. Only recommend Pie or Donut if the question is genuinely about part-to-whole composition AND has fewer than 5 categories
3. Use Tableau-specific terminology — reference Columns shelf, Rows shelf, Marks card, Color/Size/Shape/Tooltip encodings
4. Tableau has unique strengths — use these chart types for specific scenarios: Packed Bubbles for proportional comparison without ranked order, Density Map for geographic concentration, Step Line Chart for metrics that change discretely (e.g. pricing tiers, headcount), Bump Chart for ranking changes over time, Slope Chart for comparing exactly two time points, Lollipop Chart as a cleaner alternative to bar charts for single-series data, Stacked Area Chart for cumulative volume over time, Dual Axis Chart for comparing two different measures on the same timeline, Heatmap/Highlight Table for cross-dimensional pattern analysis, Box Plot for distribution spread, Gantt for timeline/project tracking
5. If the input is not about data analysis or reporting, respond with exactly: {"error": "This does not look like a stakeholder question. Try something like: Show me how sales is doing."}`,

looker: `You are a Google Looker Studio data storytelling expert. A data analyst has received a stakeholder business question and needs to know the right data story type and Looker Studio chart type.

Respond with ONLY a valid JSON object — no markdown, no code fences, no explanation text. Raw JSON only.

Required JSON structure:
{
  "story_type": "Brief name of the data story type (e.g. Performance Tracking — Trend Over Time)",
  "recommended_visual": "Exact name of the Looker Studio chart type",
  "why_this_visual": "One sentence explaining why this visual suits this specific business question",
  "axis_config": {
    "x_axis": "Dimension field (date, category, or breakdown dimension)",
    "y_axis": "Metric field (what is being measured)",
    "legend": "Breakdown dimension for color — or 'Not required'"
  },
  "mistake_to_avoid": "The single most common mistake analysts make with this chart in Looker Studio and why it misleads the audience",
  "accessibility_tip": "One specific, actionable Looker Studio accessibility tip for this chart",
  "alternative_visual": "Name of one alternative Looker Studio chart type",
  "alternative_reason": "When to use the alternative instead"
}

STRICT RULES:
1. Only recommend visuals from this list: Bar Chart, Stacked Bar Chart, 100% Stacked Bar Chart, Column Chart, Stacked Column Chart, 100% Stacked Column Chart, Line Chart, Smooth Line Chart, Area Chart, Stacked Area Chart, Scatter Chart, Bubble Chart, Pie Chart, Donut Chart, Table, Pivot Table, Scorecard, Geo Chart, Filled Map, Treemap, Gauge, Bullet Chart, Heatmap, Combo Chart, Funnel Chart, Sankey Chart, Timeline Chart
2. Only recommend Pie or Donut if the question is genuinely about part-to-whole composition AND has fewer than 5 categories
3. Use Looker Studio terminology — reference Dimensions, Metrics, Breakdown Dimension, Date Range Dimension
4. Looker Studio strengths — use these chart types for specific scenarios: Scorecard for KPI summaries, Combo Chart for dual-measure overlays, Funnel Chart for conversion/pipeline flows, Pivot Table for cross-tab analysis, Bubble Chart when a third numeric dimension (size) adds meaning to a scatter, Stacked Area Chart for cumulative volume over time, 100% Stacked Bar/Column for normalized composition comparison, Sankey Chart for flow or allocation between categories, Timeline Chart for event or milestone tracking, Smooth Line Chart when the trend direction matters more than individual data points, Heatmap for cross-dimensional intensity patterns
5. If the input is not about data analysis or reporting, respond with exactly: {"error": "This does not look like a stakeholder question. Try something like: Show me how sales is doing."}`,

};

const DAX_BUILDER_PROMPT = `You are a Power BI DAX expert. Given a user's plain-English description of what they need to calculate, along with the table name and column names, generate a practical, ready-to-use DAX measure.

Respond with ONLY a valid JSON object — no markdown, no code fences, no explanation. Raw JSON only.

Required JSON structure:
{
  "measure_name": "DAX measure name in PascalCase — use the user-provided name if given, otherwise generate a clear descriptive name",
  "dax_code": "Complete DAX measure: measure_name =\\n    full_expression with proper line breaks and 4-space indentation",
  "explanation": "One or two sentences explaining what this measure calculates and when to use it",
  "assumptions": "State any assumptions about table relationships, date table presence, or column naming",
  "usage_tip": "One specific tip on how to use this measure effectively in a Power BI visual or slicer"
}

RULES:
1. Write realistic, syntactically correct DAX — not pseudocode or placeholder names
2. Use the exact table and column names provided by the user
3. Format dax_code with the measure name, equals sign, then the expression indented 4 spaces per level
4. For YTD: use TOTALYTD or CALCULATE with DATESYTD
5. For same period last year: use CALCULATE with SAMEPERIODLASTYEAR
6. For actual vs target: calculate absolute variance and % variance using DIVIDE to avoid division by zero
7. For running total: use CALCULATE with FILTER and ALL on the date dimension
8. For rolling average: use AVERAGEX with DATESINPERIOD
9. For % of total: use DIVIDE with CALCULATE and ALLSELECTED
10. For rank: use RANKX with ALL on the category column
11. Assume a Date table named 'Date' with a 'Date' column exists for time intelligence unless user specifies otherwise`;

// ===== DOM REFS =====
const $  = id => document.getElementById(id);
const el = {
  overlay:             $('settingsOverlay'),
  openSettingsBtn:     $('openSettingsBtn'),
  closeSettingsBtn:    $('closeSettingsBtn'),
  bannerSettingsBtn:   $('bannerOpenSettingsBtn'),
  apiKeyInput:         $('apiKeyInput'),
  toggleKeyBtn:        $('toggleKeyBtn'),
  modelSelect:         $('modelSelect'),
  saveSettingsBtn:     $('saveSettingsBtn'),
  clearKeyBtn:         $('clearKeyBtn'),
  settingsStatus:      $('settingsStatus'),
  noKeyBanner:         $('noKeyBanner'),
  tabs:                document.querySelectorAll('.tab'),
  panels:              document.querySelectorAll('.tab-panel'),
  submitPlainBtn:      $('submitPlainBtn'),
  submitGuidedBtn:     $('submitGuidedBtn'),
  submitDaxBtn:        $('submitDaxBtn'),
  plainInput:          $('plainInput'),
  guidedIntent:        $('guidedIntent'),
  guidedAudience:      $('guidedAudience'),
  guidedGrain:         $('guidedGrain'),
  daxCalcType:         $('daxCalcType'),
  daxTableName:        $('daxTableName'),
  daxColumns:          $('daxColumns'),
  daxMeasureName:      $('daxMeasureName'),
  historyList:         $('historyList'),
  bookmarksList:       $('bookmarksList'),
  outputPlaceholder:   $('outputPlaceholder'),
  outputContent:       $('outputContent'),
  themeToggleBtn:      $('themeToggleBtn'),
  platformBtns:        document.querySelectorAll('.platform-btn'),
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', init);

function init() {
  if (apiKey) el.apiKeyInput.value = apiKey;
  el.modelSelect.value = model;
  updateKeyBanner();
  renderHistory();
  applyTheme();
  applyPlatform();

  el.openSettingsBtn.addEventListener('click', openSettings);
  el.closeSettingsBtn.addEventListener('click', closeSettings);
  el.bannerSettingsBtn.addEventListener('click', openSettings);
  el.overlay.addEventListener('click', e => { if (e.target === el.overlay) closeSettings(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !el.overlay.hidden) closeSettings(); });

  el.toggleKeyBtn.addEventListener('click', () => {
    const isPw = el.apiKeyInput.type === 'password';
    el.apiKeyInput.type = isPw ? 'text' : 'password';
    el.toggleKeyBtn.textContent = isPw ? 'Hide' : 'Show';
  });

  el.saveSettingsBtn.addEventListener('click', saveSettings);
  el.clearKeyBtn.addEventListener('click', clearKey);
  el.themeToggleBtn.addEventListener('click', toggleTheme);

  el.platformBtns.forEach(btn => btn.addEventListener('click', () => switchPlatform(btn.dataset.platform)));
  el.tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.target)));

  el.submitPlainBtn.addEventListener('click', handlePlain);
  el.submitGuidedBtn.addEventListener('click', handleGuided);
  el.submitDaxBtn?.addEventListener('click', handleDAXBuilder);

  el.plainInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePlain(); } });

  // Ctrl+Enter / Cmd+Enter submits from any active panel
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      const active = document.querySelector('.tab-panel:not([hidden])');
      if (!active) return;
      if (active.id === 'panel-plain')   { e.preventDefault(); handlePlain(); }
      if (active.id === 'panel-guided')  { e.preventDefault(); handleGuided(); }
      if (active.id === 'panel-dax')     { e.preventDefault(); handleDAXBuilder(); }
    }
  });

  // Chip clicks — delegated so platform-refreshed chips also work
  document.addEventListener('click', e => {
    const chip = e.target.closest('.chip[data-fill]');
    if (!chip) return;
    const target = $(chip.dataset.fill);
    if (target) { target.value = chip.textContent.trim(); target.focus(); }
  });

  el.outputContent.addEventListener('click', e => {
    if (e.target.closest('.copy-btn'))     handleCopy();
    if (e.target.closest('.copy-dax-btn')) handleCopyDAX();
    if (e.target.closest('.bookmark-btn')) handleBookmark();
    if (e.target.closest('.compare-btn'))  handleCompare();
    if (e.target.closest('.share-btn'))    handleShare();
  });

  checkURLParams();

  el.bookmarksList?.addEventListener('click', e => {
    const replayBtn = e.target.closest('.bookmark-replay-btn');
    const deleteBtn = e.target.closest('.bookmark-delete-btn');
    if (replayBtn) replayBookmark(Number(replayBtn.dataset.id));
    if (deleteBtn) removeBookmark(Number(deleteBtn.dataset.id));
  });
}

// ===== THEME =====
function applyTheme() {
  document.body.classList.toggle('light', theme === 'light');
  if (el.themeToggleBtn) {
    el.themeToggleBtn.textContent = theme === 'light' ? '☾' : '☀';
    el.themeToggleBtn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  }
}

function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('dsn_theme', theme);
  applyTheme();
}

// ===== PLATFORM =====
function applyPlatform() {
  el.platformBtns.forEach(btn => {
    const active = btn.dataset.platform === platform;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  const daxTab   = document.querySelector('.tab[data-target="dax"]');
  const daxPanel = $('panel-dax');
  const isPowerBI = platform === 'powerbi';

  if (daxTab) daxTab.hidden = !isPowerBI;
  if (!isPowerBI && daxPanel && !daxPanel.hidden) switchTab('plain');

  // Refresh Ask chips for selected platform
  const chipRow = $('askChipRow');
  if (chipRow) {
    const chips = (PLATFORM_CHIPS[platform] || PLATFORM_CHIPS.powerbi)
      .map(q => `<button class="chip" data-fill="plainInput">${esc(q)}</button>`)
      .join('');
    chipRow.innerHTML = `<span class="chip-label">Try:</span>${chips}`;
  }
}

function switchPlatform(p) {
  platform = p;
  localStorage.setItem('dsn_platform', p);
  applyPlatform();
}

function getStoryPrompt() {
  return STORY_PROMPTS[platform] || STORY_PROMPTS.powerbi;
}

// ===== SETTINGS =====
function openSettings() {
  el.overlay.hidden = false;
  el.apiKeyInput.focus();
  el.settingsStatus.hidden = true;
}

function closeSettings() {
  el.overlay.hidden = true;
  el.openSettingsBtn.focus();
}

function saveSettings() {
  const key = el.apiKeyInput.value.trim();
  if (!key) { showSettingsMsg('Please enter an API key.', 'error'); return; }
  apiKey = key;
  model  = el.modelSelect.value;
  localStorage.setItem('dsn_api_key', key);
  localStorage.setItem('dsn_model', model);
  updateKeyBanner();
  showSettingsMsg('Settings saved.', 'success');
  setTimeout(closeSettings, 700);
}

function clearKey() {
  apiKey = '';
  localStorage.removeItem('dsn_api_key');
  el.apiKeyInput.value = '';
  updateKeyBanner();
  showSettingsMsg('API key cleared.', 'success');
}

function showSettingsMsg(text, type) {
  el.settingsStatus.textContent = text;
  el.settingsStatus.className = `status-msg ${type}`;
  el.settingsStatus.hidden = false;
  setTimeout(() => { el.settingsStatus.hidden = true; }, 3500);
}

function updateKeyBanner() {
  el.noKeyBanner.hidden = !!apiKey;
}

// ===== TABS =====
function switchTab(target) {
  el.tabs.forEach(tab => {
    const active = tab.dataset.target === target;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  el.panels.forEach(panel => {
    panel.hidden = panel.id !== `panel-${target}`;
  });
  if (target === 'history')   renderHistory();
  if (target === 'bookmarks') renderBookmarks();

}

// ===== GROQ API (STREAMING) =====
async function callGroq(systemPrompt, userMessage, onChunk) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      temperature: 0.3,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed  = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            accumulated += content;
            if (onChunk) onChunk(accumulated);
          }
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}

function parseGroqJSON(raw) {
  let text = raw.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');
  const match = text.match(/\{[\s\S]*\}/);
  if (match) text = match[0];
  return JSON.parse(text);
}

// ===== LOADING STATE =====
function setLoading(btn, on) {
  btn.disabled = on;
  const label   = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.btn-spinner');
  if (label)   label.hidden   = on;
  if (spinner) spinner.hidden = !on;
}

function requireKey() {
  if (!apiKey) { openSettings(); return false; }
  return true;
}

// ===== HANDLERS =====
async function handlePlain() {
  const q = el.plainInput.value.trim();
  if (!q) { el.plainInput.focus(); return; }
  if (!requireKey()) return;

  setLoading(el.submitPlainBtn, true);
  showStreamingLoading();

  try {
    const raw  = await callGroq(getStoryPrompt(), q, updateStreamPreview);
    const data = parseGroqJSON(raw);
    if (data.error) { showSoft(data.error); }
    else { saveHistory(q, data, 'story'); renderStoryCard(data, q); }
  } catch (err) {
    showError(err);
  } finally {
    setLoading(el.submitPlainBtn, false);
  }
}

async function handleGuided() {
  const intent   = el.guidedIntent.value;
  const audience = el.guidedAudience.value;
  const grain    = el.guidedGrain.value;

  if (!intent || !audience || !grain) {
    highlightEmptySelects([el.guidedIntent, el.guidedAudience, el.guidedGrain]);
    return;
  }
  if (!requireKey()) return;

  const q        = `Stakeholder intent: ${intent}. Audience: ${audience}. Data grain: ${grain}.`;
  const displayQ = `${intent} · ${audience} · ${grain}`;

  setLoading(el.submitGuidedBtn, true);
  showStreamingLoading();

  try {
    const raw  = await callGroq(getStoryPrompt(), q, updateStreamPreview);
    const data = parseGroqJSON(raw);
    if (data.error) { showSoft(data.error); }
    else { saveHistory(displayQ, data, 'story'); renderStoryCard(data, displayQ); }
  } catch (err) {
    showError(err);
  } finally {
    setLoading(el.submitGuidedBtn, false);
  }
}

async function handleDAXBuilder() {
  const calcType    = el.daxCalcType?.value.trim();
  const tableName   = el.daxTableName?.value.trim();
  const columns     = el.daxColumns?.value.trim();
  const measureName = el.daxMeasureName?.value.trim() || '';

  if (!calcType)  { highlightField(el.daxCalcType); return; }
  if (!tableName) { highlightField(el.daxTableName); return; }
  if (!columns)   { highlightField(el.daxColumns); return; }
  if (!requireKey()) return;

  const userMsg = [
    `What to calculate: ${calcType}`,
    `Table name: ${tableName}`,
    `Columns: ${columns}`,
    measureName ? `Desired measure name: ${measureName}` : '',
  ].filter(Boolean).join('\n');

  setLoading(el.submitDaxBtn, true);
  showStreamingLoading();

  try {
    const raw  = await callGroq(DAX_BUILDER_PROMPT, userMsg, updateStreamPreview);
    const data = parseGroqJSON(raw);
    _currentDaxCode  = data.dax_code || '';
    _currentCardId   = Date.now();
    renderDaxCard(data);
  } catch (err) {
    showError(err);
  } finally {
    setLoading(el.submitDaxBtn, false);
  }
}

async function handleCopyDAX() {
  if (!_currentDaxCode) return;
  try {
    await navigator.clipboard.writeText(_currentDaxCode);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = _currentDaxCode;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  const btn = el.outputContent.querySelector('.copy-dax-btn');
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }
}

async function handleCompare() {
  if (!_currentStory || !_currentQuery) return;
  if (!requireKey()) return;

  const compareSection = $('compareSection');
  if (!compareSection) return;

  const compareBtn = el.outputContent.querySelector('.compare-btn');
  if (compareBtn) compareBtn.disabled = true;

  compareSection.hidden = false;
  compareSection.innerHTML = `
    <div class="compare-wrap">
      <div class="compare-loading">
        <div class="loading-dots" style="transform:scale(0.75)"><span></span><span></span><span></span></div>
        <span>Comparing across all platforms…</span>
      </div>
    </div>`;

  const allPlatforms   = ['powerbi', 'tableau', 'looker'];
  const otherPlatforms = allPlatforms.filter(p => p !== platform);

  try {
    const [r1, r2] = await Promise.all(
      otherPlatforms.map(p =>
        callGroq(STORY_PROMPTS[p], _currentQuery, null).then(parseGroqJSON).catch(() => null)
      )
    );

    const results = {};
    results[platform]          = _currentStory;
    results[otherPlatforms[0]] = r1;
    results[otherPlatforms[1]] = r2;

    compareSection.innerHTML = `
      <div class="compare-wrap">
        <div class="compare-header">
          <div class="section-label">Platform Comparison — Same Question</div>
        </div>
        <div class="compare-grid">
          ${allPlatforms.map(p => {
            const d    = results[p];
            const meta = PLATFORM_META[p];
            const isCurrent = p === platform;
            if (!d || d.error) return `
              <div class="compare-col${isCurrent ? ' compare-col--current' : ''}">
                <div class="compare-platform-name">${isCurrent ? '★ ' : ''}${esc(meta.name)}</div>
                <div class="compare-visual-name" style="color:var(--text-3);font-size:13px">—</div>
              </div>`;
            return `
              <div class="compare-col${isCurrent ? ' compare-col--current' : ''}">
                <div class="compare-platform-name">${isCurrent ? '★ ' : ''}${esc(meta.name)}</div>
                <div class="compare-visual-name">${esc(d.recommended_visual)}</div>
                <div class="compare-story-type">${esc(d.story_type)}</div>
                <div class="compare-why">${esc(d.why_this_visual)}</div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  } catch (err) {
    console.error('[DSN Compare]', err);
    compareSection.innerHTML = `
      <div class="compare-wrap">
        <div class="rule-box mistake" style="margin:16px 26px 20px">Failed to compare platforms. Check your API key or try again.</div>
      </div>`;
  } finally {
    if (compareBtn) compareBtn.disabled = false;
  }
}

function highlightEmptySelects(selects) {
  selects.forEach(sel => {
    if (!sel.value) {
      sel.style.borderColor = 'var(--error)';
      setTimeout(() => { sel.style.borderColor = ''; }, 2500);
    }
  });
  const first = selects.find(s => !s.value);
  if (first) first.focus();
}

function highlightField(field) {
  if (!field) return;
  field.style.borderColor = 'var(--error)';
  field.focus();
  setTimeout(() => { field.style.borderColor = ''; }, 2500);
}

// ===== OUTPUT HELPERS =====
function showOutput(html) {
  el.outputPlaceholder.hidden = true;
  el.outputContent.hidden = false;
  el.outputContent.innerHTML = html;
}

function showStreamingLoading() {
  showOutput(`
    <div class="loading-card" role="status" aria-label="Generating…">
      <div class="loading-dots"><span></span><span></span><span></span></div>
      <p class="loading-text">Generating your story card…</p>
      <pre class="stream-preview" id="streamPreview" aria-hidden="true"></pre>
    </div>`);
}

function updateStreamPreview(text) {
  const preview = document.getElementById('streamPreview');
  if (!preview) return;
  preview.textContent = text.length > 160 ? '…' + text.slice(-160) : text;
}

function showError(err) {
  console.error('[DSN]', err);
  const status = err?.status;
  let msg = 'Something went wrong. Try again in a moment.';
  if (status === 401)               msg = 'Invalid API key. Go to Settings and paste your Groq key again.';
  else if (status === 429)          msg = 'Rate limit reached. Wait a few seconds and try again.';
  else if (status === 400)          msg = `Bad request — model may be unavailable. Open Settings and switch to a different model. (${esc(err.message)})`;
  else if (err instanceof TypeError) msg = 'Network error — check your internet connection and try again.';
  else if (err?.message)            msg = `Error: ${esc(err.message)}`;

  showOutput(`
    <div class="error-card" role="alert">
      <p><strong>⚠ Error</strong></p>
      <p>${msg}</p>
    </div>`);
}

function showSoft(message) {
  showOutput(`
    <div class="soft-card" role="status">
      <p>${esc(message)}</p>
    </div>`);
}

// ===== RENDER STORY CARD =====
function renderStoryCard(d, query) {
  _currentStory    = d;
  _currentResult   = d;
  _currentCardType = 'story';
  _currentQuery    = query;
  _clipboardText   = buildStoryText(d, query);

  const meta         = PLATFORM_META[platform] || PLATFORM_META.powerbi;
  const ax           = d.axis_config || {};
  const isBookmarked = bookmarks.some(b => b.id === _currentCardId);

  showOutput(`
    <div class="story-card">
      <div class="card-head">
        <div class="platform-badge">${esc(meta.name)}</div>
        <div class="story-badge">Story Type</div>
        <div class="story-type-val">${esc(d.story_type)}</div>
        <div class="card-query">For: &ldquo;${esc(query)}&rdquo;</div>
      </div>

      <div class="visual-hero">
        <div class="visual-hero-left">
          <div class="visual-name">${esc(d.recommended_visual)}</div>
          <div class="visual-why">${esc(d.why_this_visual)}</div>
        </div>
        <div class="chart-sketch-wrap" aria-hidden="true">${getChartSketch(d.recommended_visual)}</div>
      </div>

      <div class="card-body">
        <div class="card-section">
          <div class="section-label">Axis Configuration</div>
          <div class="axis-grid">
            <span class="axis-key">${esc(meta.axis.x)}</span>
            <span class="axis-val">${esc(ax.x_axis || '—')}</span>
            <span class="axis-key">${esc(meta.axis.y)}</span>
            <span class="axis-val">${esc(ax.y_axis || '—')}</span>
            <span class="axis-key">${esc(meta.axis.color)}</span>
            <span class="axis-val">${esc(ax.legend || 'Not required')}</span>
          </div>
        </div>

        <div class="card-divider"></div>

        <div class="card-section">
          <div class="section-label">Common Mistake to Avoid</div>
          <div class="rule-box mistake">${esc(d.mistake_to_avoid)}</div>
        </div>

        <div class="card-section">
          <div class="section-label">Accessibility Tip</div>
          <div class="rule-box tip">${esc(d.accessibility_tip)}</div>
        </div>

        <div class="card-section">
          <div class="section-label">Alternative Visual</div>
          <div class="alt-row">
            <span class="alt-name">${esc(d.alternative_visual)}</span>
            <span class="alt-desc">${esc(d.alternative_reason)}</span>
          </div>
        </div>
      </div>

      <div class="card-foot">
        <button class="btn-primary copy-btn" aria-label="Copy story card to clipboard">Copy to Clipboard</button>
        <button class="btn-secondary compare-btn" aria-label="Compare recommendations across all platforms">Compare Platforms</button>
        <button class="btn-secondary share-btn" aria-label="Copy shareable link to clipboard">Share Link</button>
        <button class="btn-ghost bookmark-btn${isBookmarked ? ' bookmarked' : ''}" aria-label="${isBookmarked ? 'Remove bookmark' : 'Bookmark this card'}">${isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}</button>
        <span class="copy-confirm" id="copyConfirm" hidden aria-live="polite">Copied!</span>
      </div>

      <div id="compareSection" hidden></div>
    </div>`);
}

// ===== RENDER DAX CARD =====
function renderDaxCard(data) {
  _currentStory    = null;
  _currentResult   = data;
  _currentCardType = 'dax';
  _currentQuery    = '';
  _clipboardText   = data.dax_code || '';

  showOutput(`
    <div class="dax-card">
      <div class="card-head">
        <div class="platform-badge">Power BI · DAX</div>
        <div class="story-badge">Generated Measure</div>
        <div class="story-type-val">${esc(data.measure_name)}</div>
      </div>

      <div class="dax-code-block dax-card-code">
        <div class="dax-code-head">
          <span class="dax-measure-name">${esc(data.measure_name)}</span>
        </div>
        <pre class="dax-code">${esc(data.dax_code)}</pre>
        <div class="dax-meta">
          <p class="dax-explanation">${esc(data.explanation)}</p>
          <p class="dax-assumptions">Assumptions: ${esc(data.assumptions)}</p>
          ${data.usage_tip ? `<p class="dax-explanation" style="margin-top:6px;font-style:italic">Tip: ${esc(data.usage_tip)}</p>` : ''}
        </div>
      </div>

      <div class="card-foot">
        <button class="btn-primary copy-dax-btn" aria-label="Copy DAX measure to clipboard">Copy DAX</button>
        <button class="btn-ghost bookmark-btn" aria-label="Bookmark this measure">☆ Bookmark</button>
        <span class="copy-confirm" id="copyConfirm" hidden aria-live="polite">Copied!</span>
      </div>
    </div>`);
}

// ===== CLIPBOARD =====
async function handleCopy() {
  try {
    await navigator.clipboard.writeText(_clipboardText);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = _clipboardText;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  const confirm = $('copyConfirm');
  if (confirm) {
    confirm.hidden = false;
    setTimeout(() => { confirm.hidden = true; }, 2200);
  }
}

function buildStoryText(d, query) {
  const ax   = d.axis_config || {};
  const meta = PLATFORM_META[platform] || PLATFORM_META.powerbi;
  return [
    `DATA STORY NAVIGATOR — Story Card [${meta.name}]`,
    `For: "${query}"`,
    '',
    `STORY TYPE: ${d.story_type}`,
    `RECOMMENDED VISUAL: ${d.recommended_visual}`,
    '',
    'WHY THIS VISUAL:',
    d.why_this_visual,
    '',
    'AXIS CONFIGURATION:',
    `  ${meta.axis.x} : ${ax.x_axis || '—'}`,
    `  ${meta.axis.y} : ${ax.y_axis || '—'}`,
    `  ${meta.axis.color} : ${ax.legend || 'Not required'}`,
    '',
    'COMMON MISTAKE TO AVOID:',
    d.mistake_to_avoid,
    '',
    'ACCESSIBILITY TIP:',
    d.accessibility_tip,
    '',
    `ALTERNATIVE VISUAL: ${d.alternative_visual}`,
    d.alternative_reason,
  ].join('\n');
}

// ===== SESSION HISTORY =====
function saveHistory(query, result, type) {
  const entry = { id: Date.now(), query, result, type, platform, time: new Date().toLocaleTimeString() };
  history.unshift(entry);
  _currentCardId = entry.id;
  if (history.length > 10) history.pop();
  sessionStorage.setItem('dsn_history', JSON.stringify(history));
}

function renderHistory() {
  if (!history.length) {
    el.historyList.innerHTML = '<p class="empty-state">No history yet. Generate a story recommendation to see it here.</p>';
    return;
  }
  el.historyList.innerHTML = history.map(entry => {
    const platName = entry.platform ? (PLATFORM_META[entry.platform]?.name || entry.platform) : '';
    const meta = entry.type === 'translator' ? 'Translation' : `Story Card${platName ? ' · ' + platName : ''}`;
    return `
      <button class="history-item" data-id="${entry.id}" aria-label="Replay: ${esc(entry.query)}">
        <div class="history-query">${esc(entry.query)}</div>
        <div class="history-meta">${esc(meta)} · ${entry.time}</div>
      </button>`;
  }).join('');

  el.historyList.querySelectorAll('.history-item').forEach(btn => {
    btn.addEventListener('click', () => replayHistory(Number(btn.dataset.id)));
  });
}

function replayHistory(id) {
  const entry = history.find(e => e.id === id);
  if (!entry) return;
  _currentCardId = entry.id;
  if (entry.platform) switchPlatform(entry.platform);
  switchTab('plain');
  renderStoryCard(entry.result, entry.query);
}

// ===== PERSISTENT BOOKMARKS =====
function handleBookmark() {
  if (!_currentCardId) return;
  const idx = bookmarks.findIndex(b => b.id === _currentCardId);
  const btn = el.outputContent.querySelector('.bookmark-btn');

  if (idx !== -1) {
    bookmarks.splice(idx, 1);
    localStorage.setItem('dsn_bookmarks', JSON.stringify(bookmarks));
    if (btn) {
      btn.textContent = '☆ Bookmark';
      btn.classList.remove('bookmarked');
      btn.setAttribute('aria-label', 'Bookmark this card');
    }
  } else {
    if (!_currentResult) return;
    const entry = {
      id: _currentCardId,
      query: _currentQuery,
      result: _currentResult,
      type: _currentCardType,
      platform,
      bookmarkedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    };
    bookmarks.unshift(entry);
    if (bookmarks.length > 20) bookmarks.pop();
    localStorage.setItem('dsn_bookmarks', JSON.stringify(bookmarks));
    if (btn) {
      btn.textContent = '★ Bookmarked';
      btn.classList.add('bookmarked');
      btn.setAttribute('aria-label', 'Remove bookmark');
    }
  }

  const bookmarksPanel = $('panel-bookmarks');
  if (bookmarksPanel && !bookmarksPanel.hidden) renderBookmarks();
}

function renderBookmarks() {
  if (!el.bookmarksList) return;
  if (!bookmarks.length) {
    el.bookmarksList.innerHTML = '<p class="empty-state">No bookmarks yet. Click ☆ Bookmark on any story card to save it here.</p>';
    return;
  }
  el.bookmarksList.innerHTML = bookmarks.map(entry => {
    const platName  = entry.platform ? (PLATFORM_META[entry.platform]?.name || entry.platform) : '';
    const typeLabel = entry.type === 'translator' ? 'Translation' : `Story Card${platName ? ' · ' + platName : ''}`;
    return `
      <div class="bookmark-item">
        <button class="bookmark-replay-btn" data-id="${entry.id}" aria-label="Replay: ${esc(entry.query)}">
          <div class="history-query">${esc(entry.query)}</div>
          <div class="history-meta">${esc(typeLabel)} · ${esc(entry.bookmarkedAt)}</div>
        </button>
        <button class="bookmark-delete-btn icon-btn" data-id="${entry.id}" aria-label="Remove bookmark">✕</button>
      </div>`;
  }).join('');
}

function replayBookmark(id) {
  const entry = bookmarks.find(b => b.id === id);
  if (!entry) return;
  _currentCardId = entry.id;
  if (entry.platform) switchPlatform(entry.platform);
  switchTab('plain');
  if (entry.type === 'dax') {
    _currentDaxCode  = entry.result?.dax_code || '';
    _currentCardType = 'dax';
    _currentResult   = entry.result;
    renderDaxCard(entry.result);
  } else {
    renderStoryCard(entry.result, entry.query);
  }
}

function removeBookmark(id) {
  const idx = bookmarks.findIndex(b => b.id === id);
  if (idx === -1) return;
  bookmarks.splice(idx, 1);
  localStorage.setItem('dsn_bookmarks', JSON.stringify(bookmarks));
  renderBookmarks();
  if (_currentCardId === id) {
    const btn = el.outputContent.querySelector('.bookmark-btn');
    if (btn) {
      btn.textContent = '☆ Bookmark';
      btn.classList.remove('bookmarked');
      btn.setAttribute('aria-label', 'Bookmark this card');
    }
  }
}

// ===== CHART SKETCHES =====
function getChartSketch(visualName) {
  const v = (visualName || '').toLowerCase();
  if (v.includes('waterfall'))                                                    return sketchWaterfall();
  if (v.includes('sankey'))                                                       return sketchSankey();
  if (v.includes('slope'))                                                        return sketchSlope();
  if (v.includes('bump'))                                                         return sketchBump();
  if (v.includes('lollipop'))                                                     return sketchLollipop();
  if (v.includes('step line'))                                                    return sketchStepLine();
  if (v.includes('packed bubble'))                                                return sketchPackedBubbles();
  if (v.includes('combo') || v.includes('dual axis'))                            return sketchCombo();
  if (v.includes('stacked area'))                                                 return sketchStackedArea();
  if (v.includes('horizontal bar'))                                               return sketchHBar();
  if (v.includes('100%') || v.includes('100 %') || v.includes('normalized'))     return sketchStackedBar();
  if (v.includes('stacked bar') || v.includes('stacked column'))                 return sketchStackedBar();
  if (v.includes('line') || v.includes('area') || v.includes('smooth'))         return sketchLine();
  if (v.includes('bar') || v.includes('column') || v.includes('histogram'))     return sketchBar();
  if (v.includes('donut') || v.includes('pie'))                                  return sketchDonut();
  if (v.includes('bubble') || v.includes('scatter'))                             return sketchScatter();
  if (v.includes('card') || v.includes('kpi') || v.includes('scorecard') || v.includes('gauge') || v.includes('bullet')) return sketchKPI();
  if (v.includes('density map') || v.includes('map') || v.includes('geo'))      return sketchMap();
  if (v.includes('treemap'))                                                      return sketchTreemap();
  if (v.includes('heatmap') || v.includes('highlight table'))                    return sketchHeatmap();
  if (v.includes('table') || v.includes('matrix') || v.includes('pivot') || v.includes('text table')) return sketchTable();
  if (v.includes('funnel'))                                                       return sketchFunnel();
  if (v.includes('timeline'))                                                     return sketchGantt();
  if (v.includes('key influencer') || v.includes('decomposition') || v.includes('tree')) return sketchTree();
  if (v.includes('ribbon'))                                                       return sketchBump();
  if (v.includes('box'))                                                          return sketchBox();
  if (v.includes('gantt'))                                                        return sketchGantt();
  if (v.includes('small multiple'))                                               return sketchSmallMultiples();
  return sketchBar();
}

function sketchLine() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="5" y1="55" x2="95" y2="55" stroke="var(--border)" stroke-width="1"/>
    <line x1="5" y1="5" x2="5" y2="55" stroke="var(--border)" stroke-width="1"/>
    <polyline points="8,48 22,33 38,38 54,18 68,26 84,10 96,16" fill="none" stroke="var(--accent-h)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="54" cy="18" r="3" fill="var(--accent-h)"/>
  </svg>`;
}

function sketchBar() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="5" y1="55" x2="95" y2="55" stroke="var(--border)" stroke-width="1"/>
    <rect x="10" y="22" width="15" height="33" rx="2" fill="var(--accent-h)" opacity="0.85"/>
    <rect x="30" y="12" width="15" height="43" rx="2" fill="var(--accent-h)" opacity="0.7"/>
    <rect x="50" y="32" width="15" height="23" rx="2" fill="var(--accent-h)" opacity="0.8"/>
    <rect x="70" y="18" width="15" height="37" rx="2" fill="var(--accent-2)" opacity="0.75"/>
  </svg>`;
}

function sketchHBar() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="14" y1="5" x2="14" y2="55" stroke="var(--border)" stroke-width="1"/>
    <rect x="14" y="8"  width="52" height="11" rx="2" fill="var(--accent-h)" opacity="0.85"/>
    <rect x="14" y="25" width="72" height="11" rx="2" fill="var(--accent-h)" opacity="0.7"/>
    <rect x="14" y="42" width="38" height="11" rx="2" fill="var(--accent-2)" opacity="0.75"/>
  </svg>`;
}

function sketchDonut() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <circle cx="50" cy="30" r="22" fill="none" stroke="var(--accent-h)"  stroke-width="11" stroke-dasharray="69 70" stroke-dashoffset="17" opacity="0.9"/>
    <circle cx="50" cy="30" r="22" fill="none" stroke="var(--accent-2)"  stroke-width="11" stroke-dasharray="35 104" stroke-dashoffset="-52" opacity="0.7"/>
    <circle cx="50" cy="30" r="22" fill="none" stroke="var(--text-3)"    stroke-width="11" stroke-dasharray="34 105" stroke-dashoffset="-87" opacity="0.4"/>
    <circle cx="50" cy="30" r="12" fill="var(--surface)"/>
  </svg>`;
}

function sketchScatter() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="5" y1="55" x2="95" y2="55" stroke="var(--border)" stroke-width="1"/>
    <line x1="5" y1="5"  x2="5"  y2="55" stroke="var(--border)" stroke-width="1"/>
    <circle cx="18" cy="46" r="3.5" fill="var(--accent-h)" opacity="0.8"/>
    <circle cx="33" cy="30" r="3.5" fill="var(--accent-h)" opacity="0.7"/>
    <circle cx="44" cy="42" r="4"   fill="var(--accent-2)" opacity="0.8"/>
    <circle cx="56" cy="18" r="3.5" fill="var(--accent-h)" opacity="0.9"/>
    <circle cx="67" cy="34" r="4"   fill="var(--accent-2)" opacity="0.7"/>
    <circle cx="78" cy="14" r="3"   fill="var(--accent-h)" opacity="0.8"/>
    <circle cx="84" cy="44" r="3.5" fill="var(--accent-2)" opacity="0.6"/>
  </svg>`;
}

function sketchKPI() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <rect x="8" y="8" width="84" height="44" rx="6" fill="var(--accent-h)" opacity="0.1" stroke="var(--accent-h)" stroke-width="1" stroke-opacity="0.3"/>
    <text x="50" y="33" text-anchor="middle" font-size="20" font-weight="800" fill="var(--accent-h)" font-family="system-ui,sans-serif">84.2K</text>
    <text x="50" y="46" text-anchor="middle" font-size="9" fill="var(--text-3)" font-family="system-ui,sans-serif">▲ 12.4% vs last period</text>
  </svg>`;
}

function sketchMap() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <ellipse cx="50" cy="30" rx="42" ry="24" fill="none" stroke="var(--border)" stroke-width="1.5"/>
    <ellipse cx="50" cy="30" rx="20" ry="24" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 2"/>
    <line x1="8" y1="30" x2="92" y2="30" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 2"/>
    <circle cx="38" cy="23" r="6"   fill="var(--accent-h)" opacity="0.65"/>
    <circle cx="63" cy="36" r="9"   fill="var(--accent-2)" opacity="0.55"/>
    <circle cx="28" cy="38" r="4.5" fill="var(--accent-h)" opacity="0.5"/>
  </svg>`;
}

function sketchTreemap() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <rect x="4"  y="4"  width="54" height="52" rx="2" fill="var(--accent-h)" opacity="0.75"/>
    <rect x="62" y="4"  width="34" height="29" rx="2" fill="var(--accent-2)" opacity="0.65"/>
    <rect x="62" y="37" width="20" height="19" rx="2" fill="var(--accent-h)" opacity="0.45"/>
    <rect x="86" y="37" width="10" height="19" rx="2" fill="var(--accent-2)" opacity="0.35"/>
  </svg>`;
}

function sketchHeatmap() {
  const cols = [8, 26, 44, 62, 80];
  const rows = [6, 23, 40];
  const ops  = [0.2, 0.5, 0.9, 0.4, 0.3, 0.7, 0.6, 0.85, 0.2, 0.95, 0.5, 0.35, 0.25, 0.7, 0.55];
  let cells = '';
  rows.forEach((y, ri) => cols.forEach((x, ci) => {
    cells += `<rect x="${x}" y="${y}" width="14" height="13" rx="1" fill="var(--accent-h)" opacity="${ops[ri*5+ci]}"/>`;
  }));
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">${cells}</svg>`;
}

function sketchTable() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <rect x="4" y="4" width="92" height="52" rx="3" fill="none" stroke="var(--border)" stroke-width="1"/>
    <rect x="4" y="4" width="92" height="13" rx="3" fill="var(--accent-h)" opacity="0.25"/>
    <line x1="4"  y1="17" x2="96" y2="17" stroke="var(--border)" stroke-width="1"/>
    <line x1="4"  y1="29" x2="96" y2="29" stroke="var(--border)" stroke-width="1"/>
    <line x1="4"  y1="41" x2="96" y2="41" stroke="var(--border)" stroke-width="1"/>
    <line x1="36" y1="4"  x2="36" y2="56" stroke="var(--border)" stroke-width="1"/>
    <line x1="68" y1="4"  x2="68" y2="56" stroke="var(--border)" stroke-width="1"/>
  </svg>`;
}

function sketchFunnel() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <polygon points="8,6 92,6 74,23 26,23"  fill="var(--accent-h)" opacity="0.85"/>
    <polygon points="26,26 74,26 62,42 38,42" fill="var(--accent-2)" opacity="0.75"/>
    <polygon points="38,45 62,45 56,58 44,58" fill="var(--accent-h)" opacity="0.55"/>
  </svg>`;
}

function sketchTree() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <circle cx="50" cy="9" r="5" fill="var(--accent-h)" opacity="0.9"/>
    <line x1="50" y1="14" x2="24" y2="30" stroke="var(--border)" stroke-width="1.5"/>
    <line x1="50" y1="14" x2="76" y2="30" stroke="var(--border)" stroke-width="1.5"/>
    <circle cx="24" cy="33" r="5" fill="var(--accent-2)" opacity="0.8"/>
    <circle cx="76" cy="33" r="5" fill="var(--accent-2)" opacity="0.8"/>
    <line x1="24" y1="38" x2="13" y2="52" stroke="var(--border)" stroke-width="1.5"/>
    <line x1="24" y1="38" x2="35" y2="52" stroke="var(--border)" stroke-width="1.5"/>
    <line x1="76" y1="38" x2="65" y2="52" stroke="var(--border)" stroke-width="1.5"/>
    <line x1="76" y1="38" x2="87" y2="52" stroke="var(--border)" stroke-width="1.5"/>
    <circle cx="13" cy="55" r="4" fill="var(--accent-h)" opacity="0.65"/>
    <circle cx="35" cy="55" r="4" fill="var(--accent-h)" opacity="0.65"/>
    <circle cx="65" cy="55" r="4" fill="var(--accent-h)" opacity="0.65"/>
    <circle cx="87" cy="55" r="4" fill="var(--accent-h)" opacity="0.65"/>
  </svg>`;
}

function sketchWaterfall() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="5" y1="55" x2="95" y2="55" stroke="var(--border)" stroke-width="1"/>
    <rect x="8"  y="26" width="13" height="29" rx="1" fill="var(--accent-h)" opacity="0.8"/>
    <rect x="25" y="16" width="13" height="10" rx="1" fill="#22c55e" opacity="0.85"/>
    <rect x="42" y="28" width="13" height="10" rx="1" fill="#ef4444" opacity="0.75"/>
    <rect x="59" y="20" width="13" height="14" rx="1" fill="#22c55e" opacity="0.8"/>
    <rect x="76" y="18" width="13" height="37" rx="1" fill="var(--accent-2)" opacity="0.7"/>
    <line x1="21" y1="26" x2="25" y2="26" stroke="var(--text-3)" stroke-width="1" stroke-dasharray="2 1"/>
    <line x1="38" y1="16" x2="42" y2="16" stroke="var(--text-3)" stroke-width="1" stroke-dasharray="2 1"/>
    <line x1="55" y1="28" x2="59" y2="28" stroke="var(--text-3)" stroke-width="1" stroke-dasharray="2 1"/>
    <line x1="72" y1="20" x2="76" y2="20" stroke="var(--text-3)" stroke-width="1" stroke-dasharray="2 1"/>
  </svg>`;
}

function sketchCombo() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="5" y1="55" x2="95" y2="55" stroke="var(--border)" stroke-width="1"/>
    <rect x="10" y="30" width="13" height="25" rx="1" fill="var(--accent-h)" opacity="0.55"/>
    <rect x="29" y="20" width="13" height="35" rx="1" fill="var(--accent-h)" opacity="0.55"/>
    <rect x="48" y="34" width="13" height="21" rx="1" fill="var(--accent-h)" opacity="0.55"/>
    <rect x="67" y="24" width="13" height="31" rx="1" fill="var(--accent-h)" opacity="0.55"/>
    <polyline points="16,22 35,11 54,26 73,9" fill="none" stroke="var(--accent-2)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="16" cy="22" r="3" fill="var(--accent-2)"/>
    <circle cx="35" cy="11" r="3" fill="var(--accent-2)"/>
    <circle cx="54" cy="26" r="3" fill="var(--accent-2)"/>
    <circle cx="73" cy="9"  r="3" fill="var(--accent-2)"/>
  </svg>`;
}

function sketchBox() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="28" y1="10" x2="28" y2="50" stroke="var(--text-3)" stroke-width="1.5" stroke-dasharray="3 2"/>
    <rect x="16" y="20" width="24" height="20" rx="1" fill="none" stroke="var(--accent-h)" stroke-width="2"/>
    <line x1="16" y1="30" x2="40" y2="30" stroke="var(--accent-h)" stroke-width="2.5"/>
    <line x1="72" y1="8"  x2="72" y2="52" stroke="var(--text-3)" stroke-width="1.5" stroke-dasharray="3 2"/>
    <rect x="58" y="18" width="28" height="26" rx="1" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <line x1="58" y1="29" x2="86" y2="29" stroke="var(--accent-2)" stroke-width="2.5"/>
  </svg>`;
}

function sketchGantt() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="55" stroke="var(--border)" stroke-width="1"/>
    <rect x="12" y="8"  width="48" height="11" rx="2" fill="var(--accent-h)" opacity="0.85"/>
    <rect x="30" y="25" width="58" height="11" rx="2" fill="var(--accent-2)" opacity="0.75"/>
    <rect x="12" y="42" width="36" height="11" rx="2" fill="var(--accent-h)" opacity="0.6"/>
  </svg>`;
}

function sketchStackedBar() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="5" y1="55" x2="95" y2="55" stroke="var(--border)" stroke-width="1"/>
    <rect x="10" y="22" width="15" height="13" rx="1" fill="var(--accent-h)"  opacity="0.9"/>
    <rect x="10" y="35" width="15" height="10" rx="1" fill="var(--accent-2)"  opacity="0.75"/>
    <rect x="10" y="45" width="15" height="10" rx="1" fill="var(--text-3)"    opacity="0.45"/>
    <rect x="30" y="12" width="15" height="17" rx="1" fill="var(--accent-h)"  opacity="0.9"/>
    <rect x="30" y="29" width="15" height="14" rx="1" fill="var(--accent-2)"  opacity="0.75"/>
    <rect x="30" y="43" width="15" height="12" rx="1" fill="var(--text-3)"    opacity="0.45"/>
    <rect x="50" y="28" width="15" height="10" rx="1" fill="var(--accent-h)"  opacity="0.9"/>
    <rect x="50" y="38" width="15" height="9"  rx="1" fill="var(--accent-2)"  opacity="0.75"/>
    <rect x="50" y="47" width="15" height="8"  rx="1" fill="var(--text-3)"    opacity="0.45"/>
    <rect x="70" y="18" width="15" height="15" rx="1" fill="var(--accent-h)"  opacity="0.9"/>
    <rect x="70" y="33" width="15" height="12" rx="1" fill="var(--accent-2)"  opacity="0.75"/>
    <rect x="70" y="45" width="15" height="10" rx="1" fill="var(--text-3)"    opacity="0.45"/>
  </svg>`;
}

function sketchStackedArea() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="5" y1="55" x2="95" y2="55" stroke="var(--border)" stroke-width="1"/>
    <polygon points="5,55 5,42 25,36 50,30 75,22 95,16 95,55" fill="var(--accent-h)" opacity="0.3"/>
    <polygon points="5,55 5,50 25,45 50,42 75,36 95,32 95,55" fill="var(--accent-2)" opacity="0.35"/>
    <polyline points="5,42 25,36 50,30 75,22 95,16" fill="none" stroke="var(--accent-h)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="5,50 25,45 50,42 75,36 95,32" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function sketchLollipop() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="5" y1="55" x2="95" y2="55" stroke="var(--border)" stroke-width="1"/>
    <line x1="17" y1="54" x2="17" y2="22" stroke="var(--accent-h)" stroke-width="1.5"/>
    <circle cx="17" cy="20" r="4" fill="var(--accent-h)" opacity="0.9"/>
    <line x1="37" y1="54" x2="37" y2="12" stroke="var(--accent-h)" stroke-width="1.5"/>
    <circle cx="37" cy="10" r="4" fill="var(--accent-h)" opacity="0.9"/>
    <line x1="57" y1="54" x2="57" y2="30" stroke="var(--accent-h)" stroke-width="1.5"/>
    <circle cx="57" cy="28" r="4" fill="var(--accent-2)" opacity="0.9"/>
    <line x1="77" y1="54" x2="77" y2="18" stroke="var(--accent-h)" stroke-width="1.5"/>
    <circle cx="77" cy="16" r="4" fill="var(--accent-h)" opacity="0.9"/>
  </svg>`;
}

function sketchSlope() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="20" y1="5"  x2="20" y2="55" stroke="var(--border)" stroke-width="1"/>
    <line x1="80" y1="5"  x2="80" y2="55" stroke="var(--border)" stroke-width="1"/>
    <line x1="20" y1="15" x2="80" y2="28" stroke="var(--accent-h)"  stroke-width="2.5" stroke-linecap="round"/>
    <line x1="20" y1="28" x2="80" y2="14" stroke="var(--accent-2)"  stroke-width="2.5" stroke-linecap="round"/>
    <line x1="20" y1="40" x2="80" y2="44" stroke="var(--text-3)"    stroke-width="2"   stroke-linecap="round" opacity="0.6"/>
    <circle cx="20" cy="15" r="3.5" fill="var(--accent-h)"/>
    <circle cx="80" cy="28" r="3.5" fill="var(--accent-h)"/>
    <circle cx="20" cy="28" r="3.5" fill="var(--accent-2)"/>
    <circle cx="80" cy="14" r="3.5" fill="var(--accent-2)"/>
  </svg>`;
}

function sketchBump() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="5" y1="55" x2="95" y2="55" stroke="var(--border)" stroke-width="1"/>
    <polyline points="5,12 30,22 55,16 80,28 95,18" fill="none" stroke="var(--accent-h)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="5,22 30,12 55,30 80,16 95,28" fill="none" stroke="var(--accent-2)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="5,35 30,40 55,22 80,40 95,36" fill="none" stroke="var(--text-3)"   stroke-width="2"   stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
    <text x="3"  y="14" font-size="7" fill="var(--accent-h)"  font-family="system-ui" font-weight="700">1</text>
    <text x="3"  y="24" font-size="7" fill="var(--accent-2)"  font-family="system-ui" font-weight="700">2</text>
    <text x="3"  y="37" font-size="7" fill="var(--text-3)"    font-family="system-ui" font-weight="700">3</text>
  </svg>`;
}

function sketchStepLine() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <line x1="5" y1="55" x2="95" y2="55" stroke="var(--border)" stroke-width="1"/>
    <line x1="5" y1="5"  x2="5"  y2="55" stroke="var(--border)" stroke-width="1"/>
    <polyline points="8,42 28,42 28,28 48,28 48,36 68,36 68,18 88,18 88,26" fill="none" stroke="var(--accent-h)" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"/>
  </svg>`;
}

function sketchPackedBubbles() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <circle cx="32" cy="30" r="20" fill="var(--accent-h)"  opacity="0.7"/>
    <circle cx="68" cy="26" r="15" fill="var(--accent-2)"  opacity="0.65"/>
    <circle cx="72" cy="48" r="10" fill="var(--accent-h)"  opacity="0.5"/>
    <circle cx="18" cy="48" r="8"  fill="var(--accent-2)"  opacity="0.55"/>
    <circle cx="88" cy="14" r="6"  fill="var(--text-3)"    opacity="0.4"/>
  </svg>`;
}

function sketchSankey() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <rect x="4"  y="8"  width="8" height="44" rx="2" fill="var(--accent-h)"  opacity="0.85"/>
    <rect x="88" y="8"  width="8" height="20" rx="2" fill="var(--accent-2)"  opacity="0.8"/>
    <rect x="88" y="32" width="8" height="14" rx="2" fill="var(--accent-h)"  opacity="0.65"/>
    <rect x="88" y="50" width="8" height="8"  rx="2" fill="var(--text-3)"    opacity="0.45"/>
    <path d="M12,10 C50,10 50,12 88,12" fill="none" stroke="var(--accent-2)"  stroke-width="8"  opacity="0.35"/>
    <path d="M12,32 C50,32 50,38 88,38" fill="none" stroke="var(--accent-h)"  stroke-width="6"  opacity="0.3"/>
    <path d="M12,48 C50,48 50,53 88,53" fill="none" stroke="var(--text-3)"    stroke-width="4"  opacity="0.25"/>
  </svg>`;
}

function sketchSmallMultiples() {
  return `<svg class="chart-sketch" viewBox="0 0 100 60" aria-hidden="true">
    <rect x="4"  y="4"  width="43" height="24" rx="2" fill="none" stroke="var(--border)" stroke-width="1"/>
    <rect x="53" y="4"  width="43" height="24" rx="2" fill="none" stroke="var(--border)" stroke-width="1"/>
    <rect x="4"  y="33" width="43" height="24" rx="2" fill="none" stroke="var(--border)" stroke-width="1"/>
    <rect x="53" y="33" width="43" height="24" rx="2" fill="none" stroke="var(--border)" stroke-width="1"/>
    <polyline points="8,24  18,18 28,20 44,10" fill="none" stroke="var(--accent-h)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="57,22 67,14 77,18 93,10" fill="none" stroke="var(--accent-2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="8,53  18,46 28,50 44,40" fill="none" stroke="var(--accent-h)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="57,50 67,44 77,48 93,38" fill="none" stroke="var(--accent-2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ===== SHAREABLE URL =====
function handleShare() {
  if (!_currentQuery) return;
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('q', _currentQuery);
  url.searchParams.set('p', platform);
  const shareUrl = url.toString();

  navigator.clipboard.writeText(shareUrl).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = shareUrl;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });

  history.pushState(null, '', shareUrl);

  const btn = el.outputContent.querySelector('.share-btn');
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = 'Link copied!';
    setTimeout(() => { btn.textContent = orig; }, 2200);
  }
}

function checkURLParams() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  const p = params.get('p');
  if (p && STORY_PROMPTS[p]) { platform = p; applyPlatform(); }
  if (q && apiKey) {
    el.plainInput.value = q;
    switchTab('plain');
    handlePlain();
  } else if (q) {
    el.plainInput.value = q;
    switchTab('plain');
  }
}

// ===== UTILS =====
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
