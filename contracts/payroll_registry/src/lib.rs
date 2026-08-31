//! payroll_registry — Stellar Soroban Smart Contract
//!
//! Stores payroll run metadata on-chain, emits an event for each run,
//! and exposes read helpers for cumulative stats and latest run.
//! Part of MicroPayroll — Orange Belt (Stellar Journey to Mastery)

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    symbol_short, Address, Env, Symbol,
};

// ── Storage types ────────────────────────────────────────────────────────────

/// Per-run record stored in contract instance storage
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RunRecord {
    /// The address that triggered (and authorized) the payroll run
    pub sender: Address,
    /// Number of recipients in this run
    pub recipient_count: u32,
    /// Total XLM distributed, expressed in stroops (1 XLM = 10_000_000 stroops)
    pub total_stroops: i128,
    /// Ledger timestamp at the time of this run
    pub timestamp: u64,
}

/// Storage key enum — keeps keys strongly typed and collision-free
#[contracttype]
pub enum DataKey {
    /// u64 — total number of runs logged
    RunCount,
    /// RunRecord — keyed by run ID (1-based)
    Run(u64),
    /// i128 — cumulative stroops distributed across all runs
    TotalDistributed,
}

// ── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct PayrollRegistry;

#[contractimpl]
impl PayrollRegistry {
    /// Log a completed payroll run on-chain.
    ///
    /// Requires authorization from `sender`.
    /// Stores the run record, increments the run counter, accumulates the
    /// total distributed, and emits a `("payroll", "logged")` event so
    /// off-chain listeners (the dApp) can pick it up via Soroban RPC `getEvents`.
    ///
    /// Returns the new run ID (1-based, monotonically increasing).
    pub fn log_run(
        env: Env,
        sender: Address,
        recipient_count: u32,
        total_stroops: i128,
    ) -> u64 {
        // Require the caller to authorize this call
        sender.require_auth();

        // Read current run count (0 if first call)
        let run_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::RunCount)
            .unwrap_or(0u64);

        let new_id = run_count + 1u64;

        // Build and persist the run record
        let record = RunRecord {
            sender: sender.clone(),
            recipient_count,
            total_stroops,
            timestamp: env.ledger().timestamp(),
        };
        env.storage().instance().set(&DataKey::Run(new_id), &record);
        env.storage().instance().set(&DataKey::RunCount, &new_id);

        // Accumulate total distributed stroops
        let prev_total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0i128);
        env.storage()
            .instance()
            .set(&DataKey::TotalDistributed, &(prev_total + total_stroops));

        // Extend instance TTL so the data stays accessible (~100 days on testnet)
        env.storage()
            .instance()
            .extend_ttl(518400, 518400);

        // Emit event — topic: (Symbol"payroll", Symbol"logged")
        // Data payload: (run_id, sender, recipient_count, total_stroops)
        env.events().publish(
            (symbol_short!("payroll"), symbol_short!("logged")),
            (new_id, sender, recipient_count, total_stroops),
        );

        new_id
    }

    /// Return the total number of payroll runs logged.
    pub fn get_run_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::RunCount)
            .unwrap_or(0u64)
    }

    /// Retrieve a specific payroll run record by its ID (1-based).
    /// Returns None if the ID does not exist.
    pub fn get_run(env: Env, run_id: u64) -> Option<RunRecord> {
        env.storage().instance().get(&DataKey::Run(run_id))
    }

    /// Return the cumulative total XLM distributed across all runs (in stroops).
    /// 1 XLM = 10_000_000 stroops.
    pub fn get_total_distributed(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0i128)
    }

    /// Return the most recent payroll run record, or None if no runs have been logged.
    pub fn get_latest_run(env: Env) -> Option<RunRecord> {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::RunCount)
            .unwrap_or(0u64);
        if count == 0 {
            return None;
        }
        env.storage().instance().get(&DataKey::Run(count))
    }
}
