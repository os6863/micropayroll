/**
 * state.js
 * Centralized application state — Yellow Belt v2.0
 * Additions: walletType, lastContractRunId, contractRunCount
 */

const State = (() => {
  const LS_TEAM        = 'mp_team';
  const LS_HISTORY     = 'mp_history';
  const LS_WALLET_TYPE = 'mp_wallet_type';

  function _loadLS(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (_) { return fallback; }
  }

  function _saveTeam()    { try { localStorage.setItem(LS_TEAM,    JSON.stringify(_state.team));    } catch (_) {} }
  function _saveHistory() { try { localStorage.setItem(LS_HISTORY, JSON.stringify(_state.history)); } catch (_) {} }

  const _savedTeam    = _loadLS(LS_TEAM,    []);
  const _savedHistory = _loadLS(LS_HISTORY, []);
  const _savedWalletType = _loadLS(LS_WALLET_TYPE, null);

  const _derivedTotalPaid = _savedHistory.reduce((s, r) => s + (r.total || 0), 0);
  const _derivedRunsCount = _savedHistory.length;

  let _colorIdx = _savedTeam.length;

  let _state = {
    wallet: {
      connected:  false,
      publicKey:  null,
      balance:    null,
      walletType: _savedWalletType, // 'freighter' | 'albedo' | null — remembered for display
    },
    team:    _savedTeam,
    payroll: {
      running:   false,
      doneCount: 0,
      totalPaid: _derivedTotalPaid,
      runsCount: _derivedRunsCount,
    },
    txLog:   [],
    history: _savedHistory,
    // Yellow Belt — contract state
    contract: {
      lastTxHash: null,   // hash of the most recent log_run contract call
      runCount:   null,   // on-chain run count (fetched asynchronously)
      logging:    false,  // true while waiting for contract confirmation
      logError:   null,   // error message if log_run failed
    },
  };

  return {
    get: () => _state,

    // ── Wallet ──────────────────────────────────────────────────────────────
    setWallet(publicKey, balance, walletType) {
      _state.wallet = { connected: true, publicKey, balance, walletType: walletType || null };
      try { localStorage.setItem(LS_WALLET_TYPE, JSON.stringify(walletType || null)); } catch (_) {}
    },

    setBalance(balance) {
      _state.wallet.balance = balance;
    },

    disconnectWallet() {
      _state.wallet = { connected: false, publicKey: null, balance: null, walletType: null };
      try { localStorage.removeItem(LS_WALLET_TYPE); } catch (_) {}
    },

    // ── Team ────────────────────────────────────────────────────────────────
    addMember(member) {
      const [color, colorBg] = CONFIG.AVATAR_COLORS[_colorIdx++ % CONFIG.AVATAR_COLORS.length];
      _state.team.push({ ...member, id: Date.now(), status: 'idle', txHash: null, color, colorBg });
      _saveTeam();
    },

    removeMember(id) {
      _state.team = _state.team.filter(m => m.id !== id);
      _saveTeam();
    },

    setMemberStatus(id, status, txHash = null) {
      const m = _state.team.find(m => m.id === id);
      if (m) { m.status = status; if (txHash) m.txHash = txHash; }
    },

    resetMemberStatuses() {
      _state.team.forEach(m => { m.status = 'idle'; m.txHash = null; });
    },

    // ── TX Log ──────────────────────────────────────────────────────────────
    addTxLogItem(item) {
      _state.txLog.push({ ...item, time: new Date().toLocaleTimeString() });
    },

    updateLastTxLogItem(update) {
      if (_state.txLog.length > 0) {
        Object.assign(_state.txLog[_state.txLog.length - 1], update);
      }
    },

    clearTxLog() { _state.txLog = []; },

    // ── Payroll ─────────────────────────────────────────────────────────────
    setPayrollRunning(val) { _state.payroll.running = val; },

    recordPayrollRun(results) {
      const total = results.filter(r => r.success).reduce((s, r) => s + r.amount, 0);
      _state.payroll.totalPaid += total;
      _state.payroll.runsCount++;
      _state.history.push({
        id:      Date.now(),
        date:    new Date().toLocaleString(),
        results,
        total,
        sender:  _state.wallet.publicKey,
        walletType: _state.wallet.walletType,
      });
      _saveHistory();
    },

    clearHistory() {
      _state.history = [];
      _saveHistory();
    },

    // ── Contract (Yellow Belt) ───────────────────────────────────────────────
    setContractLogging(val)      { _state.contract.logging    = val;  },
    setContractLastHash(hash)    { _state.contract.lastTxHash = hash; },
    setContractRunCount(count)   { _state.contract.runCount   = count; },
    setContractLogError(msg)     { _state.contract.logError   = msg;  },
    clearContractError()         { _state.contract.logError   = null; },
  };
})();
