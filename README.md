# ⚡ MicroPayroll — On-Chain Payroll on Stellar

[![Stellar Testnet](https://img.shields.io/badge/Stellar-Testnet-00d4ff?logo=stellar)](https://stellar.org)
[![Orange Belt 🟠](https://img.shields.io/badge/Stellar%20Journey-Orange%20Belt%20%F0%9F%9F%A0-orange)](https://risein.com)
[![CI Tests](https://github.com/os6863/micropayroll/actions/workflows/test.yml/badge.svg)](https://github.com/os6863/micropayroll/actions/workflows/test.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel)](https://micropayroll-git-main-jakub-0bc9.vercel.app)

> Distribute salaries to your entire team in seconds — fully on-chain on **Stellar Testnet**, powered by a Soroban smart contract.

---

## 🟠 Orange Belt — Level 3

| Requirement | Status |
|---|---|
| Advanced Soroban contract (`TotalDistributed`, `get_latest_run`) | ✅ |
| 8 unit tests (auth, accumulation, multiple senders, latest run) | ✅ |
| CI/CD pipeline — GitHub Actions runs `cargo test` on every push | ✅ |
| Mobile responsive UI (hamburger menu, adaptive grid) | ✅ |
| Error handling — RPC errors caught, startLedger range fix | ✅ |
| `getTotalDistributed()` + `getLatestRun()` in frontend | ✅ |
| On-Chain Total Distributed stat card on dashboard | ✅ |
| Multi-wallet support (Freighter + ALBEDO) | ✅ |
| Production Vercel deployment | ✅ |
| 10+ meaningful commits | ✅ |

---

## 🚀 Live Demo

🌐 **[micropayroll-git-main-jakub-0bc9.vercel.app](https://micropayroll-git-main-jakub-0bc9.vercel.app)**

---

## 🏗️ Architecture

```
MicroPayroll
├── contracts/payroll_registry/   ← Soroban smart contract (Rust)
│   └── src/
│       ├── lib.rs                ← log_run, get_total_distributed, get_latest_run
│       └── test.rs               ← 8 unit tests
├── css/main.css                  ← Styles + mobile responsive (Orange Belt)
├── js/
│   ├── config.js                 ← CONTRACT_ID, network config
│   ├── contract.js               ← Soroban RPC integration (Orange Belt)
│   ├── wallet.js + wallet-provider.js  ← Freighter + ALBEDO
│   ├── payroll.js                ← Payroll distribution logic
│   ├── ui.js                     ← DOM rendering
│   └── main.js                   ← App entry point + sidebar toggle
├── .github/workflows/test.yml    ← CI/CD (Orange Belt)
└── index.html                    ← Single-page app shell
```

---

## 📦 Contract: PayrollRegistry

**Contract ID:** `CBYELVJVGXMRHMHX4WSUVI2IDP4FAD4ZR2VQFG5A25FZCNDHYTHFXAUT`
_(Update after Orange Belt redeploy)_

**Network:** Stellar Testnet

| Function | Description |
|---|---|
| `log_run(sender, recipient_count, total_stroops)` | Records a payroll run, accumulates total distributed |
| `get_run_count()` | Returns total number of runs |
| `get_run(run_id)` | Returns a specific run's `RunRecord` |
| `get_total_distributed()` | Returns cumulative stroops paid across all runs (Orange Belt) |
| `get_latest_run()` | Returns the most recent `RunRecord` (Orange Belt) |

---

## 🧪 Tests (8 passing)

```bash
cd contracts/payroll_registry
cargo test
```

| Test | What it verifies |
|---|---|
| `test_log_run_basic` | First run returns ID 1 |
| `test_run_count_increments` | Count goes 0 → 1 → 2 |
| `test_get_run_retrieves_data` | Stored fields match inputs |
| `test_no_run_returns_none` | Non-existent run_id → None |
| `test_sequential_run_ids` | IDs are sequential: 1, 2, 3 |
| `test_auth_required` | `try_log_run` without mock auth → Err |
| `test_total_distributed_accumulates` | 0 → 100M → 350M → 400M stroops |
| `test_get_latest_run` | None when empty; correct fields after run |

---

## ⚙️ Build & Deploy Contract

```powershell
# 1. Build WASM
cd contracts\payroll_registry
cargo build --target wasm32-unknown-unknown --release

# 2. Deploy to Testnet
stellar contract deploy `
  --wasm target\wasm32-unknown-unknown\release\payroll_registry.wasm `
  --source-account YOUR_SECRET_KEY `
  --network testnet

# 3. Paste the new CONTRACT_ID into js/config.js
```

---

## 🔄 CI/CD Pipeline

Every push to `main` triggers GitHub Actions:
1. Installs Rust stable + `wasm32-unknown-unknown` target
2. Runs `cargo test --verbose` — all 8 tests must pass
3. Builds the WASM release artifact
4. Uploads WASM as a downloadable artifact

[![CI Tests](https://github.com/os6863/micropayroll/actions/workflows/test.yml/badge.svg)](https://github.com/os6863/micropayroll/actions/workflows/test.yml)

---

## 📱 Mobile Responsive

- Hamburger menu opens sidebar on mobile (≤ 900px)
- Stats grid adapts: 4-col → 2-col → 1-col
- Wallet address column hidden on small screens
- Full touch-friendly modals and buttons

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Stellar Testnet |
| Smart Contract | Soroban / Rust SDK v21 |
| Frontend | Vanilla JS, HTML5, CSS3 |
| Wallets | Freighter (extension) · ALBEDO (web) |
| RPC | soroban-testnet.stellar.org |
| CI/CD | GitHub Actions |
| Hosting | Vercel |

---

## 📸 Screenshots

### Dashboard (Desktop)
![Dashboard](screenshots/dashboard-desktop.png)

### Mobile View
![Mobile](screenshots/mobile-responsive.png)

### CI/CD Pipeline
![CI](screenshots/cicd-pipeline.png)

### On-Chain Events
![Events](screenshots/onchain-events.png)

---

## Journey Progress

| Level | Status |
|---|---|
| ⚪ White Belt — Stellar basics | ✅ |
| 🟡 Yellow Belt — Multi-wallet dApp + Soroban contract | ✅ |
| 🟠 Orange Belt — Advanced contract + CI/CD + Mobile | ✅ Submitted |
