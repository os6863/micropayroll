/**
 * wallet-provider.js
 * Multi-wallet abstraction layer — Freighter + ALBEDO
 *
 * Yellow Belt addition: previously the app only supported Freighter.
 * This module adds ALBEDO (web-based, no extension required) and provides
 * a unified interface so the rest of the app doesn't care which wallet is active.
 *
 * Public API:
 *   WalletProvider.connect(type)  → Promise<string>  publicKey
 *   WalletProvider.sign(xdr)      → Promise<string>  signedXDR
 *   WalletProvider.getType()      → 'freighter' | 'albedo' | null
 *   WalletProvider.getLabel()     → string  human-readable name
 *   WalletProvider.disconnect()
 */

const WalletProvider = (() => {

  let _type = null; // 'freighter' | 'albedo'

  // ── Freighter ─────────────────────────────────────────────────────────────

  async function _resolveFreighter(ms = 5000) {
    if (typeof freighterApi !== 'undefined') return freighterApi;
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + ms;
      const tick = setInterval(() => {
        if (typeof freighterApi !== 'undefined') {
          clearInterval(tick);
          resolve(freighterApi);
        } else if (Date.now() >= deadline) {
          clearInterval(tick);
          reject(new Error('Freighter extension not detected. Install it at freighter.app.'));
        }
      }, 150);
    });
  }

  async function _connectFreighter() {
    const api = await _resolveFreighter(5000);
    const connected = await api.isConnected();
    if (!connected) {
      throw new Error('Freighter is locked. Unlock it and try again.');
    }
    const publicKey = await api.getPublicKey();
    if (!publicKey || publicKey.startsWith('Error')) {
      throw new Error('Could not get public key from Freighter. Approve the connection popup.');
    }
    return publicKey;
  }

  async function _signFreighter(xdr) {
    const api = await _resolveFreighter(3000);
    const signed = await api.signTransaction(xdr, CONFIG.NETWORK_PASSPHRASE);
    if (!signed || typeof signed !== 'string' || signed.startsWith('Error')) {
      throw new Error(signed || 'Transaction signing was cancelled or rejected in Freighter.');
    }
    return signed;
  }

  // ── ALBEDO ────────────────────────────────────────────────────────────────

  function _resolveAlbedo() {
    if (typeof window !== 'undefined' && window.albedo) return window.albedo;
    throw new Error('ALBEDO not loaded. Check your internet connection and refresh.');
  }

  async function _connectAlbedo() {
    const alb = _resolveAlbedo();
    const result = await alb.publicKey({
      token: Math.random().toString(36).slice(2), // anti-replay nonce
    });
    if (!result || !result.pubkey) {
      throw new Error('ALBEDO did not return a public key. Please approve the popup.');
    }
    return result.pubkey;
  }

  async function _signAlbedo(xdr) {
    const alb = _resolveAlbedo();
    const result = await alb.tx({
      xdr,
      network: 'TESTNET',
      submit: false,
    });
    if (!result || !result.signed_envelope_xdr) {
      throw new Error('ALBEDO did not return a signed transaction. Was the popup cancelled?');
    }
    return result.signed_envelope_xdr;
  }

  // ── Freighter auto-detect for reconnect ───────────────────────────────────

  async function _autoDetectFreighter() {
    try {
      const api = await _resolveFreighter(3000);
      const connected = await api.isConnected();
      if (!connected) return null;
      const pk = await api.getPublicKey();
      if (!pk || pk.startsWith('Error')) return null;
      return pk;
    } catch (_) {
      return null;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async function connect(type) {
    let publicKey;
    if (type === 'freighter') {
      publicKey = await _connectFreighter();
    } else if (type === 'albedo') {
      publicKey = await _connectAlbedo();
    } else {
      throw new Error('Unknown wallet type: ' + type);
    }
    _type = type;
    return publicKey;
  }

  async function sign(xdr) {
    if (_type === 'freighter') return _signFreighter(xdr);
    if (_type === 'albedo')    return _signAlbedo(xdr);
    throw new Error('No wallet connected.');
  }

  function getType() { return _type; }

  function getLabel() {
    if (_type === 'freighter') return '🦊 Freighter';
    if (_type === 'albedo')    return '🔷 ALBEDO';
    return null;
  }

  function disconnect() { _type = null; }

  /** Attempt silent reconnect via Freighter (survives page refresh). */
  async function tryAutoConnect() {
    const pk = await _autoDetectFreighter();
    if (pk) { _type = 'freighter'; }
    return pk;
  }

  return { connect, sign, getType, getLabel, disconnect, tryAutoConnect };

})();
