// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAgentRegistry.sol";

/// @title RewardDistributor - VRF-powered random rewards for top agents
/// @notice Uses Chainlink VRF v2.5 to randomly distribute bonus rewards to registered agents
/// @dev Supports both pseudo-random (demo) and real VRF v2.5 (production) paths
contract RewardDistributor is Ownable {
    IAgentRegistry public agentRegistry;

    // VRF v2.5 configuration
    address public vrfCoordinator;
    bytes32 public keyHash;
    uint256 public subscriptionId;
    uint16 public requestConfirmations = 3;
    uint32 public callbackGasLimit = 200000;

    // Round state
    uint256 public currentRound;
    mapping(uint256 => RewardRound) public rounds;
    mapping(uint256 => uint256) public vrfRequestToRound; // VRF requestId → roundId

    struct RewardRound {
        address winner;
        uint256 rewardAmount;
        uint256 randomWord;
        bool fulfilled;
        uint256 timestamp;
    }

    event RewardRoundStarted(uint256 indexed round, uint256 rewardAmount);
    event RewardDistributed(uint256 indexed round, address indexed winner, uint256 amount);
    event VRFRequested(uint256 indexed round, uint256 requestId);
    event VRFConfigured(address coordinator, bytes32 keyHash, uint256 subscriptionId);

    constructor(address _agentRegistry) Ownable(msg.sender) {
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    // ============ VRF v2.5 Configuration ============

    /// @notice Configure Chainlink VRF v2.5 parameters
    /// @param _coordinator VRF Coordinator address (Base Sepolia: 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE)
    /// @param _keyHash Gas lane key hash
    /// @param _subscriptionId VRF subscription ID
    function configureVRF(
        address _coordinator,
        bytes32 _keyHash,
        uint256 _subscriptionId
    ) external onlyOwner {
        vrfCoordinator = _coordinator;
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
        emit VRFConfigured(_coordinator, _keyHash, _subscriptionId);
    }

    /// @notice Update VRF callback gas limit
    function setCallbackGasLimit(uint32 _gasLimit) external onlyOwner {
        callbackGasLimit = _gasLimit;
    }

    // ============ Reward Rounds ============

    /// @notice Start a reward round with pseudo-random winner selection (demo mode)
    /// @dev For hackathon demo — uses block-based randomness for instant resolution
    function startRewardRound() external payable onlyOwner {
        require(msg.value > 0, "Must fund reward");
        uint256 count = agentRegistry.agentCount();
        require(count > 0, "No agents registered");

        uint256 roundId = currentRound++;

        // Demo mode: use pseudo-random (in production: call requestRandomWords)
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

    /// @notice Start a reward round using Chainlink VRF v2.5 (production mode)
    /// @dev Funds the round and requests randomness from VRF Coordinator
    function startRewardRoundVRF() external payable onlyOwner {
        require(msg.value > 0, "Must fund reward");
        require(vrfCoordinator != address(0), "VRF not configured");
        uint256 count = agentRegistry.agentCount();
        require(count > 0, "No agents registered");

        uint256 roundId = currentRound++;

        rounds[roundId] = RewardRound({
            winner: address(0),
            rewardAmount: msg.value,
            randomWord: 0,
            fulfilled: false,
            timestamp: block.timestamp
        });

        // Request random words from VRF v2.5 Coordinator
        // Interface: requestRandomWords(keyHash, subId, minConf, callbackGas, numWords)
        (bool success, bytes memory data) = vrfCoordinator.call(
            abi.encodeWithSignature(
                "requestRandomWords(bytes32,uint256,uint16,uint32,uint32)",
                keyHash,
                subscriptionId,
                requestConfirmations,
                callbackGasLimit,
                uint32(1) // numWords
            )
        );
        require(success, "VRF request failed");
        uint256 requestId = abi.decode(data, (uint256));

        vrfRequestToRound[requestId] = roundId;

        emit RewardRoundStarted(roundId, msg.value);
        emit VRFRequested(roundId, requestId);
    }

    /// @notice Callback from VRF Coordinator with random words
    /// @dev Called by VRF Coordinator after randomness is generated
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        require(msg.sender == vrfCoordinator, "Only VRF Coordinator");

        uint256 roundId = vrfRequestToRound[requestId];
        RewardRound storage r = rounds[roundId];
        require(!r.fulfilled, "Already fulfilled");
        require(r.rewardAmount > 0, "Round not funded");

        uint256 randomWord = randomWords[0];
        uint256 count = agentRegistry.agentCount();
        uint256 winnerIndex = randomWord % count;
        address winner = agentRegistry.getAgentAddress(winnerIndex);

        r.winner = winner;
        r.randomWord = randomWord;
        r.fulfilled = true;

        (bool success,) = winner.call{value: r.rewardAmount}("");
        require(success, "Transfer failed");

        emit RewardDistributed(roundId, winner, r.rewardAmount);
    }

    /// @notice Manual VRF fulfillment (fallback if VRF callback fails)
    function fulfillRewardWithVRF(uint256 roundId, uint256 randomWord) external onlyOwner {
        RewardRound storage r = rounds[roundId];
        require(!r.fulfilled, "Already fulfilled");
        require(r.rewardAmount > 0, "Round not funded");

        uint256 count = agentRegistry.agentCount();
        uint256 winnerIndex = randomWord % count;
        address winner = agentRegistry.getAgentAddress(winnerIndex);

        r.winner = winner;
        r.randomWord = randomWord;
        r.fulfilled = true;

        (bool success,) = winner.call{value: r.rewardAmount}("");
        require(success, "Transfer failed");

        emit RewardDistributed(roundId, winner, r.rewardAmount);
    }

    // ============ Views ============

    function getRound(uint256 roundId) external view returns (RewardRound memory) {
        return rounds[roundId];
    }

    function isVRFConfigured() external view returns (bool) {
        return vrfCoordinator != address(0);
    }
}
