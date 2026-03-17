// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentIdentity.sol";
import "../src/AgentReputation.sol";
import "../src/AgentRegistryV2.sol";
import "../src/PredictionMarket.sol";
import "../src/RewardDistributor.sol";
import "../src/AutoSettler.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ERC-8004 Identity Registry (ERC-721)
        AgentIdentity agentIdentity = new AgentIdentity();
        console.log("AgentIdentity (ERC-8004) deployed at:", address(agentIdentity));

        // 2. Deploy ERC-8004 Reputation Registry
        AgentReputation agentReputation = new AgentReputation(address(agentIdentity));
        console.log("AgentReputation (ERC-8004) deployed at:", address(agentReputation));

        // 3. Deploy AgentRegistryV2 (IAgentRegistry bridge)
        // Forwarder = deployer (can be updated later via setCreForwarder)
        AgentRegistryV2 agentRegistryV2 = new AgentRegistryV2(
            address(agentIdentity),
            address(agentReputation),
            deployer
        );
        console.log("AgentRegistryV2 deployed at:", address(agentRegistryV2));

        // 4. Deploy PredictionMarket
        // Forwarder = deployer (off-chain AI bot calls onReport directly)
        PredictionMarket predictionMarket = new PredictionMarket(
            deployer,
            address(agentRegistryV2)
        );
        console.log("PredictionMarket deployed at:", address(predictionMarket));

        // 5. Link contracts
        agentRegistryV2.setPredictionMarket(address(predictionMarket));
        agentReputation.setAuthorized(address(agentRegistryV2), true);
        console.log("AgentRegistryV2 linked to PredictionMarket");
        console.log("AgentReputation authorized AgentRegistryV2");

        // 6. Deploy RewardDistributor
        RewardDistributor rewardDistributor = new RewardDistributor(
            address(agentRegistryV2)
        );
        console.log("RewardDistributor deployed at:", address(rewardDistributor));

        // 7. Deploy AutoSettler
        AutoSettler autoSettler = new AutoSettler(address(predictionMarket));
        console.log("AutoSettler deployed at:", address(autoSettler));

        vm.stopBroadcast();

        // Summary
        console.log("\n=== Deployment Summary (Polkadot Hub Testnet) ===");
        console.log("Deployer:                ", deployer);
        console.log("AgentIdentity (ERC-8004):", address(agentIdentity));
        console.log("AgentReputation (ERC-8004):", address(agentReputation));
        console.log("AgentRegistryV2:         ", address(agentRegistryV2));
        console.log("PredictionMarket:        ", address(predictionMarket));
        console.log("RewardDistributor:       ", address(rewardDistributor));
        console.log("AutoSettler:             ", address(autoSettler));
    }
}
