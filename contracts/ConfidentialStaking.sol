// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IConfidentialETH {
    function mint(address to) external;
}

interface IConfidentialUSDT {
    function mint(address to, uint64 amount) external;
}

/// @title Confidential Staking for cETH with cUSDT rewards
/// @notice Users stake cETH (unit-based) and accrue cUSDT rewards at a fixed rate
/// @dev Token amounts use 6 decimals (1 token == 1_000_000 units)
contract ConfidentialStaking is SepoliaConfig {
    // Tokens
    IConfidentialETH public immutable cETH;
    IConfidentialUSDT public immutable cUSDT;

    // Accounting (all amounts in 6-decimal base units)
    mapping(address => uint64) private _staked; // user staked cETH units
    mapping(address => uint64) private _accruedUSDT; // user accrued cUSDT units
    mapping(address => uint256) private _lastUpdate; // last accrual timestamp

    // 1 cETH earns 10 cUSDT per day (per-second pro‑rata)
    // With 6 decimals: 10 cUSDT/day => 10_000_000 units per 86_400 seconds
    uint64 public constant RATE_PER_DAY_USDT = 10_000_000; // 10 cUSDT (6 decimals)
    uint32 public constant SECONDS_PER_DAY = 86_400;
    uint64 public constant ONE_TOKEN = 1_000_000; // 1 token in 6 decimals

    event Staked(address indexed user, uint64 units);
    event Withdrawn(address indexed user, uint64 units);
    event Claimed(address indexed user, uint64 amountUSDT);

    constructor(address _cETH, address _cUSDT) {
        require(_cETH != address(0) && _cUSDT != address(0), "Invalid token");
        cETH = IConfidentialETH(_cETH);
        cUSDT = IConfidentialUSDT(_cUSDT);
    }

    // ============ Views (must not use msg.sender) ============

    function getStaked(address user) external view returns (uint64) {
        return _staked[user];
    }

    function getAccruedUSDT(address user) external view returns (uint64) {
        // Include pending accrual since last update
        (uint64 newAccrual,) = _pendingAccrual(user);
        return _accruedUSDT[user] + newAccrual;
    }

    function getLastUpdate(address user) external view returns (uint256) {
        return _lastUpdate[user];
    }

    function interestRatePerDay() external pure returns (uint64) {
        return RATE_PER_DAY_USDT;
    }

    // ============ Mutations ============

    /// @notice Stake exactly 1 cETH unit (1e6)
    /// @dev For simplicity, this demo stakes in unit steps due to demo token interface
    function stakeOne() external {
        _accrue(msg.sender);
        unchecked {
            _staked[msg.sender] += ONE_TOKEN;
        }
        emit Staked(msg.sender, ONE_TOKEN);
    }

    /// @notice Withdraw exactly 1 cETH unit (1e6) and receive 1 cETH minted back
    function withdrawOne() external {
        require(_staked[msg.sender] >= ONE_TOKEN, "Insufficient staked");
        _accrue(msg.sender);
        unchecked {
            _staked[msg.sender] -= ONE_TOKEN;
        }
        // Return 1 cETH to the user via token mint (demo token mints fixed 1e6)
        cETH.mint(msg.sender);
        emit Withdrawn(msg.sender, ONE_TOKEN);
    }

    /// @notice Claim all accrued cUSDT interest
    function claim() external {
        _accrue(msg.sender);
        uint64 amount = _accruedUSDT[msg.sender];
        require(amount > 0, "Nothing to claim");
        _accruedUSDT[msg.sender] = 0;
        cUSDT.mint(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    // ============ Internal helpers ============

    function _pendingAccrual(address user) internal view returns (uint64 added, uint256 newTs) {
        uint256 last = _lastUpdate[user];
        uint256 ts = block.timestamp;
        if (last == 0) return (0, ts);
        uint256 elapsed = ts - last;
        if (elapsed == 0) return (0, ts);

        // Formula:
        // added = staked * RATE_PER_DAY_USDT * elapsed / SECONDS_PER_DAY / ONE_TOKEN
        // Reduce to avoid overflow: ((staked * elapsed) / ONE_TOKEN) * RATE_PER_DAY_USDT / SECONDS_PER_DAY
        uint256 staked = _staked[user];
        uint256 base = (staked * elapsed) / ONE_TOKEN; // scaled down to tokens
        uint256 inc = (base * RATE_PER_DAY_USDT) / SECONDS_PER_DAY;
        if (inc > type(uint64).max) {
            added = type(uint64).max;
        } else {
            added = uint64(inc);
        }
        newTs = ts;
    }

    function _accrue(address user) internal {
        (uint64 add_, uint256 ts) = _pendingAccrual(user);
        if (_lastUpdate[user] == 0) {
            _lastUpdate[user] = ts;
            return;
        }
        if (add_ > 0) {
            unchecked {
                _accruedUSDT[user] += add_;
            }
        }
        _lastUpdate[user] = ts;
    }
}

