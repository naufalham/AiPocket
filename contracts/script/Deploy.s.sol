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
    // Base Sepolia CRE Forwarder
    address constant CRE_FORWARDER = 0x82300bd7c3958625581cc2F77bC6464dcEcDF3e5;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ERC-8004 Identity Registry (ERC-721)
        AgentIdentity agentIdentity = new AgentIdentity();
        console.log("AgentIdentity (ERC-8004) deployed at:", address(agentIdentity));

        // 2. Deploy ERC-8004 Reputation Registry
        AgentReputation agentReputation = new AgentReputation(address(agentIdentity));
        console.log("AgentReputation (ERC-8004) deployed at:", address(agentReputation));

        // 3. Deploy AgentRegistryV2 (IAgentRegistry bridge)
        AgentRegistryV2 agentRegistryV2 = new AgentRegistryV2(
            address(agentIdentity),
            address(agentReputation),
            CRE_FORWARDER
        );
        console.log("AgentRegistryV2 deployed at:", address(agentRegistryV2));

        // 4. Deploy PredictionMarket (uses V2 as IAgentRegistry)
        PredictionMarket predictionMarket = new PredictionMarket(
            CRE_FORWARDER,
            address(agentRegistryV2)
        );
        console.log("PredictionMarket deployed at:", address(predictionMarket));

        // 5. Link contracts
        agentRegistryV2.setPredictionMarket(address(predictionMarket));
        agentReputation.setAuthorized(address(agentRegistryV2), true);
        console.log("AgentRegistryV2 linked to PredictionMarket");
        console.log("AgentReputation authorized AgentRegistryV2");

        // 6. Deploy RewardDistributor (uses V2 as IAgentRegistry)
        RewardDistributor rewardDistributor = new RewardDistributor(
            address(agentRegistryV2)
        );
        console.log("RewardDistributor deployed at:", address(rewardDistributor));

        // 7. Deploy AutoSettler
        AutoSettler autoSettler = new AutoSettler(address(predictionMarket));
        console.log("AutoSettler deployed at:", address(autoSettler));

        vm.stopBroadcast();

        // Summary
        console.log("\n=== Deployment Summary ===");
        console.log("AgentIdentity (ERC-8004):", address(agentIdentity));
        console.log("AgentReputation (ERC-8004):", address(agentReputation));
        console.log("AgentRegistryV2:         ", address(agentRegistryV2));
        console.log("PredictionMarket:        ", address(predictionMarket));
        console.log("RewardDistributor:       ", address(rewardDistributor));
        console.log("AutoSettler:             ", address(autoSettler));
        console.log("CRE Forwarder:           ", CRE_FORWARDER);
    }
}
