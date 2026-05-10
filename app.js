'use strict';

// ===== STATE =====
let apiKey = localStorage.getItem('dsn_api_key') || '';
const LEGACY_MODELS = new Set(['llama3-70b-8192', 'llama3-8b-8192']);
const _storedModel = localStorage.getItem('dsn_model') || '';
let model = (LEGACY_MODELS.has(_storedModel) || !_storedModel) ? 'llama-3.3-70b-versatile' : _storedModel;
let history = JSON.parse(sessionStorage.getItem('dsn_history') || '[]');

// Text stored for clipboard copy after render
let _clipboardText = '';

// ===== SYSTEM PROMPTS =====
const STORY_SYSTEM_PROMPT = `You are a Power BI data storytelling expert. A data analyst has received a stakeholder business question and needs to know the right data story type and Power BI visual.

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

STRICT RULES — follow exactly:
1. Only recommend visuals from this approved list: Bar Chart, Column Chart, Line Chart, Area Chart, Clustered Bar Chart, Stacked Bar Chart, Clustered Column Chart, Stacked Column Chart, Donut Chart, Pie Chart, Card, Multi-row Card, KPI Visual, Matrix, Table, Scatter Chart, Map, Filled Map, Waterfall Chart, Ribbon Chart, Decomposition Tree, Gauge
2. Only recommend Pie Chart or Donut Chart if the question is genuinely about part-to-whole composition AND has fewer than 5 categories — otherwise choose a better option
3. Never recommend a visual that does not exist natively in Power BI Desktop
4. If the input is not about data analysis, business performance, or reporting, respond with exactly: {"error": "This does not look like a stakeholder question. Try something like: Show me how sales is doing."}`;

const TRANSLATOR_SYSTEM_PROMPT = `You are a senior Power BI data analyst who translates vague stakeholder requests into precise, actionable data requirements.

Respond with ONLY a valid JSON object — no markdown, no code fences, no explanation. Raw JSON only.

Required JSON structure:
{
  "likely_means": "What the stakeholder likely wants to see, stated in specific data terms with named metrics",
  "data_needed": "Specific data columns, measures, or tables needed (e.g. Date, Revenue Actual, Revenue Target, Region)",
  "ask_back": "The single most important clarifying question to ask the stakeholder before building the report"
}

RULES:
1. Be specific — name actual column types and metric names, not vague descriptions
2. Frame everything from the perspective of what a Power BI analyst needs to build the report
3. If the input is clearly not a business or data request, respond with exactly: {"error": "This does not look like a stakeholder request. Try pasting something like: Can you show me how the business is doing?"}`;

// ===== DOM REFS =====
const $  = id => document.getElementById(id);
const el = {
  overlay:          $('settingsOverlay'),
  openSettingsBtn:  $('openSettingsBtn'),
  closeSettingsBtn: $('closeSettingsBtn'),
  bannerSettingsBtn:$('bannerOpenSettingsBtn'),
  apiKeyInput:      $('apiKeyInput'),
  toggleKeyBtn:     $('toggleKeyBtn'),
  modelSelect:      $('modelSelect'),
  saveSettingsBtn:  $('saveSettingsBtn'),
  clearKeyBtn:      $('clearKeyBtn'),
  settingsStatus:   $('settingsStatus'),
  noKeyBanner:      $('noKeyBanner'),
  tabs:             document.querySelectorAll('.tab'),
  panels:           document.querySelectorAll('.tab-panel'),
  submitPlainBtn:   $('submitPlainBtn'),
  submitGuidedBtn:  $('submitGuidedBtn'),
  submitTranslatorBtn: $('submitTranslatorBtn'),
  plainInput:       $('plainInput'),
  guidedIntent:     $('guidedIntent'),
  guidedAudience:   $('guidedAudience'),
  guidedGrain:      $('guidedGrain'),
  translatorInput:  $('translatorInput'),
  historyList:      $('historyList'),
  outputPlaceholder:$('outputPlaceholder'),
  outputContent:    $('outputContent'),
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', init);

function init() {
  if (apiKey) el.apiKeyInput.value = apiKey;
  el.modelSelect.value = model;
  updateKeyBanner();
  renderHistory();

  // Settings
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

  // Tabs
  el.tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.target)));

  // Submits
  el.submitPlainBtn.addEventListener('click', handlePlain);
  el.submitGuidedBtn.addEventListener('click', handleGuided);
  el.submitTranslatorBtn.addEventListener('click', handleTranslator);

  // Enter key in textareas (Shift+Enter = newline)
  el.plainInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePlain(); } });
  el.translatorInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTranslator(); } });

  // Example chips
  document.querySelectorAll('.chip[data-fill]').forEach(chip => {
    chip.addEventListener('click', () => {
      const target = $(chip.dataset.fill);
      if (target) { target.value = chip.textContent.trim(); target.focus(); }
    });
  });

  // Copy button via event delegation
  el.outputContent.addEventListener('click', e => {
    if (e.target.closest('.copy-btn')) handleCopy();
  });
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
  if (target === 'history') renderHistory();
}

// ===== GROQ API =====
async function callGroq(systemPrompt, userMessage) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system',  content: systemPrompt },
        { role: 'user',    content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseGroqJSON(raw) {
  let text = raw.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/,     '');
  // Extract the first JSON object even if there is surrounding prose
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

// ===== CHECK KEY =====
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
  showLoading();

  try {
    const raw  = await callGroq(STORY_SYSTEM_PROMPT, q);
    const data = parseGroqJSON(raw);

    if (data.error) {
      showSoft(data.error);
    } else {
      saveHistory(q, data, 'story');
      renderStoryCard(data, q);
    }
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

  const q = `Stakeholder intent: ${intent}. Audience: ${audience}. Data grain: ${grain}.`;
  const displayQ = `${intent} · ${audience} · ${grain}`;

  setLoading(el.submitGuidedBtn, true);
  showLoading();

  try {
    const raw  = await callGroq(STORY_SYSTEM_PROMPT, q);
    const data = parseGroqJSON(raw);

    if (data.error) {
      showSoft(data.error);
    } else {
      saveHistory(displayQ, data, 'story');
      renderStoryCard(data, displayQ);
    }
  } catch (err) {
    showError(err);
  } finally {
    setLoading(el.submitGuidedBtn, false);
  }
}

async function handleTranslator() {
  const req = el.translatorInput.value.trim();
  if (!req) { el.translatorInput.focus(); return; }
  if (!requireKey()) return;

  setLoading(el.submitTranslatorBtn, true);
  showLoading();

  try {
    const raw  = await callGroq(TRANSLATOR_SYSTEM_PROMPT, req);
    const data = parseGroqJSON(raw);

    if (data.error) {
      showSoft(data.error);
    } else {
      saveHistory(req, data, 'translator');
      renderTranslatorCard(data, req);
    }
  } catch (err) {
    showError(err);
  } finally {
    setLoading(el.submitTranslatorBtn, false);
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

// ===== OUTPUT HELPERS =====
function showOutput(html) {
  el.outputPlaceholder.hidden = true;
  el.outputContent.hidden = false;
  el.outputContent.innerHTML = html;
}

function showLoading() {
  showOutput(`
    <div class="loading-card" role="status" aria-label="Generating story card">
      <div class="loading-dots"><span></span><span></span><span></span></div>
      <p class="loading-text">Generating your story card…</p>
    </div>
  `);
}

function showError(err) {
  console.error('[DSN]', err);
  const status = err?.status;
  let msg = 'Something went wrong. Try again in a moment.';
  if (status === 401) msg = 'Invalid API key. Go to Settings and paste your Groq key again.';
  else if (status === 429) msg = 'Rate limit reached. Wait a few seconds and try again.';
  else if (status === 400) msg = `Bad request — model may be unavailable. Open Settings and switch to a different model. (${esc(err.message)})`;
  else if (err instanceof TypeError) msg = 'Network error — check your internet connection and try again.';
  else if (err?.message) msg = `Error: ${esc(err.message)}`;

  showOutput(`
    <div class="error-card" role="alert">
      <p><strong>⚠ Error</strong></p>
      <p>${msg}</p>
    </div>
  `);
}

function showSoft(message) {
  showOutput(`
    <div class="soft-card" role="status">
      <p>${esc(message)}</p>
    </div>
  `);
}

// ===== RENDER STORY CARD =====
function renderStoryCard(d, query) {
  const text = buildStoryText(d, query);
  _clipboardText = text;

  showOutput(`
    <div class="story-card">
      <div class="card-head">
        <div class="story-badge">Story Type</div>
        <div class="story-type-val">${esc(d.story_type)}</div>
        <div class="card-query">For: &ldquo;${esc(query)}&rdquo;</div>
      </div>

      <div class="visual-hero">
        <div class="visual-name">${esc(d.recommended_visual)}</div>
        <div class="visual-why">${esc(d.why_this_visual)}</div>
      </div>

      <div class="card-body">
        <div class="card-section">
          <div class="section-label">Axis Configuration</div>
          <div class="axis-grid">
            <span class="axis-key">X Axis</span>
            <span class="axis-val">${esc(d.axis_config?.x_axis || '—')}</span>
            <span class="axis-key">Y Axis</span>
            <span class="axis-val">${esc(d.axis_config?.y_axis || '—')}</span>
            <span class="axis-key">Legend</span>
            <span class="axis-val">${esc(d.axis_config?.legend || 'Not required')}</span>
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
        <span class="copy-confirm" id="copyConfirm" hidden aria-live="polite">Copied!</span>
      </div>
    </div>
  `);
}

// ===== RENDER TRANSLATOR CARD =====
function renderTranslatorCard(d, query) {
  _clipboardText = buildTranslatorText(d, query);

  showOutput(`
    <div class="translator-card">
      <div class="trans-head">
        <h3>Stakeholder Translation</h3>
        <div class="card-query" style="margin-top:6px">For: &ldquo;${esc(query)}&rdquo;</div>
      </div>

      <div class="trans-body">
        <div class="card-section">
          <div class="section-label">What they likely mean</div>
          <div class="rule-box tip">${esc(d.likely_means)}</div>
        </div>

        <div class="card-section">
          <div class="section-label">Data you need to build this report</div>
          <div class="rule-box" style="background:var(--accent-dim);border-color:var(--accent)">${esc(d.data_needed)}</div>
        </div>

        <div class="card-section">
          <div class="section-label">Clarifying question to ask back</div>
          <div class="rule-box mistake">${esc(d.ask_back)}</div>
        </div>
      </div>

      <div class="card-foot">
        <button class="btn-primary copy-btn" aria-label="Copy translation to clipboard">Copy to Clipboard</button>
        <span class="copy-confirm" id="copyConfirm" hidden aria-live="polite">Copied!</span>
      </div>
    </div>
  `);
}

// ===== CLIPBOARD =====
async function handleCopy() {
  try {
    await navigator.clipboard.writeText(_clipboardText);
  } catch {
    // Fallback for browsers without Clipboard API
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
  const ax = d.axis_config || {};
  return [
    'DATA STORY NAVIGATOR — Story Card',
    `For: "${query}"`,
    '',
    `STORY TYPE: ${d.story_type}`,
    `RECOMMENDED VISUAL: ${d.recommended_visual}`,
    '',
    'WHY THIS VISUAL:',
    d.why_this_visual,
    '',
    'AXIS CONFIGURATION:',
    `  X Axis : ${ax.x_axis || '—'}`,
    `  Y Axis : ${ax.y_axis || '—'}`,
    `  Legend : ${ax.legend || 'Not required'}`,
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

function buildTranslatorText(d, query) {
  return [
    'DATA STORY NAVIGATOR — Stakeholder Translation',
    `For: "${query}"`,
    '',
    'WHAT THEY LIKELY MEAN:',
    d.likely_means,
    '',
    'DATA NEEDED:',
    d.data_needed,
    '',
    'ASK BACK:',
    d.ask_back,
  ].join('\n');
}

// ===== SESSION HISTORY =====
function saveHistory(query, result, type) {
  history.unshift({ id: Date.now(), query, result, type, time: new Date().toLocaleTimeString() });
  if (history.length > 10) history.pop();
  sessionStorage.setItem('dsn_history', JSON.stringify(history));
}

function renderHistory() {
  if (!history.length) {
    el.historyList.innerHTML = '<p class="empty-state">No history yet. Generate a story recommendation to see it here.</p>';
    return;
  }

  el.historyList.innerHTML = history.map(entry => `
    <button class="history-item" data-id="${entry.id}" aria-label="Replay: ${esc(entry.query)}">
      <div class="history-query">${esc(entry.query)}</div>
      <div class="history-meta">${entry.type === 'translator' ? 'Translation' : 'Story Card'} · ${entry.time}</div>
    </button>
  `).join('');

  el.historyList.querySelectorAll('.history-item').forEach(btn => {
    btn.addEventListener('click', () => replayHistory(Number(btn.dataset.id)));
  });
}

function replayHistory(id) {
  const entry = history.find(e => e.id === id);
  if (!entry) return;
  switchTab('plain'); // switch away from history tab to show result
  if (entry.type === 'story') renderStoryCard(entry.result, entry.query);
  else renderTranslatorCard(entry.result, entry.query);
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
