// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentRegistry {
    struct Agent {
        address owner;
        string name;
        string strategy;
        uint256 stakedAmount;
        uint256 totalBets;
        uint256 wins;
        uint256 losses;
        uint256 totalProfit;
        uint256 totalLoss;
        uint256 marketsCreated;
        uint256 registeredAt;
        bool isActive;
        uint256 score;
    }

    function isRegistered(address agent) external view returns (bool);
    function recordBetResult(address agent, bool won, uint256 amount) external;
    function recordMarketCreated(address agent) external;
    function agentCount() external view returns (uint256);
    function getAgent(address agent) external view returns (Agent memory);
    function getAgentAddress(uint256 index) external view returns (address);
}
