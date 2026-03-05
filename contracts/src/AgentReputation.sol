// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAgentReputation.sol";
import "./interfaces/IAgentIdentity.sol";

/// @title AgentReputation - ERC-8004 Reputation Registry for AgentBet
/// @notice Tracks on-chain feedback/reputation for AI agents
/// @dev Auto-populated from prediction market results via AgentRegistryV2
contract AgentReputation is IAgentReputation, Ownable {
    IAgentIdentity public agentIdentity;

    // agentId -> all feedbacks
    mapping(uint256 => Feedback[]) private _feedbacks;

    // agentId -> client -> feedback indices
    mapping(uint256 => mapping(address => uint64[])) private _clientFeedbacks;

    // agentId -> set of unique clients
    mapping(uint256 => address[]) private _clients;
    mapping(uint256 => mapping(address => bool)) private _isClient;

    // Summary cache: agentId -> tag1 -> tag2 -> (count, sumValue)
    struct SummaryCache {
        uint64 count;
        int128 sumValue;
    }
    mapping(uint256 => mapping(string => mapping(string => SummaryCache))) private _summaries;

    // Authorized callers (AgentRegistryV2)
    mapping(address => bool) public authorized;

    // ============ Constructor ============

    constructor(address _agentIdentity) Ownable(msg.sender) {
        agentIdentity = IAgentIdentity(_agentIdentity);
    }

    // ============ Authorization ============

    function setAuthorized(address caller, bool status) external onlyOwner {
        authorized[caller] = status;
    }

    // ============ Feedback (ERC-8004) ============

    /// @inheritdoc IAgentReputation
    function giveFeedback(
        FeedbackInput calldata input
    ) external returns (uint64 feedbackIndex) {
        require(agentIdentity.getAgentWallet(input.agentId) != address(0), "Agent does not exist");

        feedbackIndex = uint64(_feedbacks[input.agentId].length);

        _feedbacks[input.agentId].push(Feedback({
            client: msg.sender,
            value: input.value,
            valueDecimals: input.valueDecimals,
            tag1: input.tag1,
            tag2: input.tag2,
            endpoint: input.endpoint,
            feedbackHash: input.feedbackHash,
            timestamp: block.timestamp,
            revoked: false
        }));

        _trackClient(input.agentId, feedbackIndex);
        _updateSummary(input.agentId, input.tag1, input.tag2, input.value);

        emit NewFeedback(input.agentId, msg.sender, feedbackIndex, input.value, input.tag1, input.tag2);
    }

    function _trackClient(uint256 agentId, uint64 feedbackIndex) internal {
        _clientFeedbacks[agentId][msg.sender].push(feedbackIndex);
        if (!_isClient[agentId][msg.sender]) {
            _clients[agentId].push(msg.sender);
            _isClient[agentId][msg.sender] = true;
        }
    }

    function _updateSummary(uint256 agentId, string calldata tag1, string calldata tag2, int128 value) internal {
        _summaries[agentId][tag1][tag2].count++;
        _summaries[agentId][tag1][tag2].sumValue += value;
        _summaries[agentId][""][""].count++;
        _summaries[agentId][""][""].sumValue += value;
    }

    /// @inheritdoc IAgentReputation
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        require(feedbackIndex < _feedbacks[agentId].length, "Invalid index");
        Feedback storage f = _feedbacks[agentId][feedbackIndex];
        require(f.client == msg.sender, "Not feedback giver");
        require(!f.revoked, "Already revoked");

        f.revoked = true;

        _summaries[agentId][f.tag1][f.tag2].count--;
        _summaries[agentId][f.tag1][f.tag2].sumValue -= f.value;
        _summaries[agentId][""][""].count--;
        _summaries[agentId][""][""].sumValue -= f.value;

        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    // ============ Queries (ERC-8004) ============

    /// @inheritdoc IAgentReputation
    function getSummary(
        uint256 agentId,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals) {
        SummaryCache storage s = _summaries[agentId][tag1][tag2];
        return (s.count, s.sumValue, 0);
    }

    /// @inheritdoc IAgentReputation
    function readFeedback(
        uint256 agentId,
        address client,
        uint64 feedbackIndex
    ) external view returns (Feedback memory) {
        uint64[] storage indices = _clientFeedbacks[agentId][client];
        require(feedbackIndex < indices.length, "Invalid index");
        return _feedbacks[agentId][indices[feedbackIndex]];
    }

    /// @inheritdoc IAgentReputation
    function readAllFeedback(
        uint256 agentId,
        string calldata tag1,
        string calldata tag2,
        bool includeRevoked
    ) external view returns (Feedback[] memory) {
        Feedback[] storage all = _feedbacks[agentId];
        bool filterByTag = bytes(tag1).length > 0 || bytes(tag2).length > 0;

        uint256 matchCount = _countMatches(all, tag1, tag2, filterByTag, includeRevoked);

        Feedback[] memory result = new Feedback[](matchCount);
        uint256 idx;
        for (uint256 i = 0; i < all.length; i++) {
            if (_matchesFeedback(all[i], tag1, tag2, filterByTag, includeRevoked)) {
                result[idx++] = all[i];
            }
        }
        return result;
    }

    function _countMatches(
        Feedback[] storage all,
        string calldata tag1,
        string calldata tag2,
        bool filterByTag,
        bool includeRevoked
    ) internal view returns (uint256 count) {
        for (uint256 i = 0; i < all.length; i++) {
            if (_matchesFeedback(all[i], tag1, tag2, filterByTag, includeRevoked)) {
                count++;
            }
        }
    }

    function _matchesFeedback(
        Feedback storage f,
        string calldata tag1,
        string calldata tag2,
        bool filterByTag,
        bool includeRevoked
    ) internal view returns (bool) {
        if (!includeRevoked && f.revoked) return false;
        if (!filterByTag) return true;
        bool tag1Match = bytes(tag1).length == 0 || keccak256(bytes(f.tag1)) == keccak256(bytes(tag1));
        bool tag2Match = bytes(tag2).length == 0 || keccak256(bytes(f.tag2)) == keccak256(bytes(tag2));
        return tag1Match && tag2Match;
    }

    /// @inheritdoc IAgentReputation
    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    /// @inheritdoc IAgentReputation
    function getLastIndex(uint256 agentId, address client) external view returns (uint64) {
        uint64[] storage indices = _clientFeedbacks[agentId][client];
        require(indices.length > 0, "No feedback");
        return indices[indices.length - 1];
    }
}
