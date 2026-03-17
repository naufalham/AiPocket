// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAgentRegistry.sol";

/// @title RewardDistributor - Random rewards for top agents on Polkadot Hub
/// @notice Uses block-based randomness (prevrandao) to distribute bonus rewards to registered agents
contract RewardDistributor is Ownable {
    IAgentRegistry public agentRegistry;

    uint256 public currentRound;
    mapping(uint256 => RewardRound) public rounds;

    struct RewardRound {
        address winner;
        uint256 rewardAmount;
        uint256 randomWord;
        bool fulfilled;
        uint256 timestamp;
    }

    event RewardRoundStarted(uint256 indexed round, uint256 rewardAmount);
    event RewardDistributed(uint256 indexed round, address indexed winner, uint256 amount);

    constructor(address _agentRegistry) Ownable(msg.sender) {
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /// @notice Start a reward round — randomly selects a winning agent using block entropy
    /// @dev Uses keccak256(block.timestamp, block.prevrandao, roundId) for randomness
    function startRewardRound() external payable onlyOwner {
        require(msg.value > 0, "Must fund reward");
        uint256 count = agentRegistry.agentCount();
        require(count > 0, "No agents registered");

        uint256 roundId = currentRound++;

        uint256 randomWord = uint256(
            keccak256(abi.encodePacked(block.timestamp, block.prevrandao, roundId))
        );

        uint256 winnerIndex = randomWord % count;
        address winner = agentRegistry.getAgentAddress(winnerIndex);

        rounds[roundId] = RewardRound({
            winner: winner,
            rewardAmount: msg.value,
            randomWord: randomWord,
            fulfilled: true,
            timestamp: block.timestamp
        });

        (bool success,) = winner.call{value: msg.value}("");
        require(success, "Transfer failed");

        emit RewardRoundStarted(roundId, msg.value);
        emit RewardDistributed(roundId, winner, msg.value);
    }

    // ============ Views ============

    function getRound(uint256 roundId) external view returns (RewardRound memory) {
        return rounds[roundId];
    }
}
