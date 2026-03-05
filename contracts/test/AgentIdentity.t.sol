// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentIdentity.sol";

contract AgentIdentityTest is Test {
    AgentIdentity public identity;
    address public owner = address(this);
    address public agent1 = address(0x1);
    address public agent2 = address(0x2);
    uint256 public newWalletPk = 0xBEEF;
    address public newWallet;

    function setUp() public {
        identity = new AgentIdentity();
        newWallet = vm.addr(newWalletPk);
    }

    // ============ Registration ============

    function testRegister() public {
        vm.deal(agent1, 1 ether);

        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](2);
        meta[0] = IAgentIdentity.MetadataEntry("name", abi.encode("AlphaBot"));
        meta[1] = IAgentIdentity.MetadataEntry("strategy", abi.encode("Trend follower"));

        vm.prank(agent1);
        uint256 agentId = identity.register{value: 0.01 ether}("ipfs://agent1", meta);

        assertEq(agentId, 0);
        assertEq(identity.ownerOf(0), agent1);
        assertEq(identity.tokenURI(0), "ipfs://agent1");
        assertTrue(identity.isRegisteredAgent(agent1));
        assertEq(identity.getAgentIdByWallet(agent1), 0);
        assertEq(identity.getAgentWallet(0), agent1);
        assertEq(identity.totalAgents(), 1);
        assertEq(identity.getStake(0), 0.01 ether);
    }

    function testRegisterWithMetadata() public {
        vm.deal(agent1, 1 ether);

        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](2);
        meta[0] = IAgentIdentity.MetadataEntry("name", abi.encode("TestBot"));
        meta[1] = IAgentIdentity.MetadataEntry("strategy", abi.encode("Conservative"));

        vm.prank(agent1);
        uint256 agentId = identity.register{value: 0.01 ether}("", meta);

        bytes memory nameBytes = identity.getMetadata(agentId, "name");
        string memory name = abi.decode(nameBytes, (string));
        assertEq(name, "TestBot");

        bytes memory stratBytes = identity.getMetadata(agentId, "strategy");
        string memory strat = abi.decode(stratBytes, (string));
        assertEq(strat, "Conservative");
    }

    function testRegisterMinStake() public {
        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);

        vm.prank(agent1);
        vm.expectRevert("Insufficient stake");
        identity.register{value: 0.0001 ether}("", meta);
    }

    function testRegisterDuplicate() public {
        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);

        vm.prank(agent1);
        identity.register{value: 0.01 ether}("", meta);

        vm.prank(agent1);
        vm.expectRevert("Already registered");
        identity.register{value: 0.01 ether}("", meta);
    }

    function testMultipleAgents() public {
        vm.deal(agent1, 1 ether);
        vm.deal(agent2, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);

        vm.prank(agent1);
        uint256 id1 = identity.register{value: 0.01 ether}("ipfs://1", meta);

        vm.prank(agent2);
        uint256 id2 = identity.register{value: 0.02 ether}("ipfs://2", meta);

        assertEq(id1, 0);
        assertEq(id2, 1);
        assertEq(identity.totalAgents(), 2);
        assertEq(identity.getAgentWallet(0), agent1);
        assertEq(identity.getAgentWallet(1), agent2);
    }

    // ============ URI ============

    function testSetAgentURI() public {
        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);
        vm.prank(agent1);
        uint256 agentId = identity.register{value: 0.01 ether}("ipfs://old", meta);

        vm.prank(agent1);
        identity.setAgentURI(agentId, "ipfs://new");
        assertEq(identity.tokenURI(agentId), "ipfs://new");
    }

    function testSetAgentURINotOwner() public {
        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);
        vm.prank(agent1);
        uint256 agentId = identity.register{value: 0.01 ether}("", meta);

        vm.prank(agent2);
        vm.expectRevert("Not agent owner");
        identity.setAgentURI(agentId, "ipfs://hack");
    }

    // ============ Metadata ============

    function testSetMetadata() public {
        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);
        vm.prank(agent1);
        uint256 agentId = identity.register{value: 0.01 ether}("", meta);

        vm.prank(agent1);
        identity.setMetadata(agentId, "version", abi.encode("v2"));

        bytes memory val = identity.getMetadata(agentId, "version");
        string memory version = abi.decode(val, (string));
        assertEq(version, "v2");
    }

    function testSetMetadataNotOwner() public {
        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);
        vm.prank(agent1);
        uint256 agentId = identity.register{value: 0.01 ether}("", meta);

        vm.prank(agent2);
        vm.expectRevert("Not agent owner");
        identity.setMetadata(agentId, "key", "value");
    }

    // ============ Wallet Rotation ============

    function testSetAgentWallet() public {
        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);
        vm.prank(agent1);
        uint256 agentId = identity.register{value: 0.01 ether}("", meta);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 messageHash = keccak256(
            abi.encodePacked(agentId, newWallet, deadline, address(identity), block.chainid)
        );
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(newWalletPk, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(agent1);
        identity.setAgentWallet(agentId, newWallet, deadline, signature);

        assertEq(identity.getAgentWallet(agentId), newWallet);
        assertTrue(identity.isRegisteredAgent(newWallet));
        assertFalse(identity.isRegisteredAgent(agent1));
    }

    function testSetAgentWalletExpired() public {
        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);
        vm.prank(agent1);
        uint256 agentId = identity.register{value: 0.01 ether}("", meta);

        uint256 deadline = block.timestamp - 1;
        bytes memory fakeSignature = new bytes(65);

        vm.prank(agent1);
        vm.expectRevert("Signature expired");
        identity.setAgentWallet(agentId, newWallet, deadline, fakeSignature);
    }

    function testSetAgentWalletAlreadyRegistered() public {
        vm.deal(agent1, 1 ether);
        vm.deal(agent2, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);

        vm.prank(agent1);
        identity.register{value: 0.01 ether}("", meta);

        vm.prank(agent2);
        identity.register{value: 0.01 ether}("", meta);

        // Try to set agent1's wallet to agent2 (already registered)
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory fakeSignature = new bytes(65);

        vm.prank(agent1);
        vm.expectRevert("Wallet already registered");
        identity.setAgentWallet(0, agent2, deadline, fakeSignature);
    }

    // ============ Staking ============

    function testAddStake() public {
        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);
        vm.prank(agent1);
        uint256 agentId = identity.register{value: 0.01 ether}("", meta);

        identity.addStake{value: 0.05 ether}(agentId);
        assertEq(identity.getStake(agentId), 0.06 ether);
    }

    function testAddStakeZero() public {
        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);
        vm.prank(agent1);
        uint256 agentId = identity.register{value: 0.01 ether}("", meta);

        vm.expectRevert("Zero value");
        identity.addStake{value: 0}(agentId);
    }

    // ============ Enumerable ============

    function testTokenByIndex() public {
        vm.deal(agent1, 1 ether);
        vm.deal(agent2, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);

        vm.prank(agent1);
        identity.register{value: 0.01 ether}("", meta);

        vm.prank(agent2);
        identity.register{value: 0.01 ether}("", meta);

        assertEq(identity.tokenByIndex(0), 0);
        assertEq(identity.tokenByIndex(1), 1);
    }

    // ============ ERC-721 Compliance ============

    function testBalanceOf() public {
        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);
        vm.prank(agent1);
        identity.register{value: 0.01 ether}("", meta);

        assertEq(identity.balanceOf(agent1), 1);
        assertEq(identity.balanceOf(agent2), 0);
    }

    function testSupportsInterface() public view {
        // ERC-721
        assertTrue(identity.supportsInterface(0x80ac58cd));
        // ERC-165
        assertTrue(identity.supportsInterface(0x01ffc9a7));
    }

    // ============ Unset Wallet ============

    function testUnsetAgentWallet() public {
        vm.deal(agent1, 1 ether);
        IAgentIdentity.MetadataEntry[] memory meta = new IAgentIdentity.MetadataEntry[](0);
        vm.prank(agent1);
        uint256 agentId = identity.register{value: 0.01 ether}("", meta);

        vm.prank(agent1);
        identity.unsetAgentWallet(agentId);

        assertEq(identity.getAgentWallet(agentId), address(0));
        assertFalse(identity.isRegisteredAgent(agent1));
    }
}
