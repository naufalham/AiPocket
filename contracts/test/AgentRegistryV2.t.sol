// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentIdentity.sol";
import "../src/AgentReputation.sol";
import "../src/AgentRegistryV2.sol";

contract AgentRegistryV2Test is Test {
    AgentIdentity public identity;
    AgentReputation public reputation;
    AgentRegistryV2 public registryV2;

    address public owner = address(this);
    address public creForwarder = address(0xC3E);
    address public market = address(0xBEEF);
    address public agent1 = address(0x1);
    address public agent2 = address(0x2);

    function setUp() public {
        identity = new AgentIdentity();
        reputation = new AgentReputation(address(identity));
        registryV2 = new AgentRegistryV2(
            address(identity),
            address(reputation),
            creForwarder
        );

        // Setup authorization
        registryV2.setPredictionMarket(market);
        reputation.setAuthorized(address(registryV2), true);

        // Register agent1
        _registerAgent(agent1, "AlphaBot", "Trend follower", 0.01 ether);
    }

    function _registerAgent(
        address agent,
        string memory name,
        string memory strategy,
        uint256 stake
    ) internal {
        vm.deal(agent, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](2);
        meta[0] = IAgentIdentity.MetadataEntry("name", abi.encode(name));
        meta[1] = IAgentIdentity.MetadataEntry("strategy", abi.encode(strategy));
        vm.prank(agent);
        identity.register{value: stake}("", meta);
    }

    // ============ isRegistered ============

    function testIsRegistered() public view {
        assertTrue(registryV2.isRegistered(agent1));
        assertFalse(registryV2.isRegistered(agent2));
    }

    // ============ getAgent ============

    function testGetAgent() public view {
        IAgentRegistry.Agent memory a = registryV2.getAgent(agent1);
        assertEq(a.owner, agent1);
        assertEq(a.name, "AlphaBot");
        assertEq(a.strategy, "Trend follower");
        assertEq(a.stakedAmount, 0.01 ether);
        assertEq(a.totalBets, 0);
        assertEq(a.wins, 0);
    }

    // ============ agentCount ============

    function testAgentCount() public {
        assertEq(registryV2.agentCount(), 1);

        _registerAgent(agent2, "BetaBot", "Conservative", 0.02 ether);
        assertEq(registryV2.agentCount(), 2);
    }

    // ============ getAgentAddress ============

    function testGetAgentAddress() public view {
        assertEq(registryV2.getAgentAddress(0), agent1);
    }

    function testGetAgentAddressMultiple() public {
        _registerAgent(agent2, "BetaBot", "Strat", 0.01 ether);
        assertEq(registryV2.getAgentAddress(0), agent1);
        assertEq(registryV2.getAgentAddress(1), agent2);
    }

    // ============ recordBetResult ============

    function testRecordBetWin() public {
        vm.prank(market);
        registryV2.recordBetResult(agent1, true, 0.05 ether);

        IAgentRegistry.Agent memory a = registryV2.getAgent(agent1);
        assertEq(a.totalBets, 1);
        assertEq(a.wins, 1);
        assertEq(a.losses, 0);
        assertEq(a.totalProfit, 0.05 ether);
    }

    function testRecordBetLoss() public {
        vm.prank(market);
        registryV2.recordBetResult(agent1, false, 0.02 ether);

        IAgentRegistry.Agent memory a = registryV2.getAgent(agent1);
        assertEq(a.totalBets, 1);
        assertEq(a.wins, 0);
        assertEq(a.losses, 1);
        assertEq(a.totalLoss, 0.02 ether);
    }

    function testRecordBetResultPostsReputation() public {
        vm.prank(market);
        registryV2.recordBetResult(agent1, true, 0.05 ether);

        // Check ERC-8004 reputation was auto-posted
        uint256 agentId = identity.getAgentIdByWallet(agent1);
        (uint64 count, int128 value,) = reputation.getSummary(agentId, "prediction", "win");
        assertEq(count, 1);
        assertEq(value, int128(1));
    }

    function testRecordBetLossPostsReputation() public {
        vm.prank(market);
        registryV2.recordBetResult(agent1, false, 0.02 ether);

        uint256 agentId = identity.getAgentIdByWallet(agent1);
        (uint64 count, int128 value,) = reputation.getSummary(agentId, "prediction", "loss");
        assertEq(count, 1);
        assertEq(value, int128(-1));
    }

    // ============ recordMarketCreated ============

    function testRecordMarketCreated() public {
        registryV2.recordMarketCreated(agent1);

        IAgentRegistry.Agent memory a = registryV2.getAgent(agent1);
        assertEq(a.marketsCreated, 1);
    }

    function testRecordMarketCreatedPostsReputation() public {
        registryV2.recordMarketCreated(agent1);

        uint256 agentId = identity.getAgentIdByWallet(agent1);
        (uint64 count,,) = reputation.getSummary(agentId, "market-creation", "");
        assertEq(count, 1);
    }

    // ============ Authorization ============

    function testOnlyAuthorized() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert("Not authorized");
        registryV2.recordBetResult(agent1, true, 0.01 ether);
    }

    function testCreForwarderAuthorized() public {
        vm.prank(creForwarder);
        registryV2.recordBetResult(agent1, true, 0.01 ether);
        // Should not revert
        IAgentRegistry.Agent memory a = registryV2.getAgent(agent1);
        assertEq(a.wins, 1);
    }

    function testOwnerAuthorized() public {
        registryV2.recordBetResult(agent1, true, 0.01 ether);
        IAgentRegistry.Agent memory a = registryV2.getAgent(agent1);
        assertEq(a.wins, 1);
    }

    // ============ Score Calculation ============

    function testScoreCalculation() public {
        vm.startPrank(market);
        registryV2.recordBetResult(agent1, true, 0.05 ether);
        registryV2.recordBetResult(agent1, true, 0.03 ether);
        registryV2.recordBetResult(agent1, true, 0.04 ether);
        registryV2.recordBetResult(agent1, false, 0.02 ether);
        vm.stopPrank();

        IAgentRegistry.Agent memory a = registryV2.getAgent(agent1);
        assertEq(a.totalBets, 4);
        assertEq(a.wins, 3);
        assertEq(a.losses, 1);
        // WinRate = 3*10000/4 = 7500
        // Net profit = 0.12 - 0.02 = 0.10 ether = 100000000000000000
        // Profit bonus = 100000000000000000 / 1e15 = 100
        // Total score = 7500 + 100 = 7600
        assertEq(a.score, 7600);
    }

    // ============ Leaderboard ============

    function testGetLeaderboard() public {
        _registerAgent(agent2, "BetaBot", "Conservative", 0.02 ether);

        (address[] memory addrs, IAgentRegistry.Agent[] memory data) = registryV2.getLeaderboard(0, 10);
        assertEq(addrs.length, 2);
        assertEq(addrs[0], agent1);
        assertEq(addrs[1], agent2);
        assertEq(data[0].stakedAmount, 0.01 ether);
        assertEq(data[1].stakedAmount, 0.02 ether);
    }

    function testGetLeaderboardPagination() public {
        _registerAgent(agent2, "BetaBot", "Strat", 0.01 ether);

        (address[] memory addrs,) = registryV2.getLeaderboard(1, 10);
        assertEq(addrs.length, 1);
        assertEq(addrs[0], agent2);
    }

    function testGetLeaderboardEmpty() public {
        (address[] memory addrs,) = registryV2.getLeaderboard(10, 10);
        assertEq(addrs.length, 0);
    }
}
