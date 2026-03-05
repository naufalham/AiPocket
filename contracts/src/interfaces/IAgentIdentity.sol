// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentIdentity - ERC-8004 Identity Registry Interface
/// @notice Defines the identity layer for trustless AI agents (ERC-721 based)
interface IAgentIdentity {
    struct MetadataEntry {
        string key;
        bytes value;
    }

    // ============ Events (ERC-8004) ============

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentURI);
    event URIUpdated(uint256 indexed agentId, string newURI);
    event MetadataSet(uint256 indexed agentId, string key);
    event WalletUpdated(uint256 indexed agentId, address indexed newWallet);

    // ============ Registration ============

    /// @notice Register a new agent with URI and metadata
    /// @param agentURI The URI pointing to the agent's registration file
    /// @param metadata Array of key-value metadata entries
    /// @return agentId The newly minted agent NFT token ID
    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external payable returns (uint256 agentId);

    // ============ Identity Management ============

    /// @notice Update the agent's URI
    function setAgentURI(uint256 agentId, string calldata newURI) external;

    /// @notice Rotate the agent's active wallet with signature verification
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external;

    /// @notice Get the active wallet for an agent
    function getAgentWallet(uint256 agentId) external view returns (address);

    /// @notice Remove wallet mapping for an agent
    function unsetAgentWallet(uint256 agentId) external;

    // ============ Metadata ============

    /// @notice Get metadata value for a given key
    function getMetadata(uint256 agentId, string calldata key) external view returns (bytes memory);

    /// @notice Set metadata key-value pair
    function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external;

    // ============ Staking ============

    /// @notice Add stake for an existing agent
    function addStake(uint256 agentId) external payable;

    /// @notice Get stake amount for an agent
    function getStake(uint256 agentId) external view returns (uint256);

    // ============ Reverse Lookups (Backward Compat) ============

    /// @notice Check if a wallet address has a registered agent
    function isRegisteredAgent(address wallet) external view returns (bool);

    /// @notice Get agent ID from wallet address
    function getAgentIdByWallet(address wallet) external view returns (uint256);

    /// @notice Get total number of registered agents
    function totalAgents() external view returns (uint256);
}
