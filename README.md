# ⚡ MicroPayroll — On-Chain Payroll on Stellar

> Distribute team salaries in seconds with full on-chain transparency, powered by Stellar Testnet.

![Stellar](https://img.shields.io/badge/Stellar-Testnet-00d4ff?style=flat-square&logo=stellar)
![Belt](https://img.shields.io/badge/Belt-Yellow%20🟡-f5c518?style=flat-square)
![Contract](https://img.shields.io/badge/Contract-Soroban-7b61ff?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-7b61ff?style=flat-square)

---

## 🧠 The Problem

Every month, founders manually send individual payments to each team member — tedious,
error-prone, and leaves zero on-chain proof. Traditional payroll is slow, expensive, and opaque.

## 💡 The Solution

MicroPayroll is a **one-click payroll dashboard** on Stellar. Add your team, set amounts,
hit **Run Payroll** — every payment goes out as a verifiable on-chain transaction,
and the run is permanently logged in a Soroban smart contract.

No bank. No middleman. Full transparency — on every layer.

---

## ✅ Yellow Belt Requirements

| Requirement | Status |
|---|---|
| Multi-wallet: Freighter (extension) | ✅ |
| Multi-wallet: ALBEDO (web-based) | ✅ |
| Wallet selector UI | ✅ |
| Write Soroban smart contract (`payroll_registry`) | ✅ |
| Contract: `log_run` function with authorization | ✅ |
| Contract: emits `payroll/logged` event | ✅ |
| Contract: `get_run_count` & `get_run` read functions | ✅ |
| Contract tests (`src/test.rs`) | ✅ |
| Frontend calls `log_run` after each payroll | ✅ |
| On-Chain Events tab (fetches events via Soroban RPC) | ✅ |
| Contract status panel in Dashboard | ✅ |
| Deployed public dApp | ✅ |

### ⚪️ White Belt Requirements (carried forward)

| Requirement | Status |
|---|---|
| Freighter wallet connect / disconnect | ✅ |
| Fetch & display XLM balance | ✅ |
| Send XLM transaction on Testnet | ✅ |
| Show success / failure state | ✅ |
| Show transaction hash | ✅ (linked to Stellar Expert) |

---

## 🚀 What's New in Yellow Belt

### 🔑 Multi-Wallet Support
The app now supports **two wallet providers**:
- **🦊 Freighter** — the Stellar browser extension (`freighter.app`)
- **🔷 ALBEDO** — a web-based signer, no extension required (`albedo.link`)

A wallet selector modal appears at connect time. The active wallet type is shown
in the top bar. All transaction signing is routed through the `WalletProvider`
abstraction layer (`js/wallet-provider.js`), so adding more wallets later is trivial.

### 📜 PayrollRegistry Soroban Contract
A Soroban smart contract (`contracts/payroll_registry/`) written in Rust that:

- **`log_run(sender, recipient_count, total_stroops)`** — Requires sender authorization,
  stores the run record on-chain, increments the run counter, and emits a
  `("payroll", "logged")` event that any listener can pick up.
- **`get_run_count()`** — Returns the total number of payroll runs ever logged.
- **`get_run(run_id)`** — Returns the full `RunRecord` for a given run ID.

Each run record stores: `sender`, `recipient_count`, `total_stroops`, `timestamp`.

### 📡 On-Chain Events Tab
The History page has a new **On-Chain Events** tab that queries the Soroban RPC
(`soroban-testnet.stellar.org`) for `payroll/logged` events emitted by the deployed
contract. Every run is permanently verifiable on Stellar Testnet.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Stellar Testnet (Horizon API + Soroban RPC) |
| Smart Contract | Soroban (Rust) — `payroll_registry` |
| Wallets | Freighter v1 + ALBEDO |
| SDK | `@stellar/stellar-sdk` v12 |
| Frontend | Vanilla HTML + CSS + JS (no build step) |
| Explorer | Stellar Expert |
| Deploy | Netlify |

---

## 📁 Project Structure

```
micropayroll/
├── index.html                    # App shell & markup
├── css/
│   └── main.css                  # Full stylesheet (incl. Yellow Belt additions)
├── js/
│   ├── config.js                 # Network config, Soroban RPC, contract ID
│   ├── state.js                  # Centralized app state
│   ├── ui.js                     # DOM rendering & UI helpers
│   ├── wallet-provider.js        # ★ Multi-wallet abstraction (Freighter + ALBEDO)
│   ├── wallet.js                 # Wallet orchestration
│   ├── stellar.js                # Horizon payments (uses WalletProvider)
│   ├── contract.js               # ★ Soroban contract interaction
│   ├── payroll.js                # Payroll engine (calls contract after run)
│   └── main.js                   # Init & event handlers
├── contracts/
│   └── payroll_registry/         # ★ Soroban smart contract (Rust)
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs            # Contract implementation
│           └── test.rs           # Unit tests
├── netlify.toml
└── README.md
```

★ = new in Yellow Belt

---

## 🔧 Deploy the Smart Contract

### Prerequisites
```bash
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli --features opt
```

### Build
```bash
cd contracts/payroll_registry
cargo build --target wasm32-unknown-unknown --release
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/payroll_registry.wasm
```

### Run Tests
```bash
cargo test
```

### Deploy to Testnet
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payroll_registry.optimized.wasm \
  --source-account YOUR_SECRET_KEY \
  --network testnet
# → Copy the returned contract ID
```

### Configure the Frontend
Open `js/config.js` and replace `'PLACEHOLDER'` with your deployed contract ID:
```js
CONTRACT_ID: 'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
```

---

## 🏃 Running Locally

1. Install [Freighter](https://www.freighter.app/) (optional — ALBEDO works without it)
2. Switch Freighter to **Testnet** mode (if using Freighter)
3. Clone and open:
   ```bash
   git clone https://github.com/YOUR_USERNAME/micropayroll
   cd micropayroll
   open index.html   # or use Live Server in VS Code
   ```
4. Connect wallet (Freighter or ALBEDO) → click **Friendbot** → add team → Run Payroll 🚀

---

## 🌐 Deploy to Netlify

1. Push to GitHub
2. Netlify → New site → Import from Git
3. Build command: *(leave empty)*
4. Publish directory: `.`
5. Deploy ✅

---

## 🔮 Roadmap (Orange Belt & Beyond)

- [ ] Multi-sig payroll approval (contract governance)
- [ ] USDC stablecoin support via Stellar Anchors
- [ ] Recurring / scheduled payroll
- [ ] CSV team import
- [ ] Milestone-based escrow payments
- [ ] Full test suite with Soroban test utilities
- [ ] Contract upgrade path

---

## 📜 License

MIT — Built for the Stellar Journey to Mastery hackathon.
