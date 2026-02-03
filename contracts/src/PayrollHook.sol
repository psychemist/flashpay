// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {
    BeforeSwapDelta,
    BeforeSwapDeltaLibrary
} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";

/**
 * @title PayrollHook
 * @notice Uniswap v4 hook for tracking employee LP positions and enabling collateralized loans
 * @dev Employees provide liquidity to designated pools, positions serve as loan collateral
 */
contract PayrollHook is IHooks {
    using PoolIdLibrary for PoolKey;

    // ============ Errors ============
    error NotEmployee();
    error NotOrgAdmin();
    error LoanExceedsCollateral();
    error LoanAlreadyActive();
    error NoActiveLoan();
    error InsufficientLiquidity();
    error PoolNotWhitelisted();
    error NotPoolManager();

    // ============ Events ============
    event EmployeeDeposit(
        address indexed employee,
        uint256 indexed orgId,
        PoolId indexed poolId,
        uint128 liquidity
    );
    event EmployeeWithdraw(
        address indexed employee,
        uint256 indexed orgId,
        PoolId indexed poolId,
        uint128 liquidity
    );
    event LoanRequested(
        address indexed employee,
        uint256 indexed orgId,
        uint256 amount,
        uint256 collateralValue
    );
    event LoanRepaid(
        address indexed employee,
        uint256 indexed orgId,
        uint256 amount
    );

    // ============ Structs ============
    struct EmployeePosition {
        uint128 liquidity; // Total LP position
        uint256 depositTimestamp; // When first deposited
        uint256 loanBalance; // Outstanding loan
        uint256 loanTimestamp; // When loan was taken
        bool hasActiveLoan;
    }

    struct OrgPoolConfig {
        bool whitelisted; // Pool allowed for this org's employees
        uint256 maxLTV; // Max loan-to-value ratio (basis points, e.g. 5000 = 50%)
        uint256 maxLoanDuration; // Max loan duration in seconds
    }

    // ============ State ============
    IPoolManager public immutable poolManager;

    // orgId => employee => PoolId => Position
    mapping(uint256 => mapping(address => mapping(PoolId => EmployeePosition)))
        public positions;

    // orgId => PoolId => OrgPoolConfig
    mapping(uint256 => mapping(PoolId => OrgPoolConfig)) public orgPoolConfigs;

    // employee => orgId (for reverse lookup)
    mapping(address => uint256) public employeeOrg;

    // orgId => admin address
    mapping(uint256 => address) public orgAdmins;

    // Total loan pool balance
    uint256 public loanPoolBalance;

    // Constants
    uint256 public constant DEFAULT_MAX_LTV = 5000; // 50%
    uint256 public constant DEFAULT_LOAN_DURATION = 180 days;

    // ============ Constructor ============
    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    // ============ Modifiers ============
    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        _;
    }

    // ============ Admin Functions ============

    function registerOrg(uint256 orgId, address admin) external {
        orgAdmins[orgId] = admin;
    }

    function whitelistPool(
        uint256 orgId,
        PoolKey calldata key,
        uint256 maxLTV,
        uint256 maxDuration
    ) external {
        if (msg.sender != orgAdmins[orgId]) revert NotOrgAdmin();

        PoolId poolId = key.toId();
        orgPoolConfigs[orgId][poolId] = OrgPoolConfig({
            whitelisted: true,
            maxLTV: maxLTV == 0 ? DEFAULT_MAX_LTV : maxLTV,
            maxLoanDuration: maxDuration == 0
                ? DEFAULT_LOAN_DURATION
                : maxDuration
        });
    }

    function registerEmployee(address employee, uint256 orgId) external {
        if (msg.sender != orgAdmins[orgId]) revert NotOrgAdmin();
        employeeOrg[employee] = orgId;
    }

    // ============ IHooks Implementation ============

    function beforeInitialize(
        address,
        PoolKey calldata,
        uint160
    ) external pure override returns (bytes4) {
        return IHooks.beforeInitialize.selector;
    }

    function afterInitialize(
        address,
        PoolKey calldata,
        uint160,
        int24
    ) external pure override returns (bytes4) {
        return IHooks.afterInitialize.selector;
    }

    function beforeAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external view override returns (bytes4) {
        uint256 orgId = employeeOrg[sender];
        // Allow non-employees to add liquidity, just don't track them
        if (orgId != 0) {
            PoolId poolId = key.toId();
            if (!orgPoolConfigs[orgId][poolId].whitelisted)
                revert PoolNotWhitelisted();
        }
        return IHooks.beforeAddLiquidity.selector;
    }

    function afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external override returns (bytes4, BalanceDelta) {
        uint256 orgId = employeeOrg[sender];

        if (orgId != 0 && params.liquidityDelta > 0) {
            PoolId poolId = key.toId();
            EmployeePosition storage position = positions[orgId][sender][
                poolId
            ];

            position.liquidity += uint128(int128(params.liquidityDelta));
            if (position.depositTimestamp == 0) {
                position.depositTimestamp = block.timestamp;
            }

            emit EmployeeDeposit(
                sender,
                orgId,
                poolId,
                uint128(int128(params.liquidityDelta))
            );
        }

        return (IHooks.afterAddLiquidity.selector, BalanceDelta.wrap(0));
    }

    function beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes calldata
    ) external view override returns (bytes4) {
        uint256 orgId = employeeOrg[sender];

        if (orgId != 0) {
            PoolId poolId = key.toId();
            EmployeePosition storage position = positions[orgId][sender][
                poolId
            ];

            if (position.hasActiveLoan) {
                uint128 remainingLiquidity = position.liquidity -
                    uint128(int128(-params.liquidityDelta));
                uint256 remainingValue = uint256(remainingLiquidity); // Simplified
                uint256 requiredCollateral = (position.loanBalance * 10000) /
                    orgPoolConfigs[orgId][poolId].maxLTV;

                if (remainingValue < requiredCollateral)
                    revert InsufficientLiquidity();
            }
        }

        return IHooks.beforeRemoveLiquidity.selector;
    }

    function afterRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external override returns (bytes4, BalanceDelta) {
        uint256 orgId = employeeOrg[sender];

        if (orgId != 0 && params.liquidityDelta < 0) {
            PoolId poolId = key.toId();
            EmployeePosition storage position = positions[orgId][sender][
                poolId
            ];
            position.liquidity -= uint128(int128(-params.liquidityDelta));

            emit EmployeeWithdraw(
                sender,
                orgId,
                poolId,
                uint128(int128(-params.liquidityDelta))
            );
        }

        return (IHooks.afterRemoveLiquidity.selector, BalanceDelta.wrap(0));
    }

    function beforeSwap(
        address,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        bytes calldata
    ) external pure override returns (bytes4, BeforeSwapDelta, uint24) {
        return (
            IHooks.beforeSwap.selector,
            BeforeSwapDeltaLibrary.ZERO_DELTA,
            0
        );
    }

    function afterSwap(
        address,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, int128) {
        return (IHooks.afterSwap.selector, 0);
    }

    function beforeDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.beforeDonate.selector;
    }

    function afterDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.afterDonate.selector;
    }

    // ============ Lending Functions ============

    function requestLoan(PoolKey calldata key, uint256 amount) external {
        uint256 orgId = employeeOrg[msg.sender];
        if (orgId == 0) revert NotEmployee();

        PoolId poolId = key.toId();
        EmployeePosition storage position = positions[orgId][msg.sender][
            poolId
        ];
        OrgPoolConfig storage config = orgPoolConfigs[orgId][poolId];

        if (position.hasActiveLoan) revert LoanAlreadyActive();
        if (position.liquidity == 0) revert InsufficientLiquidity();

        uint256 collateralValue = uint256(position.liquidity);
        uint256 maxLoan = (collateralValue * config.maxLTV) / 10000;

        if (amount > maxLoan) revert LoanExceedsCollateral();
        if (amount > loanPoolBalance) revert InsufficientLiquidity();

        position.loanBalance = amount;
        position.loanTimestamp = block.timestamp;
        position.hasActiveLoan = true;

        loanPoolBalance -= amount;

        emit LoanRequested(msg.sender, orgId, amount, collateralValue);
    }

    function repayLoan(PoolKey calldata key, uint256 amount) external {
        uint256 orgId = employeeOrg[msg.sender];
        PoolId poolId = key.toId();
        EmployeePosition storage position = positions[orgId][msg.sender][
            poolId
        ];

        if (!position.hasActiveLoan) revert NoActiveLoan();

        uint256 repayAmount = amount > position.loanBalance
            ? position.loanBalance
            : amount;
        position.loanBalance -= repayAmount;

        if (position.loanBalance == 0) {
            position.hasActiveLoan = false;
            position.loanTimestamp = 0;
        }

        loanPoolBalance += repayAmount;

        emit LoanRepaid(msg.sender, orgId, repayAmount);
    }

    function fundLoanPool() external payable {
        loanPoolBalance += msg.value;
    }

    // ============ View Functions ============

    function getPosition(
        uint256 orgId,
        address employee,
        PoolKey calldata key
    ) external view returns (EmployeePosition memory) {
        return positions[orgId][employee][key.toId()];
    }

    function getMaxLoan(
        uint256 orgId,
        address employee,
        PoolKey calldata key
    ) external view returns (uint256) {
        PoolId poolId = key.toId();
        EmployeePosition storage position = positions[orgId][employee][poolId];
        OrgPoolConfig storage config = orgPoolConfigs[orgId][poolId];

        if (position.hasActiveLoan) return 0;

        uint256 collateralValue = uint256(position.liquidity);
        return (collateralValue * config.maxLTV) / 10000;
    }
}
