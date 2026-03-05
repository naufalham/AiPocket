// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "../src/PredictionMarket.sol";

contract PredictionMarketTest is Test {
    AgentRegistry public registry;
    PredictionMarket public market;

    address public creForwarder = address(0xC3E);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public agent1 = address(0x3);

    function setUp() public {
        registry = new AgentRegistry(creForwarder);
        market = new PredictionMarket(creForwarder, address(registry));
        registry.setPredictionMarket(address(market));

        // Fund users
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        vm.deal(agent1, 10 ether);

        // Register an agent
        vm.prank(agent1);
        registry.registerAgent{value: 0.01 ether}("TestAgent", "Strat");
    }

    // ============ Market Creation ============

    function testCreateMarket() public {
        vm.prank(user1);
        uint256 marketId = market.createMarket(
            "Will BTC exceed $100k?",
            1 days,
            12 hours,
            false,
            address(0)
        );

        assertEq(marketId, 0);
        PredictionMarket.Market memory m = market.getMarket(0);
        assertEq(m.question, "Will BTC exceed $100k?");
        assertEq(uint8(m.status), uint8(PredictionMarket.MarketStatus.OPEN));
        assertEq(m.isAgentCreated, false);
    }

    function testCreateMarketByAgent() public {
        vm.prank(agent1);
        uint256 marketId = market.createMarket(
            "Will ETH hit $5k?",
            1 days,
            12 hours,
            true,
            agent1
        );

        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertTrue(m.isAgentCreated);
        assertEq(m.creatorAgent, agent1);

        // Check agent stats updated
        IAgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertEq(a.marketsCreated, 1);
    }

    function testCreateMarketEmptyQuestion() public {
        vm.prank(user1);
        vm.expectRevert("Empty question");
        market.createMarket("", 1 days, 12 hours, false, address(0));
    }

    function testCreateMarketTooShort() public {
        vm.prank(user1);
        vm.expectRevert("Duration too short");
        market.createMarket("Q?", 30 minutes, 12 hours, false, address(0));
    }

    // ============ Predictions ============

    function testPredict() public {
        _createTestMarket();

        vm.prank(user1);
        market.predict{value: 0.1 ether}(0, PredictionMarket.Outcome.YES);

        PredictionMarket.Prediction memory p = market.getPrediction(0, user1);
        assertEq(p.amount, 0.1 ether);
        assertEq(uint8(p.choice), uint8(PredictionMarket.Outcome.YES));
        assertFalse(p.isAgent);

        PredictionMarket.Market memory m = market.getMarket(0);
        assertEq(m.yesPool, 0.1 ether);
        assertEq(m.totalBettors, 1);
    }

    function testPredictByAgent() public {
        _createTestMarket();

        vm.prank(agent1);
        market.predict{value: 0.05 ether}(0, PredictionMarket.Outcome.NO);

        PredictionMarket.Prediction memory p = market.getPrediction(0, agent1);
        assertTrue(p.isAgent);
        assertEq(p.agentAddress, agent1);
    }

    function testPredictBelowMinimum() public {
        _createTestMarket();
        vm.prank(user1);
        vm.expectRevert("Below minimum bet");
        market.predict{value: 0.0001 ether}(0, PredictionMarket.Outcome.YES);
    }

    function testPredictDoubleBet() public {
        _createTestMarket();
        vm.prank(user1);
        market.predict{value: 0.1 ether}(0, PredictionMarket.Outcome.YES);

        vm.prank(user1);
        vm.expectRevert("Already bet");
        market.predict{value: 0.1 ether}(0, PredictionMarket.Outcome.NO);
    }

    function testPredictAfterDeadline() public {
        _createTestMarket();
        vm.warp(block.timestamp + 2 days);

        vm.prank(user1);
        vm.expectRevert("Betting closed");
        market.predict{value: 0.1 ether}(0, PredictionMarket.Outcome.YES);
    }

    // ============ Settlement ============

    function testRequestSettlement() public {
        _createTestMarket();
        _placeBets();

        vm.warp(block.timestamp + 2 days);

        vm.prank(user1);
        market.requestSettlement(0);

        PredictionMarket.Market memory m = market.getMarket(0);
        assertEq(uint8(m.status), uint8(PredictionMarket.MarketStatus.SETTLEMENT_REQUESTED));
    }

    function testRequestSettlementTooEarly() public {
        _createTestMarket();
        vm.prank(user1);
        vm.expectRevert("Betting not closed");
        market.requestSettlement(0);
    }

    function testSettleViaOnReport() public {
        _createTestMarket();
        _placeBets();

        vm.warp(block.timestamp + 2 days);
        vm.prank(user1);
        market.requestSettlement(0);

        // Settle via CRE forwarder: action 0x01, marketId=0, outcome=YES(0), confidence=8000
        bytes memory report = abi.encodePacked(
            uint8(0x01),
            abi.encode(uint256(0), uint8(0), uint16(8000))
        );

        vm.prank(creForwarder);
        market.onReport(report);

        PredictionMarket.Market memory m = market.getMarket(0);
        assertEq(uint8(m.status), uint8(PredictionMarket.MarketStatus.SETTLED));
        assertEq(uint8(m.outcome), uint8(PredictionMarket.Outcome.YES));
        assertEq(m.confidenceScore, 8000);
    }

    function testSettleLowConfidence() public {
        _createTestMarket();
        _placeBets();
        vm.warp(block.timestamp + 2 days);
        vm.prank(user1);
        market.requestSettlement(0);

        bytes memory report = abi.encodePacked(
            uint8(0x01),
            abi.encode(uint256(0), uint8(0), uint16(3000))
        );

        vm.prank(creForwarder);
        vm.expectRevert("Confidence too low");
        market.onReport(report);
    }

    function testOnReportNotForwarder() public {
        bytes memory report = abi.encodePacked(uint8(0x01), abi.encode(uint256(0), uint8(0), uint16(8000)));
        vm.prank(user1);
        vm.expectRevert("Only CRE forwarder");
        market.onReport(report);
    }

    // ============ Claims ============

    function testClaim() public {
        _createAndSettleMarket(PredictionMarket.Outcome.YES);

        uint256 balanceBefore = user1.balance;

        vm.prank(user1);
        market.claim(0);

        uint256 balanceAfter = user1.balance;
        // user1 bet YES (0.1 ETH), user2 bet NO (0.1 ETH)
        // Total pool = 0.2 ETH, fee = 2% = 0.004 ETH, distributable = 0.196 ETH
        // user1 share = (0.1 * 0.196) / 0.1 = 0.196 ETH
        assertGt(balanceAfter, balanceBefore);
        assertEq(balanceAfter - balanceBefore, 0.196 ether);
    }

    function testClaimWrongPrediction() public {
        _createAndSettleMarket(PredictionMarket.Outcome.YES);

        vm.prank(user2); // user2 bet NO
        vm.expectRevert("Wrong prediction");
        market.claim(0);
    }

    function testClaimDoubleClaim() public {
        _createAndSettleMarket(PredictionMarket.Outcome.YES);

        vm.prank(user1);
        market.claim(0);

        vm.prank(user1);
        vm.expectRevert("Already claimed");
        market.claim(0);
    }

    function testClaimNotSettled() public {
        _createTestMarket();
        _placeBets();

        vm.prank(user1);
        vm.expectRevert("Not settled");
        market.claim(0);
    }

    // ============ Cancel & Refund ============

    function testCancelAndRefund() public {
        _createTestMarket();

        vm.prank(user1);
        market.predict{value: 0.1 ether}(0, PredictionMarket.Outcome.YES);

        market.cancelMarket(0);

        uint256 balanceBefore = user1.balance;
        vm.prank(user1);
        market.claimRefund(0);

        assertEq(user1.balance - balanceBefore, 0.1 ether);
    }

    // ============ CRE Market Creation via onReport ============

    function testCreateMarketViaOnReport() public {
        bytes memory report = abi.encodePacked(
            uint8(0x00),
            abi.encode(
                string("Will LINK reach $50 by March?"),
                uint256(1 days),
                uint256(12 hours),
                bool(true),
                address(agent1)
            )
        );

        vm.prank(creForwarder);
        market.onReport(report);

        assertEq(market.nextMarketId(), 1);
        PredictionMarket.Market memory m = market.getMarket(0);
        assertEq(m.question, "Will LINK reach $50 by March?");
        assertTrue(m.isAgentCreated);
    }

    // ============ Agent Stats Integration ============

    function testAgentStatsUpdatedOnSettlement() public {
        _createTestMarket();

        // Agent bets YES
        vm.prank(agent1);
        market.predict{value: 0.05 ether}(0, PredictionMarket.Outcome.YES);

        // User bets NO
        vm.prank(user2);
        market.predict{value: 0.05 ether}(0, PredictionMarket.Outcome.NO);

        // Settle as NO (agent loses)
        vm.warp(block.timestamp + 2 days);
        vm.prank(user1);
        market.requestSettlement(0);

        bytes memory report = abi.encodePacked(
            uint8(0x01),
            abi.encode(uint256(0), uint8(1), uint16(9000)) // NO wins
        );
        vm.prank(creForwarder);
        market.onReport(report);

        // Check agent got loss recorded
        IAgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertEq(a.totalBets, 1);
        assertEq(a.losses, 1);
        assertEq(a.totalLoss, 0.05 ether);
    }

    // ============ Helpers ============

    function _createTestMarket() internal {
        market.createMarket("Will BTC exceed $100k?", 1 days, 12 hours, false, address(0));
    }

    function _placeBets() internal {
        vm.prank(user1);
        market.predict{value: 0.1 ether}(0, PredictionMarket.Outcome.YES);

        vm.prank(user2);
        market.predict{value: 0.1 ether}(0, PredictionMarket.Outcome.NO);
    }

    function _createAndSettleMarket(PredictionMarket.Outcome outcome) internal {
        _createTestMarket();
        _placeBets();

        vm.warp(block.timestamp + 2 days);
        vm.prank(user1);
        market.requestSettlement(0);

        bytes memory report = abi.encodePacked(
            uint8(0x01),
            abi.encode(uint256(0), uint8(outcome), uint16(8000))
        );
        vm.prank(creForwarder);
        market.onReport(report);
    }
}
