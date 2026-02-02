// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/forge-std/src/interfaces/IERC20.sol";
import {OrgRegistry} from "./OrgRegistry.sol";

/**
 * @title Payroll
 * @notice Handles batch payroll execution for FlashPay
 * @dev Integrates with OrgRegistry for employee/salary data
 */
contract Payroll {
    // ============ Errors ============
    error NotOrgAdmin();
    error PayrollAlreadyExecuted();
    error InsufficientBalance();
    error TransferFailed();
    error InvalidMerkleRoot();
    error PayrollNotApproved();
    error CutoffWindowActive();
    error NoRecipientsProvided();
    error ArrayLengthMismatch();
    error ZeroAmount();

    // ============ Events ============
    event PayrollSubmitted(
        uint256 indexed orgId,
        uint256 indexed payrollId,
        bytes32 merkleRoot,
        uint256 totalAmount,
        uint256 recipientCount
    );
    event PayrollApproved(
        uint256 indexed orgId,
        uint256 indexed payrollId,
        address indexed approver
    );
    event PayrollExecuted(
        uint256 indexed orgId,
        uint256 indexed payrollId,
        uint256 totalPaid,
        uint256 recipientCount
    );
    event PaymentSent(
        uint256 indexed orgId,
        uint256 indexed payrollId,
        address indexed recipient,
        uint256 amount
    );
    event PayrollCancelled(uint256 indexed orgId, uint256 indexed payrollId);

    // ============ Structs ============
    struct PayrollBatch {
        uint256 id;
        uint256 orgId;
        bytes32 merkleRoot; // Root of payroll Merkle tree
        uint256 totalAmount;
        uint256 recipientCount;
        uint256 createdAt;
        uint256 executedAt;
        bool approved;
        bool executed;
        bool cancelled;
    }

    // ============ State ============
    OrgRegistry public immutable orgRegistry;
    IERC20 public immutable paymentToken; // USDC or other stablecoin

    uint256 public cutoffWindow = 1 hours; // Time before payroll when changes are locked

    // orgId => payrollId => PayrollBatch
    mapping(uint256 => mapping(uint256 => PayrollBatch)) public payrollBatches;
    mapping(uint256 => uint256) public payrollCount;

    // payrollId => recipient => amount (for direct execution without Merkle)
    mapping(uint256 => mapping(address => uint256)) public payrollAmounts;

    // ============ Constructor ============
    constructor(address _orgRegistry, address _paymentToken) {
        orgRegistry = OrgRegistry(_orgRegistry);
        paymentToken = IERC20(_paymentToken);
    }

    // ============ Modifiers ============
    modifier onlyOrgAdmin(uint256 orgId) {
        if (!orgRegistry.isOrgAdmin(orgId, msg.sender)) revert NotOrgAdmin();
        _;
    }

    // ============ External Functions ============

    /**
     * @notice Submit a new payroll batch for approval
     * @param orgId Organization ID
     * @param recipients Array of recipient addresses
     * @param amounts Array of payment amounts
     * @return payrollId The ID of the created payroll batch
     */
    function submitPayroll(
        uint256 orgId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOrgAdmin(orgId) returns (uint256 payrollId) {
        if (recipients.length == 0) revert NoRecipientsProvided();
        if (recipients.length != amounts.length) revert ArrayLengthMismatch();

        // Calculate total and store amounts
        uint256 total;
        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] == 0) revert ZeroAmount();
            total += amounts[i];
        }

        payrollId = payrollCount[orgId]++;

        // Generate simple Merkle-like hash from recipients and amounts
        bytes32 merkleRoot = keccak256(
            abi.encodePacked(recipients, amounts, block.timestamp)
        );

        payrollBatches[orgId][payrollId] = PayrollBatch({
            id: payrollId,
            orgId: orgId,
            merkleRoot: merkleRoot,
            totalAmount: total,
            recipientCount: recipients.length,
            createdAt: block.timestamp,
            executedAt: 0,
            approved: false,
            executed: false,
            cancelled: false
        });

        // Note: For MVP, amounts are recalculated from recipients/amounts arrays
        // during execution rather than stored

        emit PayrollSubmitted(
            orgId,
            payrollId,
            merkleRoot,
            total,
            recipients.length
        );
    }

    /**
     * @notice Approve a pending payroll batch
     * @param orgId Organization ID
     * @param payrollId Payroll batch ID
     */
    function approvePayroll(
        uint256 orgId,
        uint256 payrollId
    ) external onlyOrgAdmin(orgId) {
        PayrollBatch storage batch = payrollBatches[orgId][payrollId];
        if (batch.executed) revert PayrollAlreadyExecuted();
        if (batch.cancelled) revert PayrollAlreadyExecuted();

        batch.approved = true;

        emit PayrollApproved(orgId, payrollId, msg.sender);
    }

    /**
     * @notice Execute payroll - direct version without Merkle proofs
     * @dev For MVP, using direct arrays instead of Merkle verification
     * @param orgId Organization ID
     * @param recipients Array of recipient addresses
     * @param amounts Array of payment amounts
     */
    function executePayrollDirect(
        uint256 orgId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOrgAdmin(orgId) returns (uint256 payrollId) {
        if (recipients.length == 0) revert NoRecipientsProvided();
        if (recipients.length != amounts.length) revert ArrayLengthMismatch();

        OrgRegistry.Organization memory org = orgRegistry.getOrganization(
            orgId
        );

        // Calculate total
        uint256 total;
        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] == 0) revert ZeroAmount();
            total += amounts[i];
        }

        // Check treasury balance
        if (paymentToken.balanceOf(org.treasury) < total)
            revert InsufficientBalance();

        payrollId = payrollCount[orgId]++;

        // Create and immediately execute
        bytes32 merkleRoot = keccak256(
            abi.encodePacked(recipients, amounts, block.timestamp)
        );

        payrollBatches[orgId][payrollId] = PayrollBatch({
            id: payrollId,
            orgId: orgId,
            merkleRoot: merkleRoot,
            totalAmount: total,
            recipientCount: recipients.length,
            createdAt: block.timestamp,
            executedAt: block.timestamp,
            approved: true,
            executed: true,
            cancelled: false
        });

        // Execute payments
        for (uint256 i = 0; i < recipients.length; i++) {
            bool success = paymentToken.transferFrom(
                org.treasury,
                recipients[i],
                amounts[i]
            );
            if (!success) revert TransferFailed();

            emit PaymentSent(orgId, payrollId, recipients[i], amounts[i]);
        }

        emit PayrollExecuted(orgId, payrollId, total, recipients.length);
    }

    /**
     * @notice Execute payroll from OrgRegistry calculated data
     * @param orgId Organization ID
     */
    function executePayrollFromRegistry(
        uint256 orgId
    ) external onlyOrgAdmin(orgId) returns (uint256 payrollId) {
        // Get calculated payroll from registry
        (
            uint256 total,
            address[] memory recipients,
            uint256[] memory amounts
        ) = orgRegistry.calculatePayroll(orgId);

        if (recipients.length == 0) revert NoRecipientsProvided();

        OrgRegistry.Organization memory org = orgRegistry.getOrganization(
            orgId
        );

        // Check treasury balance
        if (paymentToken.balanceOf(org.treasury) < total)
            revert InsufficientBalance();

        payrollId = payrollCount[orgId]++;

        bytes32 merkleRoot = keccak256(
            abi.encodePacked(recipients, amounts, block.timestamp)
        );

        payrollBatches[orgId][payrollId] = PayrollBatch({
            id: payrollId,
            orgId: orgId,
            merkleRoot: merkleRoot,
            totalAmount: total,
            recipientCount: recipients.length,
            createdAt: block.timestamp,
            executedAt: block.timestamp,
            approved: true,
            executed: true,
            cancelled: false
        });

        // Execute payments
        for (uint256 i = 0; i < recipients.length; i++) {
            bool success = paymentToken.transferFrom(
                org.treasury,
                recipients[i],
                amounts[i]
            );
            if (!success) revert TransferFailed();

            emit PaymentSent(orgId, payrollId, recipients[i], amounts[i]);
        }

        emit PayrollExecuted(orgId, payrollId, total, recipients.length);
    }

    /**
     * @notice Cancel a pending payroll batch
     * @param orgId Organization ID
     * @param payrollId Payroll batch ID
     */
    function cancelPayroll(
        uint256 orgId,
        uint256 payrollId
    ) external onlyOrgAdmin(orgId) {
        PayrollBatch storage batch = payrollBatches[orgId][payrollId];
        if (batch.executed) revert PayrollAlreadyExecuted();

        batch.cancelled = true;

        emit PayrollCancelled(orgId, payrollId);
    }

    // ============ View Functions ============

    /**
     * @notice Get payroll batch details
     * @param orgId Organization ID
     * @param payrollId Payroll batch ID
     * @return batch PayrollBatch struct
     */
    function getPayrollBatch(
        uint256 orgId,
        uint256 payrollId
    ) external view returns (PayrollBatch memory) {
        return payrollBatches[orgId][payrollId];
    }

    /**
     * @notice Get total payroll count for an organization
     * @param orgId Organization ID
     * @return count Number of payroll batches
     */
    function getPayrollCount(uint256 orgId) external view returns (uint256) {
        return payrollCount[orgId];
    }

    /**
     * @notice Preview payroll from registry data
     * @param orgId Organization ID
     * @return total Total amount
     * @return recipients Recipient addresses
     * @return amounts Payment amounts
     */
    function previewPayroll(
        uint256 orgId
    )
        external
        view
        returns (
            uint256 total,
            address[] memory recipients,
            uint256[] memory amounts
        )
    {
        return orgRegistry.calculatePayroll(orgId);
    }
}
