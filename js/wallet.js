/**
 * wallet.js
 * Wallet orchestration — Yellow Belt v2.0
 *
 * Now delegates actual signing to WalletProvider (multi-wallet abstraction).
 * Opening the wallet selector is handled by UI.openModal('modal-wallet-select').
 */

const Wallet = (() => {

  /** Called when user clicks "Connect Wallet" — opens wallet selector modal. */
  function promptConnect() {
    const s = State.get();
    if (s.wallet.connected) {
      disconnect();
    } else {
      UI.openModal('modal-wallet-select');
    }
  }

  /** Called after user selects a wallet type in the selector modal. */
  async function connectWith(type) {
    UI.closeModal('modal-wallet-select');
    UI.toast('⏳', `Connecting via ${type === 'freighter' ? 'Freighter' : 'ALBEDO'}...`);

    try {
      const publicKey = await WalletProvider.connect(type);
      State.setWallet(publicKey, null, type);
      UI.renderAll();
      UI.toast('🔗', 'Loading balance...');
      await fetchBalance(publicKey);
      UI.renderAll();
      UI.toast('✅', `Wallet connected via ${WalletProvider.getLabel()}`);
    } catch (err) {
      console.error('[Wallet.connectWith]', err);
      const msg = err.message || String(err);
      if (msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('cancel')) {
        UI.toast('❌', 'Connection rejected. Please approve in the wallet popup.');
      } else {
        UI.toast('❌', msg.slice(0, 120));
      }
    }
  }

  function disconnect() {
    WalletProvider.disconnect();
    State.disconnectWallet();
    UI.renderAll();
    UI.toast('🔌', 'Wallet disconnected.');
  }

  async function fetchBalance(publicKey) {
    try {
      const server  = new StellarSdk.Horizon.Server(CONFIG.HORIZON_URL);
      const account = await server.loadAccount(publicKey);
      const native  = account.balances.find(b => b.asset_type === 'native');
      State.setBalance(native ? parseFloat(native.balance) : 0);
      UI.updateStats();
    } catch (err) {
      if (err?.response?.status === 404) {
        State.setBalance(0);
        UI.updateStats();
        UI.toast('⚠️', 'Account not funded. Click 🚰 Friendbot to get testnet XLM.');
      } else {
        console.error('[Wallet.fetchBalance]', err);
      }
    }
  }

  async function refresh() {
    const { wallet } = State.get();
    if (!wallet.publicKey) return;
    await fetchBalance(wallet.publicKey);
  }

  /**
   * Silent auto-reconnect on page load.
   * Only works for Freighter (extension stays unlocked between refreshes).
   */
  async function autoConnect() {
    // ALBEDO is popup-based and can't auto-reconnect — skip if user was using it
    const savedType = State.get().wallet.walletType;
    if (savedType === 'albedo') return;
    const pk = await WalletProvider.tryAutoConnect();
    if (!pk) return;
    State.setWallet(pk, null, 'freighter');
    UI.renderAll();
    await fetchBalance(pk);
    UI.renderAll();
  }

  return { promptConnect, connectWith, disconnect, fetchBalance, refresh, autoConnect };

})();
