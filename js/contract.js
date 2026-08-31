/**
 * contract.js
 * Soroban smart contract integration — PayrollRegistry
 * Orange Belt v3.0 — getTotalDistributed, getLatestRun, fixed fetchEvents
 *
 * If CONFIG.CONTRACT_ID === 'PLACEHOLDER' every method is a graceful no-op.
 */

const Contract = (() => {

  function _isConfigured() {
    return CONFIG.CONTRACT_ID && CONFIG.CONTRACT_ID !== 'PLACEHOLDER';
  }

  function _getServer() {
    return new StellarSdk.SorobanRpc.Server(CONFIG.SOROBAN_RPC_URL, { allowHttp: false });
  }

  /**
   * Build → simulate → sign → submit a contract call transaction.
   * Returns the transaction hash on success.
   */
  async function _invoke(methodName, args) {
    const { wallet } = State.get();
    if (!wallet.publicKey) throw new Error('Wallet not connected');

    const server   = _getServer();
    const account  = await server.getAccount(wallet.publicKey);
    const contract = new StellarSdk.Contract(CONFIG.CONTRACT_ID);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee:               StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(methodName, ...args))
      .setTimeout(60)
      .build();

    const simResult = await server.simulateTransaction(tx);
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error('Contract simulation failed: ' + simResult.error);
    }

    const prepared = StellarSdk.SorobanRpc
      .assembleTransaction(tx, simResult)
      .build();

    const signedXDR = await WalletProvider.sign(prepared.toXDR());
    const signedTx  = StellarSdk.TransactionBuilder.fromXDR(
      signedXDR,
      CONFIG.NETWORK_PASSPHRASE,
    );

    const sendResult = await server.sendTransaction(signedTx);
    if (sendResult.status === 'ERROR') {
      throw new Error('Contract submission failed: ' + JSON.stringify(sendResult.errorResult));
    }

    // Poll via Horizon for confirmation
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const resp = await fetch(
          `https://horizon-testnet.stellar.org/transactions/${sendResult.hash}`
        );
        if (resp.status === 200) {
          const txData = await resp.json();
          if (txData.successful === true)  return sendResult.hash;
          if (txData.successful === false) throw new Error('Contract transaction failed on-chain.');
        }
      } catch (err) {
        if (err.message && err.message.includes('failed on-chain')) throw err;
      }
    }
    throw new Error('Contract transaction confirmation timed out.');
  }

  /**
   * Read-only simulation call — no signing required.
   * Returns the scVal result or null on failure.
   */
  async function _readOnly(methodName, args = []) {
    if (!_isConfigured()) return null;
    try {
      const server   = _getServer();
      const { wallet } = State.get();
      if (!wallet.publicKey) return null;

      const contract = new StellarSdk.Contract(CONFIG.CONTRACT_ID);
      const account  = await server.getAccount(wallet.publicKey);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(methodName, ...args))
        .setTimeout(60)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (StellarSdk.SorobanRpc.Api.isSimulationError(sim)) return null;
      if (!sim.result) return null;

      return StellarSdk.scValToNative(sim.result.retval);
    } catch (err) {
      console.warn(`[Contract._readOnly(${methodName})]`, err);
      return null;
    }
  }

  /**
   * Log a payroll run to the on-chain registry.
   */
  async function logRun(recipientCount, totalXLM) {
    if (!_isConfigured()) return null;

    const { wallet } = State.get();
    const totalStroops = BigInt(Math.round(totalXLM * 10_000_000));

    const args = [
      StellarSdk.nativeToScVal(wallet.publicKey, { type: 'address' }),
      StellarSdk.nativeToScVal(recipientCount,   { type: 'u32'     }),
      StellarSdk.nativeToScVal(totalStroops,      { type: 'i128'    }),
    ];

    const hash = await _invoke('log_run', args);
    return { hash };
  }

  /**
   * Fetch recent "payroll/logged" events from Soroban RPC.
   * FIX (Orange Belt): startLedger must be a NUMBER (not String),
   * and range must be ≤ 4096 ledgers to stay within RPC limits.
   */
  async function fetchEvents() {
    if (!_isConfigured()) return [];

    try {
      // Step 1: get latest ledger sequence
      const rpcResp = await fetch(CONFIG.SOROBAN_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'getLatestLedger', params: {},
        }),
      });
      const rpcData  = await rpcResp.json();
      const latestSeq = (rpcData.result && rpcData.result.sequence)
        ? rpcData.result.sequence : 0;

      // Use 500-ledger window — safe within RPC's allowed range
      const startLedger = Math.max(1, latestSeq - 500);  // NUMBER, not String

      const evResp = await fetch(CONFIG.SOROBAN_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 2,
          method: 'getEvents',
          params: {
            startLedger,                                 // ← must be a number
            filters: [{ type: 'contract', contractIds: [CONFIG.CONTRACT_ID] }],
            pagination: { limit: 50 },
          },
        }),
      });
      const evData = await evResp.json();
      if (evData.error) {
        console.warn('[Contract.fetchEvents] RPC error:', evData.error.message);
        return [];
      }
      const events = (evData.result && evData.result.events) ? evData.result.events : [];
      return events.reverse(); // newest first
    } catch (err) {
      console.warn('[Contract.fetchEvents]', err);
      return [];
    }
  }

  /**
   * Read-only: total run count stored in the contract.
   */
  async function getRunCount() {
    const val = await _readOnly('get_run_count');
    return val !== null ? Number(val) : null;
  }

  /**
   * Read-only: cumulative stroops distributed across all runs.
   * Returns the value in XLM (number) for display, or null.
   * Orange Belt — new function.
   */
  async function getTotalDistributed() {
    const val = await _readOnly('get_total_distributed');
    if (val === null || val === undefined) return null;
    // val is i128 in stroops (BigInt or number depending on SDK version)
    const stroops = typeof val === 'bigint' ? val : BigInt(val);
    return Number(stroops) / 10_000_000; // convert to XLM
  }

  /**
   * Read-only: details of the most recent payroll run recorded on-chain.
   * Returns a plain object { sender, recipientCount, totalXLM, timestamp } or null.
   * Orange Belt — new function.
   */
  async function getLatestRun() {
    const val = await _readOnly('get_latest_run');
    if (!val) return null;
    // scValToNative converts RunRecord to a plain JS object
    return {
      sender:         val.sender,
      recipientCount: Number(val.recipient_count),
      totalXLM:       Number(typeof val.total_stroops === 'bigint' ? val.total_stroops : BigInt(val.total_stroops)) / 10_000_000,
      timestamp:      Number(val.timestamp),
    };
  }

  return {
    logRun,
    fetchEvents,
    getRunCount,
    getTotalDistributed,
    getLatestRun,
    isConfigured: _isConfigured,
  };

})();
