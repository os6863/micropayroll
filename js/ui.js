/**
 * ui.js
 * DOM rendering & UI helpers — Yellow Belt v2.0
 *
 * Additions: wallet selector, wallet-type badge, contract status panel,
 * history tabs (Session / On-Chain Events).
 */

const UI = (() => {

  /* ── Helpers ─────────────────────────────── */
  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function shortAddr(addr) {
    return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : '—';
  }

  function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function xlmToUsd(xlm) {
    return (parseFloat(xlm || 0) * CONFIG.XLM_USD_RATE).toFixed(2);
  }

  /* ── Toast ────────────────────────────────── */
  let _toastTimer = null;
  function toast(icon, msg) {
    clearTimeout(_toastTimer);
    const el = document.getElementById('toast');
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-msg').textContent  = msg;
    el.classList.add('visible');
    _toastTimer = setTimeout(() => el.classList.remove('visible'), 3500);
  }

  /* ── Modal ────────────────────────────────── */
  function openModal(id) {
    document.getElementById(id)?.classList.add('open');
  }
  function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
    if (id === 'modal-add-member') {
      ['inp-name', 'inp-role', 'inp-wallet', 'inp-amount'].forEach(i => {
        const el = document.getElementById(i);
        if (el) el.value = '';
      });
    }
  }

  /* ── Page navigation ─────────────────────── */
  function setPage(pageId, navEl) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    if (navEl) navEl.classList.add('active');
    const titles = { dashboard: 'Dashboard', team: 'Team Roster', history: 'Payroll History' };
    document.getElementById('page-title').textContent = titles[pageId] || pageId;
    if (pageId === 'history') renderHistory();
  }

  /* ── Wallet Button ────────────────────────── */
  function updateWalletBtn(connected, publicKey, walletType) {
    const btn   = document.getElementById('wallet-connect-btn');
    const icon  = document.getElementById('wallet-btn-icon');
    const label = document.getElementById('wallet-btn-label');
    const fbBtn = document.getElementById('friendbot-btn');
    const badge = document.getElementById('wallet-type-badge');

    if (connected) {
      btn.className   = 'btn btn-danger btn-sm';
      icon.textContent  = '🔌';
      label.textContent = 'Disconnect';
      btn.title = publicKey;
      fbBtn.style.display = 'inline-flex';
      if (badge) {
        const typeLabel = walletType === 'albedo' ? '🔷 ALBEDO' : '🦊 Freighter';
        badge.textContent    = typeLabel;
        badge.style.display  = 'inline-flex';
      }
    } else {
      btn.className   = 'btn btn-primary btn-sm';
      icon.textContent  = '🔗';
      label.textContent = 'Connect Wallet';
      btn.title = '';
      fbBtn.style.display = 'none';
      if (badge) badge.style.display = 'none';
    }
  }

  /* ── Dashboard connected/disconnected ────── */
  function showDashboardConnected(show) {
    document.getElementById('connect-banner').style.display    = show ? 'none'  : 'flex';
    document.getElementById('dashboard-content').style.display = show ? 'block' : 'none';
  }

  /* ── Stats ─────────────────────────────────── */
  function updateStats() {
    const s     = State.get();
    const total = s.team.reduce((acc, m) => acc + parseFloat(m.amount || 0), 0);
    document.getElementById('stat-balance').textContent      = s.wallet.balance !== null ? parseFloat(s.wallet.balance).toFixed(4) + ' XLM' : '—';
    document.getElementById('stat-balance-usd').textContent  = s.wallet.balance !== null ? '≈ $' + xlmToUsd(s.wallet.balance) : '';
    document.getElementById('stat-team').textContent         = s.team.length;
    document.getElementById('stat-payroll-total').textContent = total.toFixed(2) + ' XLM';
    document.getElementById('stat-payroll-usd').textContent  = '≈ $' + xlmToUsd(total);
    document.getElementById('stat-total-paid').textContent   = s.payroll.totalPaid.toFixed(2) + ' XLM';
    document.getElementById('stat-runs').textContent         = s.payroll.runsCount + ' payroll run' + (s.payroll.runsCount !== 1 ? 's' : '');
  }

  /* ── Contract Status Panel (Yellow Belt) ──── */
  function renderContractStatus() {
    const el = document.getElementById('contract-status');
    if (!el) return;
    const { contract } = State.get();

    if (!Contract.isConfigured()) {
      el.innerHTML = `<div class="contract-status-row contract-unconfigured">
        <span class="contract-icon">📜</span>
        <span>PayrollRegistry contract not configured — set <code>CONTRACT_ID</code> in config.js after deploying.</span>
      </div>`;
      return;
    }

    if (contract.logging) {
      el.innerHTML = `<div class="contract-status-row contract-pending">
        <span class="spinner"></span>
        <span>Logging run to PayrollRegistry contract…</span>
      </div>`;
      return;
    }

    if (contract.logError) {
      el.innerHTML = `<div class="contract-status-row contract-error">
        <span class="contract-icon">⚠️</span>
        <span>Contract log failed: ${esc(contract.logError)}</span>
      </div>`;
      return;
    }

    if (contract.lastTxHash) {
      const countStr = contract.runCount !== null ? ` · Run #${contract.runCount} on-chain` : '';
      el.innerHTML = `<div class="contract-status-row contract-ok">
        <span class="contract-icon">✅</span>
        <span>Logged on PayrollRegistry${countStr} —
          <a href="${CONFIG.EXPLORER_URL}/tx/${contract.lastTxHash}" target="_blank" rel="noopener">
            ${contract.lastTxHash.slice(0, 14)}…↗
          </a>
        </span>
      </div>`;
      return;
    }

    el.innerHTML = `<div class="contract-status-row contract-idle">
      <span class="contract-icon">📜</span>
      <span>PayrollRegistry contract ready — run payroll to log on-chain.</span>
    </div>`;
  }

  /* ── Payroll Preview ─────────────────────── */
  function renderPayrollPreview() {
    const s   = State.get();
    const el  = document.getElementById('payroll-team-preview');
    const btn = document.getElementById('payroll-btn');

    if (s.team.length === 0) {
      el.innerHTML = `<div class="payroll-preview-empty">
        No team members yet. Go to <strong>Team Roster</strong> to add members.
      </div>`;
      btn.disabled = true;
      return;
    }

    el.innerHTML = `<div class="payroll-member-list">
      ${s.team.map(m => `
        <div class="payroll-member-row ${m.status}" id="prow-${m.id}">
          <div class="member-avatar" style="background:${m.colorBg};color:${m.color};">
            ${initials(m.name)}
          </div>
          <div class="member-meta">
            <div class="member-name">${esc(m.name)}</div>
            <div class="member-role">${esc(m.role)}</div>
          </div>
          <div class="member-amount">${parseFloat(m.amount).toFixed(2)} XLM</div>
          <div class="member-status">${statusBadge(m.status)}</div>
        </div>
      `).join('')}
    </div>`;

    btn.disabled = !s.wallet.connected || s.payroll.running;
  }

  /* ── Team Table ───────────────────────────── */
  function renderTeamTable() {
    const s     = State.get();
    const empty = document.getElementById('team-empty');
    const table = document.getElementById('team-table');
    const tbody = document.getElementById('team-tbody');

    if (s.team.length === 0) {
      empty.style.display = 'flex';
      table.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    table.style.display = '';

    tbody.innerHTML = s.team.map(m => `
      <tr>
        <td>
          <div class="member-cell">
            <div class="member-avatar" style="background:${m.colorBg};color:${m.color};">
              ${initials(m.name)}
            </div>
            <div>
              <div class="member-name">${esc(m.name)}</div>
              <div class="member-role" style="font-size:12px;color:var(--txt2);">${esc(m.role)}</div>
            </div>
          </div>
        </td>
        <td><span class="mono">${shortAddr(m.wallet)}</span></td>
        <td><span class="amount-cell">${parseFloat(m.amount).toFixed(2)} XLM</span></td>
        <td>${statusBadge(m.status)}</td>
        <td>
          ${!s.payroll.running
            ? `<button class="btn btn-danger btn-sm" onclick="App.removeMember(${m.id})">Remove</button>`
            : ''}
        </td>
      </tr>
    `).join('');
  }

  /* ── Status Badge ─────────────────────────── */
  function statusBadge(status) {
    const map = {
      idle:    ['badge-idle',    '—'],
      sending: ['badge-sending badge-pulse', '<span class="spinner"></span> Sending'],
      success: ['badge-success', '✓ Sent'],
      error:   ['badge-error',   '✕ Failed'],
    };
    const [cls, lbl] = map[status] || map.idle;
    return `<span class="badge ${cls}">${lbl}</span>`;
  }

  /* ── Update single member row ─────────────── */
  function updateMemberRow(id) {
    const s  = State.get();
    const m  = s.team.find(x => x.id === id);
    if (!m) return;
    const prow = document.getElementById('prow-' + id);
    if (prow) {
      prow.className = 'payroll-member-row ' + m.status;
      prow.querySelector('.member-status').innerHTML = statusBadge(m.status);
    }
    renderTeamTable();
  }

  /* ── Progress ─────────────────────────────── */
  function showProgress(show) {
    document.getElementById('payroll-progress').style.display = show ? 'block' : 'none';
  }

  function setProgress(ratio, label) {
    const pct = Math.round(ratio * 100);
    document.getElementById('progress-bar').style.width   = pct + '%';
    document.getElementById('progress-pct').textContent   = pct + '%';
    document.getElementById('progress-label').textContent = label;
  }

  /* ── TX Log ───────────────────────────────── */
  function renderTxLog() {
    const s  = State.get();
    const el = document.getElementById('tx-log');

    if (s.txLog.length === 0) {
      el.innerHTML = `<div class="tx-empty">
        <div class="tx-empty-icon">📭</div>
        <div>Run payroll to see live transactions</div>
      </div>`;
      return;
    }

    el.innerHTML = [...s.txLog].reverse().map(item => {
      const icon   = item.type === 'ok' ? '✅' : item.type === 'err' ? '❌' : '<span class="spinner"></span>';
      const hashEl = item.hash
        ? `<a class="tx-hash" href="${CONFIG.EXPLORER_URL}/tx/${item.hash}" target="_blank" rel="noopener">${item.hash.slice(0, 18)}…</a>`
        : '';
      return `<div class="tx-item">
        <div class="tx-dot">${icon}</div>
        <div class="tx-body">
          <div class="tx-desc">${esc(item.desc)}</div>
          ${hashEl}
        </div>
        <div class="tx-time">${item.time}</div>
      </div>`;
    }).join('');
  }

  function clearLog() {
    State.clearTxLog();
    renderTxLog();
  }

  /* ── Receipt Modal ────────────────────────── */
  function showReceipt(successResults) {
    const total = successResults.reduce((s, r) => s + r.amount, 0);
    document.getElementById('receipt-subtitle').textContent =
      `${successResults.length} payment${successResults.length !== 1 ? 's' : ''} sent on Stellar Testnet`;

    const walletLabel = WalletProvider.getLabel() || 'Wallet';
    const rows = [
      { lbl: 'Date',              val: new Date().toLocaleString(),      green: false },
      { lbl: 'Wallet',            val: walletLabel,                       green: false },
      { lbl: 'Recipients',        val: successResults.length.toString(),  green: false },
      { lbl: 'Total Distributed', val: total.toFixed(4) + ' XLM',        green: true  },
      { lbl: 'Network',           val: 'Stellar Testnet',                 green: false },
    ];

    const memberRows = successResults.map(r => ({
      lbl: r.name,
      val: `<a href="${CONFIG.EXPLORER_URL}/tx/${r.hash}" target="_blank" rel="noopener" style="color:var(--accent);">${r.hash.slice(0, 12)}…↗</a>`,
      green: false, raw: true,
    }));

    document.getElementById('receipt-rows').innerHTML = [...rows, ...memberRows].map(r => `
      <div class="receipt-row">
        <span class="lbl">${esc(r.lbl)}</span>
        <span class="val ${r.green ? 'green' : ''}">${r.raw ? r.val : esc(r.val)}</span>
      </div>
    `).join('');

    const s = State.get();
    document.getElementById('receipt-explorer-link').href =
      `${CONFIG.EXPLORER_URL}/account/${s.wallet.publicKey}`;

    openModal('modal-receipt');
  }

  /* ── History (Session + On-Chain tabs) ───── */
  let _activeHistoryTab = 'session';

  function setHistoryTab(tab) {
    _activeHistoryTab = tab;
    document.querySelectorAll('.history-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    renderHistory();
  }

  function renderHistory() {
    if (_activeHistoryTab === 'events') {
      renderOnChainEvents();
    } else {
      renderSessionHistory();
    }
  }

  function renderSessionHistory() {
    const s  = State.get();
    const el = document.getElementById('history-list');

    if (s.history.length === 0) {
      el.innerHTML = `<div class="tx-empty"><div class="tx-empty-icon">📋</div><div>No payroll history yet</div></div>`;
      return;
    }

    el.innerHTML = [...s.history].reverse().map(run => {
      const walletBadge = run.walletType
        ? `<span class="wallet-pill">${run.walletType === 'albedo' ? '🔷 ALBEDO' : '🦊 Freighter'}</span>`
        : '';
      return `
        <div class="history-run">
          <div class="history-run-header">
            <div>
              <div class="history-run-title">Payroll Run #${run.id.toString().slice(-4)} ${walletBadge}</div>
              <div class="history-run-meta">${run.date} · ${shortAddr(run.sender)}</div>
            </div>
            <div class="history-run-total">+${run.total.toFixed(4)} XLM sent</div>
          </div>
          <div class="history-tx-list">
            ${run.results.map(r => `
              <div class="history-tx-item">
                <span class="history-tx-name">${esc(r.name)}</span>
                ${r.success
                  ? `<a class="history-tx-hash" href="${CONFIG.EXPLORER_URL}/tx/${r.hash}" target="_blank" rel="noopener">${r.hash.slice(0, 14)}…↗</a>`
                  : `<span style="color:var(--error);font-size:12px;">Failed</span>`}
                <span class="history-tx-amount">${r.amount.toFixed(2)} XLM</span>
              </div>
            `).join('')}
          </div>
        </div>`;
    }).join('');
  }

  /* ── On-Chain Events tab ─────────────────── */
  let _eventsLoading = false;

  async function renderOnChainEvents() {
    const el = document.getElementById('history-list');

    if (!Contract.isConfigured()) {
      el.innerHTML = `<div class="tx-empty">
        <div class="tx-empty-icon">📜</div>
        <div>Contract not configured. Deploy the PayrollRegistry contract and set <code>CONTRACT_ID</code> in <code>config.js</code>.</div>
      </div>`;
      return;
    }

    if (_eventsLoading) return;
    _eventsLoading = true;

    el.innerHTML = `<div class="tx-empty"><span class="spinner"></span>&nbsp; Fetching on-chain events…</div>`;

    try {
      const events = await Contract.fetchEvents();
      _eventsLoading = false;

      if (events.length === 0) {
        el.innerHTML = `<div class="tx-empty">
          <div class="tx-empty-icon">📡</div>
          <div>No on-chain events found yet. Run payroll to emit the first contract event.</div>
        </div>`;
        return;
      }

      el.innerHTML = events.map(ev => {
        const ledger = ev.ledger || '—';
        const txHash = ev.txHash || '';
        // Try to parse event data (run_id, sender, recipients, total_stroops)
        let dataHtml = '';
        try {
          const vals = ev.value?.value;
          if (Array.isArray(vals) && vals.length >= 4) {
            const [runId, sender, recipCount, totalStroops] = vals.map(v => StellarSdk.scValToNative(v));
            const xlm = (Number(totalStroops) / 10_000_000).toFixed(4);
            dataHtml = `<div class="event-data">
              <span>Run #${runId}</span>
              <span>·</span>
              <span>${recipCount} recipients</span>
              <span>·</span>
              <span>${xlm} XLM</span>
              <span>·</span>
              <span class="mono">${String(sender).slice(0, 6)}…${String(sender).slice(-4)}</span>
            </div>`;
          }
        } catch (_) {}

        return `<div class="event-item">
          <div class="event-topic">
            <span class="badge badge-success">payroll / logged</span>
            <span class="event-ledger">Ledger ${ledger}</span>
            ${txHash ? `<a class="event-tx" href="${CONFIG.EXPLORER_URL}/tx/${txHash}" target="_blank" rel="noopener">${txHash.slice(0, 12)}…↗</a>` : ''}
          </div>
          ${dataHtml}
        </div>`;
      }).join('');

    } catch (err) {
      _eventsLoading = false;
      el.innerHTML = `<div class="tx-empty">
        <div class="tx-empty-icon">⚠️</div>
        <div>Failed to load events: ${esc(err.message || 'unknown error')}</div>
      </div>`;
    }
  }

  function clearHistory() {
    State.clearHistory();
    renderSessionHistory();
  }

  /* ── Confetti ─────────────────────────────── */
  function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx    = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#00d4ff', '#7b61ff', '#00e676', '#ffab40', '#ff5252'];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height * 0.5,
      r: Math.random() * 5 + 3,
      speed: Math.random() * 3 + 2,
      drift: Math.random() * 4 - 2,
      tilt: Math.random() * Math.PI,
      tiltS: (Math.random() - 0.5) * 0.05,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let frame = 0;
    (function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.tilt);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - frame / 200);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
        p.y += p.speed;
        p.x += p.drift;
        p.tilt += p.tiltS;
      });
      frame++;
      if (frame < 220) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    })();
  }

  /* ── Full render ─────────────────────────── */
  function renderAll() {
    const s = State.get();
    updateWalletBtn(s.wallet.connected, s.wallet.publicKey, s.wallet.walletType);
    showDashboardConnected(s.wallet.connected);
    updateStats();
    renderPayrollPreview();
    renderTeamTable();
    renderTxLog();
    renderContractStatus();
    renderHistory();
  }

  return {
    toast, openModal, closeModal, setPage,
    updateWalletBtn, showDashboardConnected, updateStats,
    renderPayrollPreview, renderTeamTable, updateMemberRow,
    showProgress, setProgress,
    renderTxLog, clearLog,
    showReceipt,
    renderHistory, renderOnChainEvents, setHistoryTab, clearHistory,
    renderContractStatus,
    launchConfetti, renderAll,
    esc, shortAddr,
  };

})();
