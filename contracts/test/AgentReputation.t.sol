// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentIdentity.sol";
import "../src/AgentReputation.sol";
import "../src/interfaces/IAgentReputation.sol";

contract AgentReputationTest is Test {
    AgentIdentity public identity;
    AgentReputation public reputation;
    address public agent1 = address(0x1);
    address public client1 = address(0xC1);
    address public client2 = address(0xC2);
    uint256 public agent1Id;

    function setUp() public {
        identity = new AgentIdentity();
        reputation = new AgentReputation(address(identity));

        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);
        vm.prank(agent1);
        agent1Id = identity.register{value: 0.01 ether}("", meta);
    }

    function _fb(uint256 agentId, int128 value, string memory tag1, string memory tag2, string memory endpoint) internal pure returns (IAgentReputation.FeedbackInput memory) {
        return IAgentReputation.FeedbackInput({
            agentId: agentId, value: value, valueDecimals: 0, tag1: tag1, tag2: tag2, endpoint: endpoint, feedbackHash: bytes32(0)
        });
    }

    // ============ Give Feedback ============

    function testGiveFeedback() public {
        vm.prank(client1);
        uint64 idx = reputation.giveFeedback(_fb(agent1Id, 1, "prediction", "win", "predict"));
        assertEq(idx, 0);
    }

    function testGiveFeedbackMultiple() public {
        vm.prank(client1);
        reputation.giveFeedback(_fb(agent1Id, 1, "prediction", "win", "predict"));
        vm.prank(client1);
        reputation.giveFeedback(_fb(agent1Id, -1, "prediction", "loss", "predict"));
        vm.prank(client2);
        reputation.giveFeedback(_fb(agent1Id, 1, "market-creation", "", "createMarket"));

        (uint64 count, int128 value,) = reputation.getSummary(agent1Id, "", "");
        assertEq(count, 3);
        assertEq(value, int128(1));
    }

    function testGiveFeedbackNonExistentAgent() public {
        vm.prank(client1);
        vm.expectRevert("Agent does not exist");
        reputation.giveFeedback(_fb(999, 1, "", "", ""));
    }

    // ============ Summary ============

    function testGetSummaryByTag() public {
        vm.startPrank(client1);
        reputation.giveFeedback(_fb(agent1Id, 1, "prediction", "win", "predict"));
        reputation.giveFeedback(_fb(agent1Id, 1, "prediction", "win", "predict"));
        reputation.giveFeedback(_fb(agent1Id, -1, "prediction", "loss", "predict"));
        reputation.giveFeedback(_fb(agent1Id, 1, "market-creation", "", "createMarket"));
        vm.stopPrank();

        (uint64 winCount, int128 winVal,) = reputation.getSummary(agent1Id, "prediction", "win");
        assertEq(winCount, 2);
        assertEq(winVal, int128(2));

        (uint64 lossCount, int128 lossVal,) = reputation.getSummary(agent1Id, "prediction", "loss");
        assertEq(lossCount, 1);
        assertEq(lossVal, int128(-1));

        (uint64 mktCount,,) = reputation.getSummary(agent1Id, "market-creation", "");
        assertEq(mktCount, 1);
    }

    // ============ Revoke Feedback ============

    function testRevokeFeedback() public {
        vm.prank(client1);
        uint64 idx = reputation.giveFeedback(_fb(agent1Id, 1, "prediction", "win", "predict"));

        (uint64 countBefore,,) = reputation.getSummary(agent1Id, "prediction", "win");
        assertEq(countBefore, 1);

        vm.prank(client1);
        reputation.revokeFeedback(agent1Id, idx);

        (uint64 countAfter, int128 valAfter,) = reputation.getSummary(agent1Id, "prediction", "win");
        assertEq(countAfter, 0);
        assertEq(valAfter, int128(0));
    }

    function testRevokeFeedbackNotGiver() public {
        vm.prank(client1);
        reputation.giveFeedback(_fb(agent1Id, 1, "prediction", "win", "predict"));

        vm.prank(client2);
        vm.expectRevert("Not feedback giver");
        reputation.revokeFeedback(agent1Id, 0);
    }

    function testRevokeFeedbackDouble() public {
        vm.prank(client1);
        reputation.giveFeedback(_fb(agent1Id, 1, "prediction", "win", "predict"));

        vm.prank(client1);
        reputation.revokeFeedback(agent1Id, 0);

        vm.prank(client1);
        vm.expectRevert("Already revoked");
        reputation.revokeFeedback(agent1Id, 0);
    }

    // ============ Read Feedback ============

    function testReadAllFeedback() public {
        vm.startPrank(client1);
        reputation.giveFeedback(_fb(agent1Id, 1, "prediction", "win", "predict"));
        reputation.giveFeedback(_fb(agent1Id, -1, "prediction", "loss", "predict"));
        reputation.giveFeedback(_fb(agent1Id, 1, "market-creation", "", "createMarket"));
        vm.stopPrank();

        IAgentReputation.Feedback[] memory all = reputation.readAllFeedback(agent1Id, "", "", false);
        assertEq(all.length, 3);

        IAgentReputation.Feedback[] memory predictions = reputation.readAllFeedback(agent1Id, "prediction", "", false);
        assertEq(predictions.length, 2);
    }

    function testReadAllFeedbackExcludesRevoked() public {
        vm.startPrank(client1);
        reputation.giveFeedback(_fb(agent1Id, 1, "prediction", "win", "predict"));
        reputation.giveFeedback(_fb(agent1Id, -1, "prediction", "loss", "predict"));
        vm.stopPrank();

        vm.prank(client1);
        reputation.revokeFeedback(agent1Id, 0);

        IAgentReputation.Feedback[] memory active = reputation.readAllFeedback(agent1Id, "", "", false);
        assertEq(active.length, 1);

        IAgentReputation.Feedback[] memory all = reputation.readAllFeedback(agent1Id, "", "", true);
        assertEq(all.length, 2);
    }

    // ============ Clients ============

    function testGetClients() public {
        vm.prank(client1);
        reputation.giveFeedback(_fb(agent1Id, 1, "", "", ""));
        vm.prank(client2);
        reputation.giveFeedback(_fb(agent1Id, 1, "", "", ""));

        address[] memory clients = reputation.getClients(agent1Id);
        assertEq(clients.length, 2);
        assertEq(clients[0], client1);
        assertEq(clients[1], client2);
    }

    function testGetLastIndex() public {
        vm.startPrank(client1);
        reputation.giveFeedback(_fb(agent1Id, 1, "", "", ""));
        reputation.giveFeedback(_fb(agent1Id, 1, "", "", ""));
        reputation.giveFeedback(_fb(agent1Id, 1, "", "", ""));
        vm.stopPrank();

        uint64 lastIdx = reputation.getLastIndex(agent1Id, client1);
        assertEq(lastIdx, 2);
    }
}
