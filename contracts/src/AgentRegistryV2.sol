// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./interfaces/IAgentRegistry.sol";
import "./interfaces/IAgentIdentity.sol";
import "./interfaces/IAgentReputation.sol";
import "./AgentIdentity.sol";
import "./AgentReputation.sol";

/// @title AgentRegistryV2 - ERC-8004 Bridge for AgentBet
/// @notice Implements IAgentRegistry using ERC-8004 Identity + Reputation under the hood
/// @dev PredictionMarket, RewardDistributor, AutoSettler require ZERO changes
contract AgentRegistryV2 is IAgentRegistry, Ownable, ReentrancyGuard {
    AgentIdentity public agentIdentity;
    AgentReputation public agentReputation;

    address public creForwarder;
    address public predictionMarket;

    // Performance stats (kept separate from identity NFT)
    struct AgentStats {
        uint256 totalBets;
        uint256 wins;
        uint256 losses;
        uint256 totalProfit;
        uint256 totalLoss;
        uint256 marketsCreated;
        uint256 score;
    }
    mapping(address => AgentStats) private _stats;

    // ============ Events ============

    event AgentStatsUpdated(
        address indexed agent,
        uint256 totalBets,
        uint256 wins,
        uint256 losses,
        uint256 score
    );

    // ============ Modifiers ============

    modifier onlyAuthorized() {
        require(
            msg.sender == owner() ||
            msg.sender == creForwarder ||
            msg.sender == predictionMarket,
            "Not authorized"
        );
        _;
    }

    // ============ Constructor ============

    constructor(
        address _agentIdentity,
        address _agentReputation,
        address _creForwarder
    ) Ownable(msg.sender) {
        agentIdentity = AgentIdentity(_agentIdentity);
        agentReputation = AgentReputation(_agentReputation);
        creForwarder = _creForwarder;
    }

    // ============ Admin ============

    function setPredictionMarket(address _market) external onlyOwner {
        predictionMarket = _market;
    }

    function setCreForwarder(address _forwarder) external onlyOwner {
        creForwarder = _forwarder;
    }

    // ============ IAgentRegistry Implementation ============

    /// @inheritdoc IAgentRegistry
    function isRegistered(address agent) external view override returns (bool) {
        return agentIdentity.isRegisteredAgent(agent);
    }

    /// @inheritdoc IAgentRegistry
    function recordBetResult(
        address agent,
        bool won,
        uint256 amount
    ) external override onlyAuthorized {
        require(agentIdentity.isRegisteredAgent(agent), "Agent not registered");

        AgentStats storage s = _stats[agent];
        s.totalBets++;
        if (won) {
            s.wins++;
            s.totalProfit += amount;
        } else {
            s.losses++;
            s.totalLoss += amount;
        }
        s.score = _calculateScore(agent);

        // Auto-post ERC-8004 reputation feedback
        uint256 agentId = agentIdentity.getAgentIdByWallet(agent);
        agentReputation.giveFeedback(IAgentReputation.FeedbackInput({
            agentId: agentId,
            value: won ? int128(1) : int128(-1),
            valueDecimals: 0,
            tag1: "prediction",
            tag2: won ? "win" : "loss",
            endpoint: "predict",
            feedbackHash: bytes32(0)
        }));

        emit AgentStatsUpdated(agent, s.totalBets, s.wins, s.losses, s.score);
    }

    /// @inheritdoc IAgentRegistry
    function recordMarketCreated(address agent) external override onlyAuthorized {
        require(agentIdentity.isRegisteredAgent(agent), "Agent not registered");
        _stats[agent].marketsCreated++;

        // Auto-post ERC-8004 reputation feedback
        uint256 agentId = agentIdentity.getAgentIdByWallet(agent);
        agentReputation.giveFeedback(IAgentReputation.FeedbackInput({
            agentId: agentId,
            value: int128(1),
            valueDecimals: 0,
            tag1: "market-creation",
            tag2: "",
            endpoint: "createMarket",
            feedbackHash: bytes32(0)
        }));
    }

    /// @inheritdoc IAgentRegistry
    function agentCount() external view override returns (uint256) {
        return agentIdentity.totalAgents();
    }

    /// @inheritdoc IAgentRegistry
    function getAgent(address agent) external view override returns (Agent memory) {
        uint256 agentId = agentIdentity.getAgentIdByWallet(agent);
        AgentStats storage s = _stats[agent];

        // Read name and strategy from identity metadata
        bytes memory nameBytes = agentIdentity.getMetadata(agentId, "name");
        bytes memory strategyBytes = agentIdentity.getMetadata(agentId, "strategy");

        string memory name = nameBytes.length > 0 ? abi.decode(nameBytes, (string)) : "";
        string memory strategy = strategyBytes.length > 0 ? abi.decode(strategyBytes, (string)) : "";

        return Agent({
            owner: agent,
            name: name,
            strategy: strategy,
            stakedAmount: agentIdentity.getStake(agentId),
            totalBets: s.totalBets,
            wins: s.wins,
            losses: s.losses,
            totalProfit: s.totalProfit,
            totalLoss: s.totalLoss,
            marketsCreated: s.marketsCreated,
            registeredAt: 0, // Can be derived from NFT mint event
            isActive: true,
            score: s.score
        });
    }

    /// @inheritdoc IAgentRegistry
    function getAgentAddress(uint256 index) external view override returns (address) {
        uint256 agentId = agentIdentity.tokenByIndex(index);
        return agentIdentity.getAgentWallet(agentId);
    }

    // ============ Extended Functions ============

    function getLeaderboard(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory addrs, Agent[] memory data) {
        uint256 total = agentIdentity.totalAgents();
        if (offset >= total) {
            return (new address[](0), new Agent[](0));
        }
        uint256 end = offset + limit > total ? total : offset + limit;
        uint256 count = end - offset;
        addrs = new address[](count);
        data = new Agent[](count);

        for (uint256 i = 0; i < count; i++) {
            uint256 agentId = agentIdentity.tokenByIndex(offset + i);
            address wallet = agentIdentity.getAgentWallet(agentId);
            addrs[i] = wallet;
            data[i] = this.getAgent(wallet);
        }
    }

    function deactivateAgent(address) external pure {
        revert("Use AgentIdentity NFT transfer/burn");
    }

    // ============ Internal ============

    function _calculateScore(address agent) internal view returns (uint256) {
        AgentStats storage s = _stats[agent];
        if (s.totalBets == 0) return 0;
        uint256 winRate = (s.wins * 10000) / s.totalBets;
        uint256 netProfit = s.totalProfit > s.totalLoss
            ? s.totalProfit - s.totalLoss
            : 0;
        return winRate + (netProfit / 1e15);
    }
}
