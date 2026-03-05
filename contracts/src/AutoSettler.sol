// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PredictionMarket.sol";

/// @title AutoSettler - Chainlink Automation compatible contract
/// @notice Automatically calls requestSettlement on expired markets
/// @dev Supports batch settlement for gas efficiency
contract AutoSettler {
    PredictionMarket public immutable market;

    /// @notice Track the last checked market ID for gas-efficient scanning
    uint256 public lastCheckedId;

    /// @notice Maximum markets to check per upkeep (gas budget control)
    uint256 public maxCheckBatch = 50;

    event MarketSettlementTriggered(uint256 indexed marketId);
    event BatchSettlement(uint256 count);

    constructor(address _market) {
        market = PredictionMarket(_market);
    }

    /// @notice Chainlink Automation: check if any market needs settlement
    /// @dev Scans from lastCheckedId and wraps around for gas efficiency
    function checkUpkeep(bytes calldata)
        external
        view
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 total = market.nextMarketId();
        if (total == 0) return (false, "");

        // Collect up to 10 expired markets per batch
        uint256[] memory expired = new uint256[](10);
        uint256 count = 0;
        uint256 checked = 0;

        for (uint256 i = 0; i < total && checked < maxCheckBatch; i++) {
            uint256 idx = (lastCheckedId + i) % total;
            checked++;

            PredictionMarket.Market memory m = market.getMarket(idx);
            if (
                m.status == PredictionMarket.MarketStatus.OPEN &&
                block.timestamp >= m.deadline
            ) {
                expired[count] = idx;
                count++;
                if (count >= 10) break;
            }
        }

        if (count > 0) {
            // Encode only the markets that need settlement
            uint256[] memory result = new uint256[](count);
            for (uint256 i = 0; i < count; i++) {
                result[i] = expired[i];
            }
            return (true, abi.encode(result));
        }
        return (false, "");
    }

    /// @notice Chainlink Automation: execute settlement requests (supports batch)
    function performUpkeep(bytes calldata performData) external {
        uint256[] memory marketIds = abi.decode(performData, (uint256[]));
        uint256 settled = 0;

        for (uint256 i = 0; i < marketIds.length; i++) {
            PredictionMarket.Market memory m = market.getMarket(marketIds[i]);
            if (
                m.status == PredictionMarket.MarketStatus.OPEN &&
                block.timestamp >= m.deadline
            ) {
                market.requestSettlement(marketIds[i]);
                emit MarketSettlementTriggered(marketIds[i]);
                settled++;
            }
        }

        // Advance scan pointer for next check
        uint256 total = market.nextMarketId();
        if (total > 0) {
            lastCheckedId = (marketIds[marketIds.length - 1] + 1) % total;
        }

        if (settled > 0) {
            emit BatchSettlement(settled);
        }
    }

    /// @notice Update the max batch size for checking
    function setMaxCheckBatch(uint256 _max) external {
        require(_max > 0 && _max <= 200, "Invalid batch size");
        maxCheckBatch = _max;
    }

    /// @notice Reset the scan pointer
    function resetLastCheckedId() external {
        lastCheckedId = 0;
    }
}
