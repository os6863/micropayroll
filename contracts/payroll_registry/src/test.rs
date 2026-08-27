#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_log_run_basic() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PayrollRegistry);
    let client = PayrollRegistryClient::new(&env, &contract_id);

    let sender = Address::generate(&env);

    // First run
    let run_id = client.log_run(&sender, &3u32, &300_000_0000i128);
    assert_eq!(run_id, 1u64);
    assert_eq!(client.get_run_count(), 1u64);

    // Retrieve and verify record
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

    // ID 99 was never logged
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

    // One event should have been emitted
    let events = env.events().all();
    assert_eq!(events.len(), 1);
}
