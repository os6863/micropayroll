/**
 * main.js
 * App entry point — Yellow Belt v2.0
 */

const App = (() => {

  /* ── Add Member ─────────────────────────── */
  function addMember() {
    const name   = document.getElementById('inp-name').value.trim();
    const role   = document.getElementById('inp-role').value.trim() || 'Team Member';
    const wallet = document.getElementById('inp-wallet').value.trim();
    const amount = parseFloat(document.getElementById('inp-amount').value);

    if (!name) { UI.toast('⚠️', 'Please enter a name.'); return; }
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(wallet)) {
      UI.toast('⚠️', 'Invalid Stellar address. Must start with G.'); return;
    }
    if (!amount || amount <= 0) { UI.toast('⚠️', 'Please enter a valid XLM amount.'); return; }

    State.addMember({ name, role, wallet, amount });
    UI.closeModal('modal-add-member');
    UI.renderPayrollPreview();
    UI.renderTeamTable();
    UI.updateStats();
    UI.toast('✅', `${name} added to team roster.`);
  }

  /* ── Remove Member ──────────────────────── */
  function removeMember(id) {
    const s = State.get();
    if (s.payroll.running) { UI.toast('⚠️', 'Cannot remove members during payroll.'); return; }
    const member = s.team.find(m => m.id === id);
    if (!member) return;
    State.removeMember(id);
    UI.renderPayrollPreview();
    UI.renderTeamTable();
    UI.updateStats();
    UI.toast('🗑️', `${member.name} removed.`);
  }

  /* ── Friendbot ──────────────────────────── */
  async function fundWithFriendbot() {
    const s = State.get();
    if (!s.wallet.publicKey) return;
    UI.toast('🚰', 'Requesting testnet XLM from Friendbot...');
    try {
      const res = await fetch(`${CONFIG.FRIENDBOT_URL}?addr=${encodeURIComponent(s.wallet.publicKey)}`);
      if (res.ok) {
        await Wallet.refresh();
        UI.toast('✅', '10,000 testnet XLM received!');
      } else {
        UI.toast('⚠️', 'Friendbot failed. Account may already be funded.');
      }
    } catch (err) {
      UI.toast('❌', 'Friendbot request failed: ' + (err.message || err));
    }
  }

  /* ── Sidebar (mobile) ───────────────────── */
  function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const btn     = document.getElementById('hamburger-btn');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    btn.classList.toggle('open');
  }

  function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const btn     = document.getElementById('hamburger-btn');
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    btn.classList.remove('open');
  }

  /* ── On-chain stats refresh (Orange Belt) ─ */
  async function refreshOnChainStats() {
    if (!Contract.isConfigured()) {
      const el = document.getElementById('stat-onchain-total');
      if (el) el.textContent = '—';
      return;
    }
    try {
      const totalXLM = await Contract.getTotalDistributed();
      const el    = document.getElementById('stat-onchain-total');
      const subEl = document.getElementById('stat-onchain-sub');
      if (el) el.textContent = totalXLM !== null ? totalXLM.toFixed(2) + ' XLM' : '—';
      if (subEl && totalXLM !== null) {
        const latestRun = await Contract.getLatestRun();
        if (latestRun) {
          const d = new Date(latestRun.timestamp * 1000);
          subEl.textContent = 'Last run: ' + d.toLocaleDateString();
        }
      }
    } catch(e) {
      console.warn('[refreshOnChainStats]', e);
    }
  }

  /* ── Init ───────────────────────────────── */
  function init() {
    // Close sidebar on nav click (mobile)
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => closeSidebar());
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        if (State.get().wallet.connected) UI.openModal('modal-add-member');
      }
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
    });

    UI.renderAll();

    // Auto-reconnect via Freighter if already unlocked
    setTimeout(() => Wallet.autoConnect(), 600);
    setTimeout(() => refreshOnChainStats(), 2000);

    console.log('%c⚡ MicroPayroll', 'color:#00d4ff;font-size:18px;font-weight:bold;');
    console.log('%cStellar Testnet | Orange Belt 🟠', 'color:#f5c518;font-size:12px;');
    console.log('%cMulti-wallet (Freighter + ALBEDO) | Soroban PayrollRegistry | CI/CD | Mobile Responsive', 'color:#7b61ff;font-size:11px;');
  }

  return { addMember, removeMember, fundWithFriendbot, toggleSidebar, closeSidebar, refreshOnChainStats, init };

})();

document.addEventListener('DOMContentLoaded', App.init);
