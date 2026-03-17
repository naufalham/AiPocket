#!/usr/bin/env python3
"""Deploy AiPocket contracts to Polkadot Hub Testnet using web3.py"""

import json
import os
import sys
import time

try:
    from web3 import Web3
    from eth_account import Account
except ImportError:
    print("Installing web3...")
    os.system("pip install web3 -q")
    from web3 import Web3
    from eth_account import Account

# ============ Config ============
RPC_URL = os.environ.get("POLKADOT_HUB_TESTNET_RPC_URL", "https://services.polkadothub-rpc.com/testnet")
PRIVATE_KEY = os.environ.get("PRIVATE_KEY", "")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "out")

if not PRIVATE_KEY:
    print("ERROR: PRIVATE_KEY not set")
    sys.exit(1)

w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = Account.from_key(PRIVATE_KEY)
deployer = account.address

print(f"Network:  {RPC_URL}")
print(f"Chain ID: {w3.eth.chain_id}")
print(f"Deployer: {deployer}")
print(f"Balance:  {w3.from_wei(w3.eth.get_balance(deployer), 'ether')} ETH\n")

def load_artifact(contract_name):
    path = os.path.join(OUT_DIR, f"{contract_name}.sol", f"{contract_name}.json")
    with open(path) as f:
        art = json.load(f)
    bytecode = art["bytecode"]["object"]
    abi = art["abi"]
    return bytecode, abi

def deploy(contract_name, *constructor_args):
    bytecode, abi = load_artifact(contract_name)
    contract = w3.eth.contract(abi=abi, bytecode=bytecode)

    nonce = w3.eth.get_transaction_count(deployer)
    gas_price = w3.eth.gas_price

    if constructor_args:
        tx = contract.constructor(*constructor_args).build_transaction({
            "from": deployer,
            "nonce": nonce,
            "gasPrice": gas_price,
            "gas": 3_000_000,
            "chainId": w3.eth.chain_id,
        })
    else:
        tx = contract.constructor().build_transaction({
            "from": deployer,
            "nonce": nonce,
            "gasPrice": gas_price,
            "gas": 3_000_000,
            "chainId": w3.eth.chain_id,
        })

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"  Deploying {contract_name}... tx: {tx_hash.hex()}")

    # Wait for receipt
    for _ in range(30):
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            if receipt:
                addr = receipt["contractAddress"]
                print(f"  ✓ {contract_name}: {addr}")
                return addr, abi
        except Exception:
            pass
        time.sleep(3)

    print(f"  ✗ {contract_name}: timeout waiting for receipt")
    sys.exit(1)

def call_fn(contract_addr, abi, fn_name, *args):
    contract = w3.eth.contract(address=contract_addr, abi=abi)
    nonce = w3.eth.get_transaction_count(deployer)
    gas_price = w3.eth.gas_price
    fn = getattr(contract.functions, fn_name)
    tx = fn(*args).build_transaction({
        "from": deployer,
        "nonce": nonce,
        "gasPrice": gas_price,
        "gas": 500_000,
        "chainId": w3.eth.chain_id,
    })
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"  {fn_name}()... tx: {tx_hash.hex()}")
    for _ in range(30):
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            if receipt:
                print(f"  ✓ {fn_name}() done")
                return
        except Exception:
            pass
        time.sleep(3)
    print(f"  ✗ {fn_name}() timeout")

# ============ Deploy sequence ============
print("=== Step 1: AgentIdentity (ERC-8004 / ERC-721) ===")
agent_identity_addr, agent_identity_abi = deploy("AgentIdentity")

print("\n=== Step 2: AgentReputation (ERC-8004) ===")
agent_reputation_addr, agent_reputation_abi = deploy("AgentReputation", agent_identity_addr)

print("\n=== Step 3: AgentRegistryV2 ===")
agent_registry_addr, agent_registry_abi = deploy("AgentRegistryV2",
    agent_identity_addr, agent_reputation_addr, deployer)

print("\n=== Step 4: PredictionMarket ===")
prediction_market_addr, prediction_market_abi = deploy("PredictionMarket",
    deployer, agent_registry_addr)

print("\n=== Step 5: Link contracts ===")
call_fn(agent_registry_addr, agent_registry_abi, "setPredictionMarket", prediction_market_addr)
call_fn(agent_reputation_addr, agent_reputation_abi, "setAuthorized", agent_registry_addr, True)

print("\n=== Step 6: RewardDistributor ===")
reward_distributor_addr, _ = deploy("RewardDistributor", agent_registry_addr)

print("\n=== Step 7: AutoSettler ===")
auto_settler_addr, _ = deploy("AutoSettler", prediction_market_addr)

# ============ Summary ============
summary = {
    "AGENT_IDENTITY_ADDRESS":     agent_identity_addr,
    "AGENT_REPUTATION_ADDRESS":   agent_reputation_addr,
    "AGENT_REGISTRY_ADDRESS":     agent_registry_addr,
    "PREDICTION_MARKET_ADDRESS":  prediction_market_addr,
    "REWARD_DISTRIBUTOR_ADDRESS": reward_distributor_addr,
    "AUTO_SETTLER_ADDRESS":       auto_settler_addr,
}

print("\n=== Deployment Summary (Polkadot Hub Testnet) ===")
for k, v in summary.items():
    print(f"{k}={v}")

# Write to .env.deployed
env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.deployed")
with open(env_path, "w") as f:
    for k, v in summary.items():
        f.write(f"{k}={v}\n")
print(f"\nAddresses saved to .env.deployed")
