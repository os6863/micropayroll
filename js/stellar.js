/**
 * stellar.js
 * Stellar SDK helpers — Yellow Belt v2.0
 *
 * Uses WalletProvider.sign() so Freighter and ALBEDO are both supported.
 */

const Stellar = (() => {

  function getServer() {
    return new StellarSdk.Horizon.Server(CONFIG.HORIZON_URL);
  }

  /**
   * Build, sign (via active wallet provider), and submit an XLM payment.
   * @param {string} destination  Recipient G... address
   * @param {number|string} amount  XLM amount
   * @returns {Promise<string>}   Transaction hash
   */
  async function sendPayment(destination, amount) {
    const { wallet } = State.get();
    if (!wallet.publicKey) throw new Error('Wallet not connected');

    const server  = getServer();
    const account = await server.loadAccount(wallet.publicKey);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee:               StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination,
          asset:  StellarSdk.Asset.native(),
          amount: parseFloat(amount).toFixed(7),
        })
      )
      .addMemo(StellarSdk.Memo.text('MicroPayroll'))
      .setTimeout(60)
      .build();

    // Sign via WalletProvider — works for both Freighter and ALBEDO
    const signedXDR = await WalletProvider.sign(tx.toXDR());

    if (!signedXDR || typeof signedXDR !== 'string') {
      throw new Error('Signing cancelled or rejected');
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXDR,
      CONFIG.NETWORK_PASSPHRASE,
    );

    const result = await server.submitTransaction(signedTx);
    return result.hash;
  }

  /** Extract a human-readable error from a Horizon submission error. */
  function extractError(err) {
    try {
      const codes = err.response?.data?.extras?.result_codes;
      if (codes?.operations?.length) return codes.operations.join(', ');
      if (codes?.transaction)        return codes.transaction;
    } catch (_) { /* ignore */ }
    return err.message || 'Unknown error';
  }

  return { sendPayment, extractError };

})();
