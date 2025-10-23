// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

import {ConfidentialETH} from "./ConfidentialETH.sol";
import {ConfidentialUSDT} from "./ConfidentialUSDT.sol";

/// @title Confidential staking contract for cETH deposits and cUSDT rewards
/// @notice Users stake discrete 1 cETH units to accrue 10 cUSDT per day in rewards.
contract ConfidentialStaking is SepoliaConfig {
    error InsufficientStaked();
    error NothingToClaim();
    error AccrualOverflow();

    struct Account {
        uint64 staked;
        uint64 accruedRewards;
        uint64 lastUpdate;
    }

    uint64 public constant ONE_TOKEN = 1_000_000; // 1 token with 6 decimals
    uint64 public constant RATE_PER_DAY_USDT = 10_000_000; // 10 cUSDT per day (6 decimals)
    uint64 public constant SECONDS_PER_DAY = 86_400;

    ConfidentialETH public immutable cETH;
    ConfidentialUSDT public immutable cUSDT;

    mapping(address user => Account) private accounts;

    event Staked(address indexed user, uint64 units);
    event Withdrawn(address indexed user, uint64 units);
    event Claimed(address indexed user, uint64 amountUSDT);

    constructor(address cEthAddress, address cUsdtAddress) {
        cETH = ConfidentialETH(cEthAddress);
        cUSDT = ConfidentialUSDT(cUsdtAddress);
    }

    function stakeOne() external {
        _updateRewards(msg.sender);

        Account storage account = accounts[msg.sender];
        account.staked += ONE_TOKEN;
        account.lastUpdate = uint64(block.timestamp);

        emit Staked(msg.sender, ONE_TOKEN);
    }

    function withdrawOne() external {
        _updateRewards(msg.sender);

        Account storage account = accounts[msg.sender];
        if (account.staked < ONE_TOKEN) {
            revert InsufficientStaked();
        }

        account.staked -= ONE_TOKEN;
        account.lastUpdate = uint64(block.timestamp);

        emit Withdrawn(msg.sender, ONE_TOKEN);
    }

    function claim() external {
        _updateRewards(msg.sender);

        Account storage account = accounts[msg.sender];
        uint64 rewards = account.accruedRewards;
        if (rewards == 0) {
            revert NothingToClaim();
        }

        account.accruedRewards = 0;
        account.lastUpdate = uint64(block.timestamp);

        cUSDT.mint(msg.sender, rewards);

        emit Claimed(msg.sender, rewards);
    }

    function getStaked(address user) external view returns (uint64) {
        return accounts[user].staked;
    }

    function getAccruedUSDT(address user) external view returns (uint64) {
        Account storage account = accounts[user];

        if (account.lastUpdate == 0 || account.staked == 0) {
            return account.accruedRewards;
        }

        uint256 additional = _pendingRewards(account);
        uint256 total = uint256(account.accruedRewards) + additional;
        if (total > type(uint64).max) {
            total = type(uint64).max;
        }
        return uint64(total);
    }

    function getLastUpdate(address user) external view returns (uint64) {
        return accounts[user].lastUpdate;
    }

    function interestRatePerDay() external pure returns (uint64) {
        return RATE_PER_DAY_USDT;
    }

    function _updateRewards(address user) internal {
        Account storage account = accounts[user];
        uint64 last = account.lastUpdate;
        uint64 current = uint64(block.timestamp);

        if (last == 0) {
            account.lastUpdate = current;
            return;
        }

        if (account.staked == 0) {
            account.lastUpdate = current;
            return;
        }

        uint256 additional = _pendingRewards(account);
        if (additional > 0) {
            uint256 newAccrued = uint256(account.accruedRewards) + additional;
            if (newAccrued > type(uint64).max) {
                revert AccrualOverflow();
            }
            account.accruedRewards = uint64(newAccrued);
        }

        account.lastUpdate = current;
    }

    function _pendingRewards(Account storage account) internal view returns (uint256) {
        uint256 elapsed = block.timestamp - uint256(account.lastUpdate);
        if (elapsed == 0) {
            return 0;
        }

        return (uint256(account.staked) * RATE_PER_DAY_USDT * elapsed) / (SECONDS_PER_DAY * ONE_TOKEN);
    }
}
