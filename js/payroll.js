/**
 * payroll.js
 * Payroll engine — Yellow Belt v2.0
 *
 * After all payments complete, calls Contract.logRun() to record the run
 * on the Soroban PayrollRegistry contract and emit a chain event.
 */

const Payroll = (() => {

  async function run() {
    const s = State.get();

    if (!s.wallet.connected)    { UI.toast('⚠️', 'Connect your wallet first.');    return; }
    if (s.team.length === 0)    { UI.toast('⚠️', 'Add team members first.');        return; }
    if (s.payroll.running)      return;

    const totalNeeded = s.team.reduce((acc, m) => acc + parseFloat(m.amount), 0);
    const feeBuffer   = s.team.length * 0.00001 + 0.5;

    if (s.wallet.balance === null) {
      UI.toast('⚠️', 'Balance not loaded yet. Please wait or reconnect.');
      return;
    }
    if (totalNeeded + feeBuffer > s.wallet.balance) {
      UI.toast('❌', `Insufficient balance. Need ≥${(totalNeeded + feeBuffer).toFixed(2)} XLM.`);
      return;
    }

    State.setPayrollRunning(true);
    State.resetMemberStatuses();
    State.clearTxLog();
    State.clearContractError();

    UI.showProgress(true);
    UI.setProgress(0, 'Starting payroll...');
    UI.renderPayrollPreview();
    UI.renderTeamTable();
    UI.renderTxLog();
    UI.renderContractStatus();

    const team    = [...s.team];
    const results = [];

    for (let i = 0; i < team.length; i++) {
      const member = team[i];

      State.setMemberStatus(member.id, 'sending');
      State.addTxLogItem({ type: 'spin', desc: `Sending ${member.amount} XLM → ${member.name}` });

      UI.updateMemberRow(member.id);
      UI.setProgress(i / team.length, `Sending to ${member.name}… (${i + 1}/${team.length})`);
      UI.renderTxLog();

      try {
        const hash = await Stellar.sendPayment(member.wallet, member.amount);

        State.setMemberStatus(member.id, 'success', hash);
        State.updateLastTxLogItem({
          type: 'ok',
          desc: `Sent ${member.amount} XLM → ${member.name}`,
          hash,
        });

        results.push({ name: member.name, amount: parseFloat(member.amount), hash, success: true });
        UI.toast('✅', `${member.name} received ${member.amount} XLM`);

      } catch (err) {
        const errMsg = Stellar.extractError(err);
        console.error(`[Payroll] Failed for ${member.name}:`, err);

        State.setMemberStatus(member.id, 'error');
        State.updateLastTxLogItem({ type: 'err', desc: `Failed → ${member.name}: ${errMsg}` });

        results.push({ name: member.name, amount: parseFloat(member.amount), hash: null, success: false });
        UI.toast('❌', `Payment to ${member.name} failed.`);
      }

      UI.updateMemberRow(member.id);
      UI.renderTxLog();
    }

    // ── Finalize payments ────────────────────────────────────────────────────
    const succeeded = results.filter(r => r.success);
    UI.setProgress(1, `Done! ${succeeded.length}/${team.length} payments sent.`);

    State.setPayrollRunning(false);
    State.recordPayrollRun(results);

    await Wallet.refresh();
    UI.updateStats();
    UI.renderHistory();
    UI.renderTeamTable();

    if (succeeded.length > 0) {
      setTimeout(() => {
        UI.showReceipt(succeeded);
        UI.launchConfetti();
      }, 600);

      // ── Yellow Belt: log the run to the on-chain PayrollRegistry ─────────
      if (Contract.isConfigured()) {
        State.setContractLogging(true);
        UI.renderContractStatus();

        try {
          const totalXLM   = succeeded.reduce((s, r) => s + r.amount, 0);
          const contractRes = await Contract.logRun(succeeded.length, totalXLM);

          if (contractRes) {
            State.setContractLastHash(contractRes.hash);
            // Refresh on-chain run count
            const count = await Contract.getRunCount();
            if (count !== null) State.setContractRunCount(Number(count));
          }
        } catch (err) {
          console.error('[Payroll] Contract logRun failed:', err);
          State.setContractLogError(err.message || 'Contract call failed');
        } finally {
          State.setContractLogging(false);
          UI.renderContractStatus();
        }
      }
    }
  }

  return { run };

})();
