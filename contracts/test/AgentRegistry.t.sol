// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    address public owner = address(this);
    address public creForwarder = address(0xC3E);
    address public agent1 = address(0x1);
    address public agent2 = address(0x2);

    function setUp() public {
        registry = new AgentRegistry(creForwarder);
    }

    function testRegisterAgent() public {
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        registry.registerAgent{value: 0.01 ether}("AlphaBot", "Trend follower");

        assertTrue(registry.isRegistered(agent1));
        assertEq(registry.agentCount(), 1);

        IAgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertEq(a.name, "AlphaBot");
        assertEq(a.strategy, "Trend follower");
        assertEq(a.stakedAmount, 0.01 ether);
        assertTrue(a.isActive);
        assertEq(a.totalBets, 0);
    }

    function testRegisterAgentInsufficientStake() public {
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        vm.expectRevert("Insufficient stake");
        registry.registerAgent{value: 0.0001 ether}("Bot", "Strat");
    }

    function testDoubleRegistration() public {
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        registry.registerAgent{value: 0.01 ether}("Bot", "Strat");

        vm.prank(agent1);
        vm.expectRevert("Already registered");
        registry.registerAgent{value: 0.01 ether}("Bot2", "Strat2");
    }

    function testInvalidName() public {
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        vm.expectRevert("Invalid name");
        registry.registerAgent{value: 0.01 ether}("", "Strat");
    }

    function testRecordBetWin() public {
        // Register agent
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        registry.registerAgent{value: 0.01 ether}("AlphaBot", "Strat");

        // Set prediction market address
        address market = address(0xBEEF);
        registry.setPredictionMarket(market);

        // Record win from market contract
        vm.prank(market);
        registry.recordBetResult(agent1, true, 0.05 ether);

        IAgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertEq(a.totalBets, 1);
        assertEq(a.wins, 1);
        assertEq(a.losses, 0);
        assertEq(a.totalProfit, 0.05 ether);
    }

    function testRecordBetLoss() public {
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        registry.registerAgent{value: 0.01 ether}("AlphaBot", "Strat");

        address market = address(0xBEEF);
        registry.setPredictionMarket(market);

        vm.prank(market);
        registry.recordBetResult(agent1, false, 0.02 ether);

        IAgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertEq(a.totalBets, 1);
        assertEq(a.wins, 0);
        assertEq(a.losses, 1);
        assertEq(a.totalLoss, 0.02 ether);
    }

    function testOnlyAuthorized() public {
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        registry.registerAgent{value: 0.01 ether}("Bot", "Strat");

        // Random address should not be able to record
        vm.prank(address(0xDEAD));
        vm.expectRevert("Not authorized");
        registry.recordBetResult(agent1, true, 0.01 ether);
    }

    function testRecordMarketCreated() public {
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        registry.registerAgent{value: 0.01 ether}("Bot", "Strat");

        // Owner can record
        registry.recordMarketCreated(agent1);

        IAgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertEq(a.marketsCreated, 1);
    }

    function testGetLeaderboard() public {
        // Register 3 agents
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        registry.registerAgent{value: 0.01 ether}("Bot1", "Strat1");

        vm.deal(agent2, 1 ether);
        vm.prank(agent2);
        registry.registerAgent{value: 0.02 ether}("Bot2", "Strat2");

        (address[] memory addrs, IAgentRegistry.Agent[] memory data) = registry.getLeaderboard(0, 10);
        assertEq(addrs.length, 2);
        assertEq(addrs[0], agent1);
        assertEq(addrs[1], agent2);
        assertEq(data[0].stakedAmount, 0.01 ether);
        assertEq(data[1].stakedAmount, 0.02 ether);
    }

    function testGetLeaderboardPagination() public {
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        registry.registerAgent{value: 0.01 ether}("Bot1", "Strat1");

        vm.deal(agent2, 1 ether);
        vm.prank(agent2);
        registry.registerAgent{value: 0.01 ether}("Bot2", "Strat2");

        (address[] memory addrs,) = registry.getLeaderboard(1, 10);
        assertEq(addrs.length, 1);
        assertEq(addrs[0], agent2);
    }

    function testScoreCalculation() public {
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        registry.registerAgent{value: 0.01 ether}("Bot", "Strat");

        address market = address(0xBEEF);
        registry.setPredictionMarket(market);

        // 3 wins, 1 loss -> 75% win rate
        vm.startPrank(market);
        registry.recordBetResult(agent1, true, 0.05 ether);
        registry.recordBetResult(agent1, true, 0.03 ether);
        registry.recordBetResult(agent1, true, 0.04 ether);
        registry.recordBetResult(agent1, false, 0.02 ether);
        vm.stopPrank();

        IAgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertEq(a.totalBets, 4);
        assertEq(a.wins, 3);
        assertEq(a.losses, 1);
        // WinRate = 3*10000/4 = 7500
        // Net profit = 0.12 - 0.02 = 0.10 ether = 100000000000000000
        // Profit bonus = 100000000000000000 / 1e15 = 100
        // Total score = 7500 + 100 = 7600
        assertEq(a.score, 7600);
    }

    function testDeactivateAgent() public {
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        registry.registerAgent{value: 0.01 ether}("Bot", "Strat");

        vm.prank(agent1);
        registry.deactivateAgent(agent1);

        IAgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertFalse(a.isActive);
    }

    function testAddStake() public {
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        registry.registerAgent{value: 0.01 ether}("Bot", "Strat");

        vm.prank(agent1);
        registry.addStake{value: 0.05 ether}();

        IAgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertEq(a.stakedAmount, 0.06 ether);
    }
}
