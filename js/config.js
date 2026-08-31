/**
 * config.js
 * Global constants and network configuration — Yellow Belt v2.0
 */

const CONFIG = {
  // ── Stellar Network ──────────────────────────────────────────────────────
  HORIZON_URL:        'https://horizon-testnet.stellar.org',
  NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  EXPLORER_URL:       'https://stellar.expert/explorer/testnet',
  FRIENDBOT_URL:      'https://friendbot.stellar.org',

  // ── Soroban RPC (Yellow Belt) ────────────────────────────────────────────
  SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',

  /**
   * CONTRACT_ID — deploy the payroll_registry contract and paste the ID here.
   *
   * To deploy:
   *   stellar contract deploy \
   *     --wasm contracts/payroll_registry/target/wasm32-unknown-unknown/release/payroll_registry.wasm \
   *     --source-account <YOUR_SECRET> \
   *     --network testnet
   *
   * Leave as 'PLACEHOLDER' to run the dApp without on-chain event logging
   * (all wallet and payroll features still work; only the contract tab is disabled).
   */
  CONTRACT_ID: 'CBYELVJVGXMRHMHX4WSUVI2IDP4FAD4ZR2VQFG5A25FZCNDHYTHFXAUT',   // ← paste deployed contract ID here

  // ── Display ──────────────────────────────────────────────────────────────
  XLM_USD_RATE: 0.11, // mock display rate

  // ── Avatar palette: [text color, background] ─────────────────────────────
  AVATAR_COLORS: [
    ['#00d4ff', 'rgba(0,212,255,0.15)'],
    ['#7b61ff', 'rgba(123,97,255,0.15)'],
    ['#00e676', 'rgba(0,230,118,0.15)'],
    ['#ffab40', 'rgba(255,171,64,0.15)'],
    ['#ff5252', 'rgba(255,82,82,0.15)'],
    ['#40c4ff', 'rgba(64,196,255,0.15)'],
    ['#ea80fc', 'rgba(234,128,252,0.15)'],
    ['#69f0ae', 'rgba(105,240,174,0.15)'],
  ],
};
