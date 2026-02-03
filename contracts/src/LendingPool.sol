// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "lib/forge-std/src/interfaces/IERC20.sol";

/**
 * @title LendingPool
 * @notice Standalone lending pool for employee loans backed by LP positions
 * @dev Works alongside PayrollHook for collateral verification
 */
contract LendingPool {
    // ============ Errors ============
    error NotAuthorized();
    error InsufficientCollateral();
    error LoanAlreadyActive();
    error NoActiveLoan();
    error InsufficientPoolBalance();
    error LoanOverdue();
    error RepaymentExceedsDebt();

    // ============ Events ============
    event LoanOriginated(
        address indexed borrower,
        uint256 indexed orgId,
        uint256 principal,
        uint256 collateralValue,
        uint256 dueDate
    );
    event LoanRepaid(
        address indexed borrower,
        uint256 indexed orgId,
        uint256 amount,
        uint256 remaining
    );
    event LoanLiquidated(
        address indexed borrower,
        uint256 indexed orgId,
        uint256 debtAmount
    );
    event PoolFunded(address indexed funder, uint256 amount);
    event PoolWithdrawn(address indexed recipient, uint256 amount);

    // ============ Structs ============
    struct Loan {
        uint256 principal;
        uint256 interestRate; // Annual rate in basis points (e.g., 500 = 5%)
        uint256 originationTime;
        uint256 dueDate;
        uint256 collateralValue;
        bool active;
    }

    struct OrgConfig {
        bool enabled;
        uint256 maxLTV; // Max loan-to-value (basis points)
        uint256 interestRate; // Annual interest rate (basis points)
        uint256 maxDuration; // Max loan duration (seconds)
        address payrollHook; // Hook contract for collateral verification
    }

    // ============ State ============
    IERC20 public immutable lendingToken; // e.g., USDC
    address public owner;

    // Total available for lending
    uint256 public poolBalance;

    // Total outstanding loans
    uint256 public totalBorrowed;

    // orgId => employee => Loan
    mapping(uint256 => mapping(address => Loan)) public loans;

    // orgId => OrgConfig
    mapping(uint256 => OrgConfig) public orgConfigs;

    // orgId => employee => verified collateral value (set by PayrollHook or oracle)
    mapping(uint256 => mapping(address => uint256)) public verifiedCollateral;

    // ============ Modifiers ============
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    modifier onlyHook(uint256 orgId) {
        if (msg.sender != orgConfigs[orgId].payrollHook) revert NotAuthorized();
        _;
    }

    // ============ Constructor ============
    constructor(address _lendingToken) {
        lendingToken = IERC20(_lendingToken);
        owner = msg.sender;
    }

    // ============ Admin Functions ============

    /**
     * @notice Configure an organization for lending
     */
    function configureOrg(
        uint256 orgId,
        uint256 maxLTV,
        uint256 interestRate,
        uint256 maxDuration,
        address payrollHook
    ) external onlyOwner {
        orgConfigs[orgId] = OrgConfig({
            enabled: true,
            maxLTV: maxLTV,
            interestRate: interestRate,
            maxDuration: maxDuration,
            payrollHook: payrollHook
        });
    }

    /**
     * @notice Fund the lending pool
     */
    function fundPool(uint256 amount) external {
        lendingToken.transferFrom(msg.sender, address(this), amount);
        poolBalance += amount;
        emit PoolFunded(msg.sender, amount);
    }

    /**
     * @notice Withdraw from pool (owner only)
     */
    function withdrawPool(uint256 amount) external onlyOwner {
        if (amount > poolBalance) revert InsufficientPoolBalance();
        poolBalance -= amount;
        lendingToken.transfer(owner, amount);
        emit PoolWithdrawn(owner, amount);
    }

    // ============ Collateral Functions (Called by PayrollHook) ============

    /**
     * @notice Update employee's verified collateral value
     * @dev Called by PayrollHook when positions change
     */
    function updateCollateral(
        uint256 orgId,
        address employee,
        uint256 value
    ) external onlyHook(orgId) {
        verifiedCollateral[orgId][employee] = value;
    }

    // ============ Borrower Functions ============

    /**
     * @notice Request a loan
     * @param orgId Organization ID
     * @param amount Loan amount
     * @param duration Loan duration in seconds
     */
    function borrow(
        uint256 orgId,
        uint256 amount,
        uint256 duration
    ) external returns (uint256 loanId) {
        OrgConfig storage config = orgConfigs[orgId];
        if (!config.enabled) revert NotAuthorized();

        Loan storage loan = loans[orgId][msg.sender];
        if (loan.active) revert LoanAlreadyActive();

        // Check collateral
        uint256 collateralValue = verifiedCollateral[orgId][msg.sender];
        uint256 maxBorrow = (collateralValue * config.maxLTV) / 10000;
        if (amount > maxBorrow) revert InsufficientCollateral();

        // Check pool balance
        if (amount > poolBalance) revert InsufficientPoolBalance();

        // Check duration
        uint256 loanDuration = duration > config.maxDuration
            ? config.maxDuration
            : duration;

        // Create loan
        loans[orgId][msg.sender] = Loan({
            principal: amount,
            interestRate: config.interestRate,
            originationTime: block.timestamp,
            dueDate: block.timestamp + loanDuration,
            collateralValue: collateralValue,
            active: true
        });

        // Update balances
        poolBalance -= amount;
        totalBorrowed += amount;

        // Transfer funds
        lendingToken.transfer(msg.sender, amount);

        emit LoanOriginated(
            msg.sender,
            orgId,
            amount,
            collateralValue,
            block.timestamp + loanDuration
        );

        return 0; // Could return actual loan ID if using incrementing counter
    }

    /**
     * @notice Repay loan
     * @param orgId Organization ID
     * @param amount Amount to repay
     */
    function repay(uint256 orgId, uint256 amount) external {
        Loan storage loan = loans[orgId][msg.sender];
        if (!loan.active) revert NoActiveLoan();

        uint256 totalOwed = calculateOwed(orgId, msg.sender);
        uint256 repayAmount = amount > totalOwed ? totalOwed : amount;

        // Transfer tokens from borrower
        lendingToken.transferFrom(msg.sender, address(this), repayAmount);

        // Update balances
        poolBalance += repayAmount;
        totalBorrowed -= loan.principal > repayAmount
            ? repayAmount
            : loan.principal;

        // Check if fully repaid
        if (repayAmount >= totalOwed) {
            loan.active = false;
            loan.principal = 0;
        } else {
            loan.principal = totalOwed - repayAmount;
        }

        emit LoanRepaid(msg.sender, orgId, repayAmount, loan.principal);
    }

    /**
     * @notice Repay loan via payroll deduction
     * @dev Called by Payroll contract during payroll execution
     */
    function repayFromPayroll(
        uint256 orgId,
        address employee,
        uint256 maxDeduction
    ) external returns (uint256 deducted) {
        Loan storage loan = loans[orgId][employee];
        if (!loan.active) return 0;

        uint256 totalOwed = calculateOwed(orgId, employee);
        deducted = maxDeduction > totalOwed ? totalOwed : maxDeduction;

        // Token transfer happens in Payroll contract
        poolBalance += deducted;
        totalBorrowed -= loan.principal > deducted ? deducted : loan.principal;

        if (deducted >= totalOwed) {
            loan.active = false;
            loan.principal = 0;
        } else {
            loan.principal = totalOwed - deducted;
        }

        emit LoanRepaid(employee, orgId, deducted, loan.principal);

        return deducted;
    }

    // ============ View Functions ============

    /**
     * @notice Calculate total amount owed including interest
     */
    function calculateOwed(
        uint256 orgId,
        address borrower
    ) public view returns (uint256) {
        Loan storage loan = loans[orgId][borrower];
        if (!loan.active) return 0;

        uint256 timeElapsed = block.timestamp - loan.originationTime;
        uint256 interest = (loan.principal * loan.interestRate * timeElapsed) /
            (365 days * 10000);

        return loan.principal + interest;
    }

    /**
     * @notice Get maximum borrowable amount for an employee
     */
    function getMaxBorrow(
        uint256 orgId,
        address employee
    ) external view returns (uint256) {
        Loan storage loan = loans[orgId][employee];
        if (loan.active) return 0;

        uint256 collateralValue = verifiedCollateral[orgId][employee];
        uint256 maxBorrow = (collateralValue * orgConfigs[orgId].maxLTV) /
            10000;

        return maxBorrow > poolBalance ? poolBalance : maxBorrow;
    }

    /**
     * @notice Get loan details
     */
    function getLoan(
        uint256 orgId,
        address borrower
    ) external view returns (Loan memory) {
        return loans[orgId][borrower];
    }

    /**
     * @notice Check if loan is overdue
     */
    function isOverdue(
        uint256 orgId,
        address borrower
    ) external view returns (bool) {
        Loan storage loan = loans[orgId][borrower];
        return loan.active && block.timestamp > loan.dueDate;
    }
}
