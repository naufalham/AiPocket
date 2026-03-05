// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentIdentity.sol";
import "../src/AgentRegistryV2.sol";
import "../src/PredictionMarket.sol";

/// @title DemoFlow - Full flow demo script for AgentBet
/// @notice Demonstrates: register agent → create market → bet → verify stats
/// @dev Run: forge script script/DemoFlow.s.sol:DemoFlow --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
contract DemoFlow is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        AgentIdentity identity = AgentIdentity(vm.envAddress("AGENT_IDENTITY_ADDRESS"));
        AgentRegistryV2 registry = AgentRegistryV2(vm.envAddress("AGENT_REGISTRY_ADDRESS"));
        PredictionMarket market = PredictionMarket(vm.envAddress("PREDICTION_MARKET_ADDRESS"));

        vm.startBroadcast(deployerKey);

        // Step 1: Register AI Agent via ERC-8004
        console.log("\n=== Step 1: Register AI Agent (ERC-8004) ===");
        uint256 agentId = _registerAgent(identity);
        console.log("Agent NFT ID:", agentId);
        console.log("Wallet:", deployer);

        // Step 2: Create Prediction Market
        console.log("\n=== Step 2: Create Prediction Market ===");
        market.createMarket(
            "Will ETH reach $5,000 by March 2026?",
            1 days, 12 hours, true, deployer
        );
        uint256 marketId = market.nextMarketId() - 1;
        console.log("Market ID:", marketId);

        // Step 3: Place Bet
        console.log("\n=== Step 3: Place Bet (YES, 0.005 ETH) ===");
        market.predict{value: 0.005 ether}(marketId, PredictionMarket.Outcome.YES);

        // Step 4: Verify
        console.log("\n=== Step 4: Verification ===");
        _logMarketState(market, marketId);
        _logAgentStats(registry, deployer);

        console.log("\n=== Demo Complete ===");
        console.log("Next: wait for deadline, then CRE settler handles settlement");

        vm.stopBroadcast();
    }

    function _registerAgent(AgentIdentity identity) internal returns (uint256) {
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](2);
        meta[0] = IAgentIdentity.MetadataEntry("name", abi.encode("AlphaBot"));
        meta[1] = IAgentIdentity.MetadataEntry("strategy", abi.encode("Trend-following + Gemini AI"));
        return identity.register{value: 0.01 ether}("", meta);
    }

    function _logMarketState(PredictionMarket market, uint256 id) internal view {
        PredictionMarket.Market memory m = market.getMarket(id);
        console.log("YES pool:", m.yesPool);
        console.log("NO pool:", m.noPool);
        console.log("Bettors:", m.totalBettors);
    }

    function _logAgentStats(AgentRegistryV2 registry, address agent) internal view {
        IAgentRegistry.Agent memory a = registry.getAgent(agent);
        console.log("Agent:", a.name);
        console.log("Markets created:", a.marketsCreated);
        console.log("Score:", a.score);
    }
}
