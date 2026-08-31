#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

// ── Core functionality ────────────────────────────────────────────────────────

#[test]
fn test_log_run_basic() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PayrollRegistry);
    let client = PayrollRegistryClient::new(&env, &contract_id);
    let sender = Address::generate(&env);

    let run_id = client.log_run(&sender, &3u32, &300_000_0000i128);
    assert_eq!(run_id, 1u64);
    assert_eq!(client.get_run_count(), 1u64);

    let record = client.get_run(&run_id).expect("run not found");
    assert_eq!(record.sender, sender);
    assert_eq!(record.recipient_count, 3u32);
    assert_eq!(record.total_stroops, 300_000_0000i128);
}

#[test]
fn test_run_count_increments() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PayrollRegistry);
    let client = PayrollRegistryClient::new(&env, &contract_id);
    let sender = Address::generate(&env);

    assert_eq!(client.get_run_count(), 0u64);
    client.log_run(&sender, &2u32, &100_000_0000i128);
    client.log_run(&sender, &4u32, &200_000_0000i128);
    client.log_run(&sender, &1u32, &50_000_0000i128);
    assert_eq!(client.get_run_count(), 3u64);
}

#[test]
fn test_get_run_missing() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PayrollRegistry);
    let client = PayrollRegistryClient::new(&env, &contract_id);
    assert!(client.get_run(&99u64).is_none());
}

#[test]
fn test_event_emitted() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PayrollRegistry);
    let client = PayrollRegistryClient::new(&env, &contract_id);
    let sender = Address::generate(&env);

    client.log_run(&sender, &5u32, &500_000_0000i128);
    let events = env.events().all();
    assert_eq!(events.len(), 1);
}

// ── Sequential IDs ────────────────────────────────────────────────────────────

#[test]
fn test_sequential_run_ids() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PayrollRegistry);
    let client = PayrollRegistryClient::new(&env, &contract_id);
    let sender = Address::generate(&env);

    for expected_id in 1u64..=5 {
        let id = client.log_run(&sender, &1u32, &10_000_0000i128);
        assert_eq!(id, expected_id, "Run ID should be sequential");
    }
    assert_eq!(client.get_run_count(), 5u64);
}

// ── Authorization ─────────────────────────────────────────────────────────────

#[test]
fn test_auth_required() {
    let env = Env::default();
    // Do NOT mock auth — auth enforcement must run
    let contract_id = env.register_contract(None, PayrollRegistry);
    let client = PayrollRegistryClient::new(&env, &contract_id);
    let sender = Address::generate(&env);

    // Without auth, log_run must fail
    let result = client.try_log_run(&sender, &1u32, &10_000_0000i128);
    assert!(result.is_err(), "log_run must require sender authorization");
}

// ── Total distributed ─────────────────────────────────────────────────────────

#[test]
fn test_total_distributed_accumulates() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PayrollRegistry);
    let client = PayrollRegistryClient::new(&env, &contract_id);
    let sender = Address::generate(&env);

    // Starts at zero
    assert_eq!(client.get_total_distributed(), 0i128);

    client.log_run(&sender, &2u32, &100_000_0000i128);
    assert_eq!(client.get_total_distributed(), 100_000_0000i128);

    client.log_run(&sender, &3u32, &250_000_0000i128);
    assert_eq!(client.get_total_distributed(), 350_000_0000i128);

    client.log_run(&sender, &1u32, &50_000_0000i128);
    assert_eq!(client.get_total_distributed(), 400_000_0000i128);
}

// ── Latest run ────────────────────────────────────────────────────────────────

#[test]
fn test_get_latest_run() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PayrollRegistry);
    let client = PayrollRegistryClient::new(&env, &contract_id);

    // No runs yet → None
    assert!(client.get_latest_run().is_none());

    let sender = Address::generate(&env);
    client.log_run(&sender, &2u32, &100_000_0000i128);
    client.log_run(&sender, &4u32, &200_000_0000i128);

    let latest = client.get_latest_run().expect("should have latest run");
    assert_eq!(latest.recipient_count, 4u32);
    assert_eq!(latest.total_stroops, 200_000_0000i128);
}

// ── Multiple senders ──────────────────────────────────────────────────────────

#[test]
fn test_multiple_senders() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PayrollRegistry);
    let client = PayrollRegistryClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob   = Address::generate(&env);

    let id_a = client.log_run(&alice, &3u32, &150_000_0000i128);
    let id_b = client.log_run(&bob,   &2u32, &80_000_0000i128);

    assert_eq!(id_a, 1u64);
    assert_eq!(id_b, 2u64);

    let rec_a = client.get_run(&id_a).unwrap();
    let rec_b = client.get_run(&id_b).unwrap();
    assert_eq!(rec_a.sender, alice);
    assert_eq!(rec_b.sender, bob);

    // Total distributed from both senders
    assert_eq!(client.get_total_distributed(), 230_000_0000i128);
}
