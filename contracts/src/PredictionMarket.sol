// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAgentRegistry.sol";

contract PredictionMarket is ReentrancyGuard, Ownable {
    // ============ Enums ============

    enum Outcome { YES, NO }
    enum MarketStatus { OPEN, SETTLEMENT_REQUESTED, SETTLED, CANCELLED }

    // ============ Structs ============

    struct Market {
        address creator;
        string question;
        uint256 createdAt;
        uint256 deadline;
        uint256 settlementDeadline;
        MarketStatus status;
        Outcome outcome;
        uint16 confidenceScore;
        uint256 yesPool;
        uint256 noPool;
        uint256 totalBettors;
        bool isAgentCreated;
        address creatorAgent;
    }

    struct Prediction {
        uint256 amount;
        Outcome choice;
        bool claimed;
        bool isAgent;
        address agentAddress;
    }

    // ============ State Variables ============

    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Prediction)) public predictions;
    mapping(uint256 => address[]) private _marketBettors;

    address public immutable creForwarder;
    IAgentRegistry public agentRegistry;

    uint256 public constant MIN_BET = 0.001 ether;
    uint256 public constant PLATFORM_FEE_BPS = 200; // 2%
    uint256 public constant MIN_CONFIDENCE = 5000; // 50%
    uint256 public accumulatedFees;

    // ============ Events ============

    event MarketCreated(
        uint256 indexed marketId,
        string question,
        address indexed creator,
        uint256 deadline,
        bool isAgentCreated
    );

    event PredictionPlaced(
        uint256 indexed marketId,
        address indexed bettor,
        Outcome choice,
        uint256 amount,
        bool isAgent
    );

    event SettlementRequested(uint256 indexed marketId, string question);

    event MarketSettled(
        uint256 indexed marketId,
        Outcome outcome,
        uint16 confidence,
        uint256 yesPool,
        uint256 noPool
    );

    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed bettor,
        uint256 amount
    );

    event MarketCancelled(uint256 indexed marketId);

    // ============ Constructor ============

    constructor(address _creForwarder, address _agentRegistry) Ownable(msg.sender) {
        creForwarder = _creForwarder;
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    // ============ Market Lifecycle ============

    function createMarket(
        string calldata _question,
        uint256 _duration,
        uint256 _settlementBuffer,
        bool _isAgentCreated,
        address _agentAddress
    ) public returns (uint256) {
        require(bytes(_question).length > 0, "Empty question");
        require(_duration >= 1 hours, "Duration too short");

        uint256 marketId = nextMarketId++;
        markets[marketId] = Market({
            creator: msg.sender,
            question: _question,
            createdAt: block.timestamp,
            deadline: block.timestamp + _duration,
            settlementDeadline: block.timestamp + _duration + _settlementBuffer,
            status: MarketStatus.OPEN,
            outcome: Outcome.YES,
            confidenceScore: 0,
            yesPool: 0,
            noPool: 0,
            totalBettors: 0,
            isAgentCreated: _isAgentCreated,
            creatorAgent: _agentAddress
        });

        if (_isAgentCreated && _agentAddress != address(0)) {
            try agentRegistry.recordMarketCreated(_agentAddress) {} catch {}
        }

        emit MarketCreated(marketId, _question, msg.sender, block.timestamp + _duration, _isAgentCreated);
        return marketId;
    }

    function predict(uint256 _marketId, Outcome _choice) external payable nonReentrant {
        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp < m.deadline, "Betting closed");
        require(msg.value >= MIN_BET, "Below minimum bet");
        require(predictions[_marketId][msg.sender].amount == 0, "Already bet");

        bool isAgent = agentRegistry.isRegistered(msg.sender);

        predictions[_marketId][msg.sender] = Prediction({
            amount: msg.value,
            choice: _choice,
            claimed: false,
            isAgent: isAgent,
            agentAddress: isAgent ? msg.sender : address(0)
        });

        _marketBettors[_marketId].push(msg.sender);

        if (_choice == Outcome.YES) {
            m.yesPool += msg.value;
        } else {
            m.noPool += msg.value;
        }
        m.totalBettors++;

        emit PredictionPlaced(_marketId, msg.sender, _choice, msg.value, isAgent);
    }

    function requestSettlement(uint256 _marketId) external {
        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.OPEN, "Not open");
        require(block.timestamp >= m.deadline, "Betting not closed");
        m.status = MarketStatus.SETTLEMENT_REQUESTED;
        emit SettlementRequested(_marketId, m.question);
    }

    function claim(uint256 _marketId) external nonReentrant {
        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.SETTLED, "Not settled");

        Prediction storage p = predictions[_marketId][msg.sender];
        require(p.amount > 0, "No prediction");
        require(!p.claimed, "Already claimed");
        require(p.choice == m.outcome, "Wrong prediction");

        p.claimed = true;

        uint256 totalPool = m.yesPool + m.noPool;
        uint256 winningPool = m.outcome == Outcome.YES ? m.yesPool : m.noPool;
        uint256 fee = (totalPool * PLATFORM_FEE_BPS) / 10000;
        uint256 distributable = totalPool - fee;
        uint256 payout = (p.amount * distributable) / winningPool;

        accumulatedFees += fee / m.totalBettors; // distribute fee tracking

        if (p.isAgent) {
            uint256 profit = payout > p.amount ? payout - p.amount : 0;
            try agentRegistry.recordBetResult(p.agentAddress, true, profit) {} catch {}
        }

        (bool success,) = msg.sender.call{value: payout}("");
        require(success, "Transfer failed");

        emit WinningsClaimed(_marketId, msg.sender, payout);
    }

    function cancelMarket(uint256 _marketId) external onlyOwner {
        Market storage m = markets[_marketId];
        require(
            m.status == MarketStatus.OPEN || m.status == MarketStatus.SETTLEMENT_REQUESTED,
            "Cannot cancel"
        );
        m.status = MarketStatus.CANCELLED;
        emit MarketCancelled(_marketId);
    }

    function claimRefund(uint256 _marketId) external nonReentrant {
        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.CANCELLED, "Not cancelled");

        Prediction storage p = predictions[_marketId][msg.sender];
        require(p.amount > 0, "No prediction");
        require(!p.claimed, "Already claimed");

        p.claimed = true;
        (bool success,) = msg.sender.call{value: p.amount}("");
        require(success, "Transfer failed");
    }

    // ============ CRE Integration ============

    function onReport(bytes calldata report) external {
        require(msg.sender == creForwarder, "Only CRE forwarder");
        _processReport(report);
    }

    function _processReport(bytes calldata report) internal {
        require(report.length > 0, "Empty report");
        uint8 action = uint8(report[0]);

        if (action == 0x00) {
            // Create market
            (
                string memory question,
                uint256 duration,
                uint256 settlementBuffer,
                bool isAgentCreated,
                address agentAddress
            ) = abi.decode(report[1:], (string, uint256, uint256, bool, address));

            _createMarketInternal(question, duration, settlementBuffer, isAgentCreated, agentAddress);
        } else if (action == 0x01) {
            // Settle market
            (
                uint256 marketId,
                uint8 outcomeRaw,
                uint16 confidence
            ) = abi.decode(report[1:], (uint256, uint8, uint16));

            _settleMarket(marketId, Outcome(outcomeRaw), confidence);
        } else {
            revert("Unknown action");
        }
    }

    function _createMarketInternal(
        string memory _question,
        uint256 _duration,
        uint256 _settlementBuffer,
        bool _isAgentCreated,
        address _agentAddress
    ) internal {
        uint256 marketId = nextMarketId++;
        markets[marketId] = Market({
            creator: msg.sender,
            question: _question,
            createdAt: block.timestamp,
            deadline: block.timestamp + _duration,
            settlementDeadline: block.timestamp + _duration + _settlementBuffer,
            status: MarketStatus.OPEN,
            outcome: Outcome.YES,
            confidenceScore: 0,
            yesPool: 0,
            noPool: 0,
            totalBettors: 0,
            isAgentCreated: _isAgentCreated,
            creatorAgent: _agentAddress
        });

        if (_isAgentCreated && _agentAddress != address(0)) {
            try agentRegistry.recordMarketCreated(_agentAddress) {} catch {}
        }

        emit MarketCreated(marketId, _question, msg.sender, block.timestamp + _duration, _isAgentCreated);
    }

    function _settleMarket(
        uint256 _marketId,
        Outcome _outcome,
        uint16 _confidence
    ) internal {
        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.SETTLEMENT_REQUESTED, "Not awaiting settlement");
        require(_confidence >= MIN_CONFIDENCE, "Confidence too low");

        m.status = MarketStatus.SETTLED;
        m.outcome = _outcome;
        m.confidenceScore = _confidence;

        // Record losses for agents who bet wrong
        address[] memory bettors = _marketBettors[_marketId];
        for (uint256 i = 0; i < bettors.length; i++) {
            Prediction storage p = predictions[_marketId][bettors[i]];
            if (p.isAgent && p.choice != _outcome) {
                try agentRegistry.recordBetResult(p.agentAddress, false, p.amount) {} catch {}
            }
        }

        emit MarketSettled(_marketId, _outcome, _confidence, m.yesPool, m.noPool);
    }

    // ============ View Functions ============

    function getMarket(uint256 _marketId) external view returns (Market memory) {
        return markets[_marketId];
    }

    function getPrediction(
        uint256 _marketId,
        address _bettor
    ) external view returns (Prediction memory) {
        return predictions[_marketId][_bettor];
    }

    function getMarketBettors(uint256 _marketId) external view returns (address[] memory) {
        return _marketBettors[_marketId];
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        (bool success,) = owner().call{value: amount}("");
        require(success, "Transfer failed");
    }
}
