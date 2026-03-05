// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentRegistry.sol";

contract AgentRegistry is IAgentRegistry, Ownable, ReentrancyGuard {
    uint256 public constant MIN_STAKE = 0.001 ether;

    uint256 public override agentCount;
    mapping(address => Agent) private _agents;
    address[] private _agentList;
    mapping(address => bool) private _isRegistered;

    address public creForwarder;
    address public predictionMarket;

    event AgentRegistered(address indexed agent, string name, uint256 stake);
    event AgentDeactivated(address indexed agent);
    event AgentStatsUpdated(
        address indexed agent,
        uint256 totalBets,
        uint256 wins,
        uint256 losses,
        uint256 score
    );
    event StakeAdded(address indexed agent, uint256 amount);
    event StakeWithdrawn(address indexed agent, uint256 amount);

    modifier onlyAuthorized() {
        require(
            msg.sender == owner() ||
            msg.sender == creForwarder ||
            msg.sender == predictionMarket,
            "Not authorized"
        );
        _;
    }

    constructor(address _creForwarder) Ownable(msg.sender) {
        creForwarder = _creForwarder;
    }

    function registerAgent(
        string calldata _name,
        string calldata _strategy
    ) external payable nonReentrant {
        require(!_isRegistered[msg.sender], "Already registered");
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        require(bytes(_name).length > 0 && bytes(_name).length <= 32, "Invalid name");

        _agents[msg.sender] = Agent({
            owner: msg.sender,
            name: _name,
            strategy: _strategy,
            stakedAmount: msg.value,
            totalBets: 0,
            wins: 0,
            losses: 0,
            totalProfit: 0,
            totalLoss: 0,
            marketsCreated: 0,
            registeredAt: block.timestamp,
            isActive: true,
            score: 0
        });

        _isRegistered[msg.sender] = true;
        _agentList.push(msg.sender);
        agentCount++;

        emit AgentRegistered(msg.sender, _name, msg.value);
    }

    function addStake() external payable nonReentrant {
        require(_isRegistered[msg.sender], "Not registered");
        require(msg.value > 0, "Zero value");
        _agents[msg.sender].stakedAmount += msg.value;
        emit StakeAdded(msg.sender, msg.value);
    }

    function recordBetResult(
        address agent,
        bool won,
        uint256 amount
    ) external override onlyAuthorized {
        require(_isRegistered[agent], "Agent not registered");
        Agent storage a = _agents[agent];
        a.totalBets++;
        if (won) {
            a.wins++;
            a.totalProfit += amount;
        } else {
            a.losses++;
            a.totalLoss += amount;
        }
        a.score = _calculateScore(agent);
        emit AgentStatsUpdated(agent, a.totalBets, a.wins, a.losses, a.score);
    }

    function recordMarketCreated(address agent) external override onlyAuthorized {
        require(_isRegistered[agent], "Agent not registered");
        _agents[agent].marketsCreated++;
    }

    function deactivateAgent(address agent) external {
        require(
            msg.sender == agent || msg.sender == owner(),
            "Not agent or owner"
        );
        require(_isRegistered[agent], "Not registered");
        _agents[agent].isActive = false;
        emit AgentDeactivated(agent);
    }

    function setPredictionMarket(address _market) external onlyOwner {
        predictionMarket = _market;
    }

    function setCreForwarder(address _forwarder) external onlyOwner {
        creForwarder = _forwarder;
    }

    // ============ View Functions ============

    function isRegistered(address agent) external view override returns (bool) {
        return _isRegistered[agent];
    }

    function getAgent(address agent) external view override returns (Agent memory) {
        return _agents[agent];
    }

    function getAgentAddress(uint256 index) external view override returns (address) {
        require(index < _agentList.length, "Index out of bounds");
        return _agentList[index];
    }

    function getLeaderboard(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory addrs, Agent[] memory data) {
        uint256 total = _agentList.length;
        if (offset >= total) {
            return (new address[](0), new Agent[](0));
        }
        uint256 end = offset + limit > total ? total : offset + limit;
        uint256 count = end - offset;
        addrs = new address[](count);
        data = new Agent[](count);
        for (uint256 i = 0; i < count; i++) {
            addrs[i] = _agentList[offset + i];
            data[i] = _agents[_agentList[offset + i]];
        }
    }

    function getAllAgentAddresses() external view returns (address[] memory) {
        return _agentList;
    }

    // ============ Internal ============

    function _calculateScore(address agent) internal view returns (uint256) {
        Agent storage a = _agents[agent];
        if (a.totalBets == 0) return 0;
        uint256 winRate = (a.wins * 10000) / a.totalBets;
        uint256 netProfit = a.totalProfit > a.totalLoss
            ? a.totalProfit - a.totalLoss
            : 0;
        return winRate + (netProfit / 1e15);
    }
}
