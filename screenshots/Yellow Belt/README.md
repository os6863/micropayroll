# MicroPayroll — Yellow Belt Screenshots

Screenshots documenting all Yellow Belt requirements on Stellar Testnet.

## Required Screenshots

| File | What it shows |
|------|---------------|
| `01-dashboard-connected-albedo.png` | Dashboard with ALBEDO wallet connected — 10,000 XLM treasury, PayrollRegistry contract ready |
| `02-team-roster-alice-bob.png` | Team Roster with Alice (Designer) and Bob (Marketing), each 10 XLM |
| `03-albedo-sign-transaction.png` | ALBEDO popup signing the payroll transaction on Testnet |
| `04-payroll-sending-in-progress.png` | Payroll in progress — Alice ✓ Sent, Bob sending (2/2, 50%) |
| `05-session-history-payroll-run.png` | Session History showing payroll run logged |
| `06-dashboard-logged-on-chain.png` | Dashboard: "Logged on PayrollRegistry · Run #3 on-chain" — 5 payroll runs, 60 XLM total |
| `07-on-chain-events-6-logged.png` | On-Chain Events tab showing 6 `payroll / logged` events from Soroban contract |

## Yellow Belt Requirements Status

| Requirement | Screenshot |
|---|---|
| Multi-wallet support (Freighter + ALBEDO) ✅ | 01, 03 |
| Soroban smart contract deployed (PayrollRegistry) ✅ | 01, 06 |
| `log_run()` called on-chain after each payroll ✅ | 06 |
| On-Chain Events tab displays contract events ✅ | 07 |
| Events fetched via Soroban RPC (`getEvents`) ✅ | 07 |
| Multi-recipient payroll (Alice + Bob) ✅ | 02, 04 |
| Deployed public dApp ✅ | https://micropayroll-git-main-jakub-0bc9.vercel.app |

## Contract Details

| Field | Value |
|---|---|
| Network | Stellar Testnet |
| Contract ID | `CA7NSKWWMO7QBXPYEIP34HEFPJ46SNJJMPHJZ4NJJ6PQHULMCYBHVLRJ` |
| Events shown | `payroll / logged` (6 events across ledgers 4365556–4366008) |
