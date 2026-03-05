// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentReputation - ERC-8004 Reputation Registry Interface
/// @notice Defines the reputation/feedback layer for trustless AI agents
interface IAgentReputation {
    struct Feedback {
        address client;
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        string endpoint;
        bytes32 feedbackHash;
        uint256 timestamp;
        bool revoked;
    }

    struct FeedbackInput {
        uint256 agentId;
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        string endpoint;
        bytes32 feedbackHash;
    }

    // ============ Events (ERC-8004) ============

    event NewFeedback(
        uint256 indexed agentId,
        address indexed client,
        uint64 feedbackIndex,
        int128 value,
        string tag1,
        string tag2
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed client,
        uint64 indexed feedbackIndex
    );

    // ============ Feedback ============

    /// @notice Give feedback to an agent
    function giveFeedback(FeedbackInput calldata input) external returns (uint64 feedbackIndex);

    /// @notice Revoke previously given feedback
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external;

    // ============ Queries ============

    /// @notice Get aggregated reputation summary for an agent by tags
    function getSummary(
        uint256 agentId,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);

    /// @notice Read a specific feedback entry
    function readFeedback(
        uint256 agentId,
        address client,
        uint64 feedbackIndex
    ) external view returns (Feedback memory);

    /// @notice Read all feedback for an agent filtered by tags
    function readAllFeedback(
        uint256 agentId,
        string calldata tag1,
        string calldata tag2,
        bool includeRevoked
    ) external view returns (Feedback[] memory);

    /// @notice Get all clients who gave feedback to an agent
    function getClients(uint256 agentId) external view returns (address[] memory);

    /// @notice Get the last feedback index for a client-agent pair
    function getLastIndex(uint256 agentId, address client) external view returns (uint64);
}
