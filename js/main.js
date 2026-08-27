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

  /* ── Init ───────────────────────────────── */
  function init() {
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

    console.log('%c⚡ MicroPayroll', 'color:#00d4ff;font-size:18px;font-weight:bold;');
    console.log('%cStellar Testnet | Yellow Belt 🟡', 'color:#f5c518;font-size:12px;');
    console.log('%cMulti-wallet (Freighter + ALBEDO) | Soroban PayrollRegistry contract', 'color:#7b61ff;font-size:11px;');
  }

  return { addMember, removeMember, fundWithFriendbot, init };

})();

document.addEventListener('DOMContentLoaded', App.init);
