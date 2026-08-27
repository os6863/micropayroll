/**
 * contract.js
 * Soroban smart contract integration — PayrollRegistry
 *
 * Yellow Belt addition: after each successful payroll run the dApp calls
 * `log_run` on the PayrollRegistry contract deployed on Stellar Testnet.
 * The contract emits a "payroll/logged" event, and this module can also
 * fetch recent events from Soroban RPC to populate the On-Chain Events tab.
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

    // Build raw transaction
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee:               StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(methodName, ...args))
      .setTimeout(60)
      .build();

    // Simulate to get resource fee + footprint
    const simResult = await server.simulateTransaction(tx);
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error('Contract simulation failed: ' + simResult.error);
    }

    // Assemble with simulation data
    const prepared = StellarSdk.SorobanRpc
      .assembleTransaction(tx, simResult)
      .build();

    // Sign via active wallet provider
    const signedXDR = await WalletProvider.sign(prepared.toXDR());
    const signedTx  = StellarSdk.TransactionBuilder.fromXDR(
      signedXDR,
      CONFIG.NETWORK_PASSPHRASE,
    );

    // Submit
    const sendResult = await server.sendTransaction(signedTx);
    if (sendResult.status === 'ERROR') {
      throw new Error('Contract submission failed: ' + JSON.stringify(sendResult.errorResult));
    }

    // Poll until confirmed (up to ~20 seconds)
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const status = await server.getTransaction(sendResult.hash);
      if (status.status === 'SUCCESS') return sendResult.hash;
      if (status.status === 'FAILED')  throw new Error('Contract transaction failed on-chain.');
    }
    throw new Error('Contract transaction confirmation timed out.');
  }

  /**
   * Log a payroll run to the on-chain registry.
   *
   * @param {number} recipientCount  Number of successful payments
   * @param {number} totalXLM        Total XLM distributed (decimal)
   * @returns {Promise<{hash:string}|null>}
   */
  async function logRun(recipientCount, totalXLM) {
    if (!_isConfigured()) return null;

    const { wallet } = State.get();

    // Convert XLM to stroops (i128)
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
   * Returns an array of event objects (newest first), or [] on error.
   */
  async function fetchEvents() {
    if (!_isConfigured()) return [];

    try {
      const server       = _getServer();
      const latestLedger = await server.getLatestLedger();
      // look back ~1 week worth of ledgers (5s avg) = 7*24*3600/5 ≈ 120 960
      const startLedger  = Math.max(0, latestLedger.sequence - 120000);

      const response = await server.getEvents({
        startLedger,
        filters: [{
          type:        'contract',
          contractIds: [CONFIG.CONTRACT_ID],
        }],
        limit: 50,
      });

      return (response.events || []).reverse(); // newest first
    } catch (err) {
      console.warn('[Contract.fetchEvents]', err);
      return [];
    }
  }

  /**
   * Read the total run count stored in the contract (read-only simulation).
   */
  async function getRunCount() {
    if (!_isConfigured()) return null;
    try {
      const server   = _getServer();
      const contract = new StellarSdk.Contract(CONFIG.CONTRACT_ID);
      const { wallet } = State.get();
      if (!wallet.publicKey) return null;

      const account = await server.getAccount(wallet.publicKey);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('get_run_count'))
        .setTimeout(60)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (StellarSdk.SorobanRpc.Api.isSimulationError(sim)) return null;
      if (!sim.result) return null;

      return StellarSdk.scValToNative(sim.result.retval);
    } catch (_) {
      return null;
    }
  }

  return { logRun, fetchEvents, getRunCount, isConfigured: _isConfigured };

})();
