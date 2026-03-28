/* ═══════════════════════════════════════════════════════════════
   DataLens — script.js
   Handles: file parsing, chart rendering, stats, table, UI state
   Backend API: POST /api/analyze  (Flask on localhost:5000)
═══════════════════════════════════════════════════════════════ */

// ── Chart.js theme defaults ─────────────────────────────────
Chart.defaults.color = '#7a95ab';
Chart.defaults.font.family = "'DM Mono', monospace";

const COLORS = [
  '#00e5cc', '#ff6b6b', '#ffd166', '#06d6a0',
  '#a78bfa', '#f77f00', '#4cc9f0', '#e63946'
];

// ── State ───────────────────────────────────────────────────
let appData = null;   // { headers, rows, numCols, strCols }
let mainChart = null;
let compareChart = null;

// ── DOM Refs ─────────────────────────────────────────────────
const dropZone       = document.getElementById('drop-zone');
const fileInput      = document.getElementById('file-input');
const sampleBtn      = document.getElementById('sample-btn');
const resetBtn       = document.getElementById('reset-btn');
const errorBox       = document.getElementById('error-box');
const uploadSection  = document.getElementById('upload-section');
const dashSection    = document.getElementById('dashboard-section');
const fileBadge      = document.getElementById('file-badge');
const badgeName      = document.getElementById('badge-name');
const badgeRows      = document.getElementById('badge-rows');
const xColSel        = document.getElementById('x-col');
const yColSel        = document.getElementById('y-col');
const trendBadge     = document.getElementById('trend-badge');
const mainChartTitle = document.getElementById('main-chart-title');
const compareCard    = document.getElementById('compare-card');
const statsGrid      = document.getElementById('stats-grid');
const tableHead      = document.getElementById('table-head');
const tableBody      = document.getElementById('table-body');
const tableNote      = document.getElementById('table-note');

// ══════════════════════════════════════════════════════════════
// SAMPLE DATA
// ══════════════════════════════════════════════════════════════
const SAMPLE_CSV = `Month,Revenue,Users,Expenses
Jan,42000,1200,31000
Feb,48000,1450,33000
Mar,55000,1700,35000
Apr,51000,1600,34500
May,63000,2100,38000
Jun,70000,2500,41000
Jul,68000,2400,40000
Aug,75000,2800,43000`;

// ══════════════════════════════════════════════════════════════
// FILE UPLOAD EVENTS
// ══════════════════════════════════════════════════════════════
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFile(e.target.files[0]));
sampleBtn.addEventListener('click', () => loadCSVText(SAMPLE_CSV, 'sample_data.csv'));

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFile(e.dataTransfer.files[0]);
});

resetBtn.addEventListener('click', () => {
  appData = null;
  destroyCharts();
  dashSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  fileBadge.classList.add('hidden');
  fileInput.value = '';
  errorBox.classList.add('hidden');
});

// ══════════════════════════════════════════════════════════════
// FILE HANDLING
// ══════════════════════════════════════════════════════════════
function handleFile(file) {
  if (!file) return;
  if (!file.name.match(/\.(csv|txt)$/i)) {
    showError('Unsupported file type. Please upload a .csv or .txt file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => loadCSVText(e.target.result, file.name);
  reader.readAsText(file);
}

function loadCSVText(text, fileName) {
  hideError();
  try {
    const parsed = parseCSV(text);
    if (!parsed.rows.length) { showError('File is empty or has no data rows.'); return; }
    appData = parsed;
    initDashboard(fileName);
    sendToBackend(text);        // optional: send to Python backend
  } catch (err) {
    showError('Could not parse file. Make sure it has a valid CSV header row.');
  }
}

// ══════════════════════════════════════════════════════════════
// CSV PARSER  (pure JavaScript, no libraries)
// ══════════════════════════════════════════════════════════════
function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj = {};
    headers.forEach((h, i) => {
      const n = parseFloat(vals[i]);
      obj[h] = isNaN(n) ? vals[i] : n;
    });
    return obj;
  });

  const numCols = headers.filter(h => rows.some(r => typeof r[h] === 'number'));
  const strCols = headers.filter(h => rows.some(r => typeof r[h] === 'string'));

  return { headers, rows, numCols, strCols };
}

// ══════════════════════════════════════════════════════════════
// BACKEND COMMUNICATION (Flask API)
// ══════════════════════════════════════════════════════════════
async function sendToBackend(csvText) {
  try {
    const res = await fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: csvText })
    });
    if (!res.ok) return;
    const result = await res.json();
    console.log('Backend analysis:', result);
    // You can use result.stats, result.trend etc. to enhance the UI
  } catch (err) {
    console.warn('Backend not running — using client-side analysis only.');
  }
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD INIT
// ══════════════════════════════════════════════════════════════
function initDashboard(fileName) {
  // Badge
  badgeName.textContent = fileName;
  badgeRows.textContent = `· ${appData.rows.length} rows`;
  fileBadge.classList.remove('hidden');

  // Show dashboard
  uploadSection.classList.add('hidden');
  dashSection.classList.remove('hidden');

  // Populate selects
  populateSelects();

  // Render
  renderAll();
}

function populateSelects() {
  xColSel.innerHTML = appData.headers.map(h => `<option>${h}</option>`).join('');
  yColSel.innerHTML = appData.numCols.map(h => `<option>${h}</option>`).join('');

  // Smart defaults: first string col for X, first numeric col for Y
  if (appData.strCols.length) xColSel.value = appData.strCols[0];
  if (appData.numCols.length) yColSel.value = appData.numCols[0];

  xColSel.addEventListener('change', renderAll);
  yColSel.addEventListener('change', renderAll);
}

// ══════════════════════════════════════════════════════════════
// RENDER ORCHESTRATOR
// ══════════════════════════════════════════════════════════════
function renderAll() {
  const xCol = xColSel.value;
  const yCol = yColSel.value;
  const chartType = document.querySelector('.chart-btn.active')?.dataset.type || 'bar';
  const rows = appData.rows.slice(0, 20);

  renderMainChart(rows, xCol, yCol, chartType);
  renderCompareChart(rows, xCol);
  renderTrend(rows, yCol);
  renderStats();
  renderTable();
}

// ══════════════════════════════════════════════════════════════
// CHART RENDERING
// ══════════════════════════════════════════════════════════════
function renderMainChart(rows, xCol, yCol, type) {
  destroyChart('main');
  const labels = rows.map(r => r[xCol]);
  const values = rows.map(r => typeof r[yCol] === 'number' ? r[yCol] : 0);

  mainChartTitle.textContent = `${yCol} by ${xCol}`;

  const ctx = document.getElementById('main-chart').getContext('2d');

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: type === 'pie', labels: { color: '#7a95ab', font: { size: 11 } } },
      tooltip: {
        backgroundColor: '#0d1f2d',
        borderColor: 'rgba(0,229,204,0.3)',
        borderWidth: 1,
        titleColor: '#00e5cc',
        bodyColor: '#e8f1f8',
        padding: 10,
      }
    }
  };

  if (type === 'pie') {
    mainChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: COLORS,
          borderColor: '#07111a',
          borderWidth: 2,
        }]
      },
      options: { ...commonOptions }
    });
  } else {
    const isLine = type === 'line';
    mainChart = new Chart(ctx, {
      type: isLine ? 'line' : 'bar',
      data: {
        labels,
        datasets: [{
          label: yCol,
          data: values,
          backgroundColor: isLine ? 'rgba(0,229,204,0.1)' : labels.map((_, i) => COLORS[i % COLORS.length]),
          borderColor: '#00e5cc',
          borderWidth: isLine ? 2.5 : 0,
          borderRadius: isLine ? 0 : 5,
          pointBackgroundColor: '#00e5cc',
          pointRadius: isLine ? 4 : 0,
          fill: isLine,
          tension: 0.35,
        }]
      },
      options: {
        ...commonOptions,
        scales: {
          x: {
            ticks: { color: '#7a95ab', font: { size: 10 }, maxRotation: 35 },
            grid: { color: 'rgba(255,255,255,0.03)' }
          },
          y: {
            ticks: { color: '#7a95ab', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  }
}

function renderCompareChart(rows, xCol) {
  destroyChart('compare');
  const cols = appData.numCols.slice(0, 4);
  if (cols.length <= 1) { compareCard.classList.add('hidden'); return; }

  compareCard.classList.remove('hidden');
  const labels = rows.map(r => r[xCol]);
  const ctx = document.getElementById('compare-chart').getContext('2d');

  compareChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: cols.map((col, i) => ({
        label: col,
        data: rows.map(r => typeof r[col] === 'number' ? r[col] : 0),
        backgroundColor: COLORS[i],
        borderRadius: 4,
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#7a95ab', font: { size: 11 } } },
        tooltip: {
          backgroundColor: '#0d1f2d',
          borderColor: 'rgba(0,229,204,0.3)',
          borderWidth: 1,
          titleColor: '#00e5cc',
          bodyColor: '#e8f1f8',
          padding: 10,
        }
      },
      scales: {
        x: { ticks: { color: '#7a95ab', font: { size: 10 }, maxRotation: 35 }, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { ticks: { color: '#7a95ab', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════
// TREND ANALYSIS
// ══════════════════════════════════════════════════════════════
function renderTrend(rows, yCol) {
  const vals = rows.map(r => r[yCol]).filter(v => typeof v === 'number');
  if (vals.length < 2) { trendBadge.classList.add('hidden'); return; }

  const half = Math.ceil(vals.length / 2);
  const avgFirst = vals.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const avgLast  = vals.slice(half).reduce((a, b) => a + b, 0) / (vals.length - half);
  const pct = Math.abs(((avgLast - avgFirst) / Math.abs(avgFirst)) * 100).toFixed(1);
  const up = avgLast >= avgFirst;

  trendBadge.className = `trend-badge ${up ? 'up' : 'down'}`;
  trendBadge.textContent = `${up ? '↑' : '↓'} ${yCol} is ${up ? 'growing' : 'declining'} — ${pct}% trend shift across dataset`;
  trendBadge.classList.remove('hidden');
}

// ══════════════════════════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════════════════════════
function renderStats() {
  statsGrid.innerHTML = '';

  if (!appData.numCols.length) {
    statsGrid.innerHTML = '<p style="color:var(--muted);font-family:var(--mono);text-align:center;padding:32px;">No numeric columns found.</p>';
    return;
  }

  appData.numCols.forEach(col => {
    const vals = appData.rows.map(r => r[col]).filter(v => typeof v === 'number');
    if (!vals.length) return;

    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = (sum / vals.length).toFixed(2);
    const min = Math.min(...vals);
    const max = Math.max(...vals);

    const card = document.createElement('div');
    card.className = 'stats-col-card';
    card.innerHTML = `
      <div class="section-title">${col}</div>
      <div class="stat-cards-row">
        ${statCard('Sum', Number(sum.toFixed(2)).toLocaleString())}
        ${statCard('Average', Number(avg).toLocaleString())}
        ${statCard('Min', min.toLocaleString())}
        ${statCard('Max', max.toLocaleString())}
        ${statCard('Count', vals.length)}
      </div>
    `;
    statsGrid.appendChild(card);
  });
}

function statCard(label, value) {
  return `<div class="stat-card">
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// TABLE
// ══════════════════════════════════════════════════════════════
function renderTable() {
  const { headers, rows } = appData;
  const limit = 50;

  // Header
  tableHead.innerHTML = `<tr>
    <th>#</th>
    ${headers.map(h => `<th>${h}</th>`).join('')}
  </tr>`;

  // Body
  tableBody.innerHTML = rows.slice(0, limit).map((row, i) => `
    <tr>
      <td class="idx">${i + 1}</td>
      ${headers.map(h => `<td class="${typeof row[h] === 'number' ? 'num' : 'text'}">${row[h]}</td>`).join('')}
    </tr>
  `).join('');

  // Note
  if (rows.length > limit) {
    tableNote.textContent = `Showing ${limit} of ${rows.length} rows`;
    tableNote.classList.remove('hidden');
  } else {
    tableNote.classList.add('hidden');
  }
}

// ══════════════════════════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
  });
});

// Chart type switching
document.querySelectorAll('.chart-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (appData) renderAll();
  });
});

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function destroyCharts() {
  destroyChart('main');
  destroyChart('compare');
}

function destroyChart(which) {
  if (which === 'main' && mainChart) { mainChart.destroy(); mainChart = null; }
  if (which === 'compare' && compareChart) { compareChart.destroy(); compareChart = null; }
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
}
