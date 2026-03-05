// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentIdentity.sol";
import "../src/AgentReputation.sol";
import "../src/AgentRegistryV2.sol";
import "../src/PredictionMarket.sol";
import "../src/RewardDistributor.sol";
import "../src/AutoSettler.sol";

/// @title ERC-8004 Integration Tests
/// @notice End-to-end tests verifying the full stack works with ERC-8004 identity + reputation
contract ERC8004IntegrationTest is Test {
    AgentIdentity public identity;
    AgentReputation public reputation;
    AgentRegistryV2 public registryV2;
    PredictionMarket public market;
    RewardDistributor public rewardDistributor;
    AutoSettler public autoSettler;

    address public creForwarder = address(0xC3E);
    address public agent1 = address(0x1);
    address public agent2 = address(0x2);
    address public user1 = address(0x3);

    function setUp() public {
        // Deploy ERC-8004 stack
        identity = new AgentIdentity();
        reputation = new AgentReputation(address(identity));
        registryV2 = new AgentRegistryV2(
            address(identity),
            address(reputation),
            creForwarder
        );

        // Deploy existing contracts using V2 as IAgentRegistry
        market = new PredictionMarket(creForwarder, address(registryV2));
        rewardDistributor = new RewardDistributor(address(registryV2));
        autoSettler = new AutoSettler(address(market));

        // Link contracts
        registryV2.setPredictionMarket(address(market));
        reputation.setAuthorized(address(registryV2), true);
    }

    function _registerAgent(address agent, string memory name) internal returns (uint256) {
        vm.deal(agent, 10 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](2);
        meta[0] = IAgentIdentity.MetadataEntry("name", abi.encode(name));
        meta[1] = IAgentIdentity.MetadataEntry("strategy", abi.encode("AI Strategy"));
        vm.prank(agent);
        return identity.register{value: 0.01 ether}("ipfs://agent", meta);
    }

    // ============ Full Flow Test ============

    function testFullFlowWithERC8004() public {
        // 1. Register agents with ERC-8004 identity
        uint256 agent1Id = _registerAgent(agent1, "AlphaBot");
        _registerAgent(agent2, "BetaBot");

        // Verify ERC-721 NFT minted
        assertEq(identity.ownerOf(agent1Id), agent1);
        assertTrue(registryV2.isRegistered(agent1));

        // 2. Create market
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        uint256 marketId = market.createMarket("Will BTC hit $100K?", 2 hours, 1 hours, false, address(0));

        // 3. Agents place bets
        vm.prank(agent1);
        market.predict{value: 0.1 ether}(marketId, PredictionMarket.Outcome.YES);

        vm.prank(agent2);
        market.predict{value: 0.1 ether}(marketId, PredictionMarket.Outcome.NO);

        // 4. Advance time past deadline
        vm.warp(block.timestamp + 3 hours);

        // 5. Request settlement
        market.requestSettlement(marketId);

        // 6. Settle via CRE forwarder (YES wins)
        bytes memory settleReport = abi.encodePacked(
            uint8(0x01),
            abi.encode(uint256(marketId), uint8(0), uint16(8000))
        );
        vm.prank(creForwarder);
        market.onReport(settleReport);

        // 7. Verify agent2 (NO bettor) got loss recorded + reputation
        IAgentRegistry.Agent memory a2 = registryV2.getAgent(agent2);
        assertEq(a2.losses, 1);

        uint256 agent2Id = identity.getAgentIdByWallet(agent2);
        (uint64 lossCount,,) = reputation.getSummary(agent2Id, "prediction", "loss");
        assertEq(lossCount, 1);

        // 8. Agent1 (YES bettor) claims winnings
        vm.prank(agent1);
        market.claim(marketId);

        // 9. Verify agent1 got win recorded + reputation
        IAgentRegistry.Agent memory a1 = registryV2.getAgent(agent1);
        assertEq(a1.wins, 1);
        assertGt(a1.totalProfit, 0);

        (uint64 winCount,,) = reputation.getSummary(agent1Id, "prediction", "win");
        assertEq(winCount, 1);

        // 10. Global reputation check
        (uint64 globalCount, int128 globalVal,) = reputation.getSummary(agent1Id, "", "");
        assertEq(globalCount, 1);
        assertEq(globalVal, int128(1));
    }

    // ============ Agent Creates Market ============

    function testAgentCreatesMarketWithReputation() public {
        uint256 agent1Id = _registerAgent(agent1, "MarketMaker");

        // Create market via CRE forwarder (simulating CRE workflow)
        bytes memory createReport = abi.encodePacked(
            uint8(0x00),
            abi.encode(
                "Will ETH merge succeed?",
                uint256(2 hours),
                uint256(1 hours),
                true,
                agent1
            )
        );
        vm.prank(creForwarder);
        market.onReport(createReport);

        // Verify market created + reputation
        IAgentRegistry.Agent memory a = registryV2.getAgent(agent1);
        assertEq(a.marketsCreated, 1);

        (uint64 mktCount,,) = reputation.getSummary(agent1Id, "market-creation", "");
        assertEq(mktCount, 1);
    }

    // ============ RewardDistributor Works with V2 ============

    function testRewardDistributorWithV2() public {
        _registerAgent(agent1, "Bot1");

        vm.deal(address(this), 1 ether);
        rewardDistributor.startRewardRound{value: 0.1 ether}();

        RewardDistributor.RewardRound memory r = rewardDistributor.getRound(0);
        assertTrue(r.fulfilled);
        assertEq(r.rewardAmount, 0.1 ether);
        // Winner should be agent1 (only agent)
        assertEq(r.winner, agent1);
    }

    // ============ AutoSettler Works with V2 ============

    function testAutoSettlerWithV2() public {
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        uint256 marketId = market.createMarket("Test?", 1 hours, 1 hours, false, address(0));

        // Bet to make it non-trivial
        vm.prank(user1);
        market.predict{value: 0.01 ether}(marketId, PredictionMarket.Outcome.YES);

        // Before deadline - no upkeep needed
        (bool needed,) = autoSettler.checkUpkeep("");
        assertFalse(needed);

        // After deadline
        vm.warp(block.timestamp + 2 hours);
        (bool neededAfter, bytes memory performData) = autoSettler.checkUpkeep("");
        assertTrue(neededAfter);

        // Perform upkeep
        autoSettler.performUpkeep(performData);

        // Market should be in SETTLEMENT_REQUESTED
        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(uint8(m.status), uint8(PredictionMarket.MarketStatus.SETTLEMENT_REQUESTED));
    }

    // ============ Multiple Agents Reputation Tracking ============

    function testMultipleAgentsReputationTracking() public {
        uint256 a1Id = _registerAgent(agent1, "Bot1");
        uint256 a2Id = _registerAgent(agent2, "Bot2");

        // Record results
        vm.startPrank(address(market));
        registryV2.recordBetResult(agent1, true, 0.1 ether);
        registryV2.recordBetResult(agent1, true, 0.05 ether);
        registryV2.recordBetResult(agent2, false, 0.1 ether);
        registryV2.recordBetResult(agent2, true, 0.2 ether);
        vm.stopPrank();

        // Check reputations are separate
        (uint64 a1Wins,,) = reputation.getSummary(a1Id, "prediction", "win");
        (uint64 a1Losses,,) = reputation.getSummary(a1Id, "prediction", "loss");
        assertEq(a1Wins, 2);
        assertEq(a1Losses, 0);

        (uint64 a2Wins,,) = reputation.getSummary(a2Id, "prediction", "win");
        (uint64 a2Losses,,) = reputation.getSummary(a2Id, "prediction", "loss");
        assertEq(a2Wins, 1);
        assertEq(a2Losses, 1);

        // Check scores via IAgentRegistry interface
        IAgentRegistry.Agent memory agent1Data = registryV2.getAgent(agent1);
        IAgentRegistry.Agent memory agent2Data = registryV2.getAgent(agent2);
        assertEq(agent1Data.wins, 2);
        assertEq(agent2Data.wins, 1);
        assertGt(agent1Data.score, agent2Data.score); // Agent1 should have higher score
    }

    // ============ Receive ETH ============

    receive() external payable {}
}
