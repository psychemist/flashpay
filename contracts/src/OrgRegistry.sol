// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OrgRegistry
 * @notice NFT-based organization registry for FlashPay payroll system
 * @dev Each organization is represented as an NFT with role/salary configuration
 */
contract OrgRegistry {
    // ============ Errors ============
    error NotAdmin();
    error NotOrganizationOwner();
    error OrganizationNotFound();
    error RoleNotFound();
    error EmployeeAlreadyExists();
    error EmployeeNotFound();
    error InvalidSalary();
    error InvalidPeriod();

    // ============ Events ============
    event OrganizationCreated(
        uint256 indexed orgId,
        address indexed admin,
        string name
    );
    event RoleCreated(
        uint256 indexed orgId,
        uint256 indexed roleId,
        string name,
        uint256 salaryPerPeriod
    );
    event RoleUpdated(
        uint256 indexed orgId,
        uint256 indexed roleId,
        uint256 newSalary
    );
    event EmployeeAdded(
        uint256 indexed orgId,
        address indexed employee,
        uint256 indexed roleId
    );
    event EmployeeRemoved(uint256 indexed orgId, address indexed employee);
    event EmployeeRoleChanged(
        uint256 indexed orgId,
        address indexed employee,
        uint256 newRoleId
    );
    event TreasuryUpdated(uint256 indexed orgId, address indexed newTreasury);

    // ============ Structs ============
    struct Role {
        string name;
        uint256 salaryPerPeriod; // Salary amount per period in wei/smallest unit
        uint256 periodDuration; // Duration in seconds (monthly = 30 days)
        bool active;
    }

    struct Employee {
        address wallet;
        uint256 roleId;
        uint256 startDate;
        bool active;
    }

    struct Organization {
        uint256 id;
        address admin;
        string name;
        address treasury; // Address holding org funds
        uint256 payrollCycle; // Payroll period in seconds (default: 30 days)
        uint256 lastPayrollTime;
        bool active;
    }

    // ============ State ============
    uint256 private _orgCounter;

    // orgId => Organization
    mapping(uint256 => Organization) public organizations;

    // orgId => roleId => Role
    mapping(uint256 => mapping(uint256 => Role)) public roles;
    mapping(uint256 => uint256) public roleCount;

    // orgId => employee address => Employee
    mapping(uint256 => mapping(address => Employee)) public employees;
    mapping(uint256 => address[]) public employeeList;

    // employee address => orgId (for reverse lookup)
    mapping(address => uint256) public employeeToOrg;

    // ============ Modifiers ============
    modifier onlyOrgAdmin(uint256 orgId) {
        if (organizations[orgId].admin != msg.sender)
            revert NotOrganizationOwner();
        _;
    }

    modifier orgExists(uint256 orgId) {
        if (!organizations[orgId].active) revert OrganizationNotFound();
        _;
    }

    // ============ External Functions ============

    /**
     * @notice Create a new organization
     * @param name Organization name
     * @param treasury Address to hold organization funds
     * @param payrollCycle Payroll period in seconds (0 for default 30 days)
     * @return orgId The ID of the created organization
     */
    function createOrganization(
        string calldata name,
        address treasury,
        uint256 payrollCycle
    ) external returns (uint256 orgId) {
        orgId = ++_orgCounter;

        organizations[orgId] = Organization({
            id: orgId,
            admin: msg.sender,
            name: name,
            treasury: treasury == address(0) ? msg.sender : treasury,
            payrollCycle: payrollCycle == 0 ? 30 days : payrollCycle,
            lastPayrollTime: block.timestamp,
            active: true
        });

        emit OrganizationCreated(orgId, msg.sender, name);
    }

    /**
     * @notice Create a new role within an organization
     * @param orgId Organization ID
     * @param name Role name
     * @param salaryPerPeriod Salary amount per period
     * @param periodDuration Duration of each period in seconds
     * @return roleId The ID of the created role
     */
    function createRole(
        uint256 orgId,
        string calldata name,
        uint256 salaryPerPeriod,
        uint256 periodDuration
    ) external onlyOrgAdmin(orgId) orgExists(orgId) returns (uint256 roleId) {
        if (salaryPerPeriod == 0) revert InvalidSalary();
        if (periodDuration == 0) revert InvalidPeriod();

        roleId = roleCount[orgId]++;

        roles[orgId][roleId] = Role({
            name: name,
            salaryPerPeriod: salaryPerPeriod,
            periodDuration: periodDuration,
            active: true
        });

        emit RoleCreated(orgId, roleId, name, salaryPerPeriod);
    }

    /**
     * @notice Add an employee to an organization
     * @param orgId Organization ID
     * @param wallet Employee wallet address
     * @param roleId Role ID to assign
     */
    function addEmployee(
        uint256 orgId,
        address wallet,
        uint256 roleId
    ) external onlyOrgAdmin(orgId) orgExists(orgId) {
        if (!roles[orgId][roleId].active) revert RoleNotFound();
        if (employees[orgId][wallet].active) revert EmployeeAlreadyExists();

        employees[orgId][wallet] = Employee({
            wallet: wallet,
            roleId: roleId,
            startDate: block.timestamp,
            active: true
        });

        employeeList[orgId].push(wallet);
        employeeToOrg[wallet] = orgId;

        emit EmployeeAdded(orgId, wallet, roleId);
    }

    /**
     * @notice Remove an employee from an organization
     * @param orgId Organization ID
     * @param wallet Employee wallet address
     */
    function removeEmployee(
        uint256 orgId,
        address wallet
    ) external onlyOrgAdmin(orgId) orgExists(orgId) {
        if (!employees[orgId][wallet].active) revert EmployeeNotFound();

        employees[orgId][wallet].active = false;
        delete employeeToOrg[wallet];

        emit EmployeeRemoved(orgId, wallet);
    }

    /**
     * @notice Update an employee's role
     * @param orgId Organization ID
     * @param wallet Employee wallet address
     * @param newRoleId New role ID
     */
    function updateEmployeeRole(
        uint256 orgId,
        address wallet,
        uint256 newRoleId
    ) external onlyOrgAdmin(orgId) orgExists(orgId) {
        if (!employees[orgId][wallet].active) revert EmployeeNotFound();
        if (!roles[orgId][newRoleId].active) revert RoleNotFound();

        employees[orgId][wallet].roleId = newRoleId;

        emit EmployeeRoleChanged(orgId, wallet, newRoleId);
    }

    /**
     * @notice Update organization treasury address
     * @param orgId Organization ID
     * @param newTreasury New treasury address
     */
    function updateTreasury(
        uint256 orgId,
        address newTreasury
    ) external onlyOrgAdmin(orgId) orgExists(orgId) {
        organizations[orgId].treasury = newTreasury;
        emit TreasuryUpdated(orgId, newTreasury);
    }

    // ============ View Functions ============

    /**
     * @notice Get all active employees for an organization
     * @param orgId Organization ID
     * @return activeEmployees Array of active employee addresses
     */
    function getActiveEmployees(
        uint256 orgId
    ) external view returns (address[] memory) {
        address[] storage allEmployees = employeeList[orgId];
        uint256 count;

        // Count active employees
        for (uint256 i = 0; i < allEmployees.length; i++) {
            if (employees[orgId][allEmployees[i]].active) count++;
        }

        // Build result array
        address[] memory activeEmployees = new address[](count);
        uint256 index;
        for (uint256 i = 0; i < allEmployees.length; i++) {
            if (employees[orgId][allEmployees[i]].active) {
                activeEmployees[index++] = allEmployees[i];
            }
        }

        return activeEmployees;
    }

    /**
     * @notice Get employee details with their role salary
     * @param orgId Organization ID
     * @param wallet Employee wallet
     * @return employee Employee struct
     * @return role Role struct
     */
    function getEmployeeWithRole(
        uint256 orgId,
        address wallet
    ) external view returns (Employee memory employee, Role memory role) {
        employee = employees[orgId][wallet];
        role = roles[orgId][employee.roleId];
    }

    /**
     * @notice Calculate total payroll for an organization
     * @param orgId Organization ID
     * @return total Total payroll amount
     * @return recipients Array of recipient addresses
     * @return amounts Array of amounts per recipient
     */
    function calculatePayroll(
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
        address[] storage allEmployees = employeeList[orgId];
        uint256 count;

        // Count active employees
        for (uint256 i = 0; i < allEmployees.length; i++) {
            if (employees[orgId][allEmployees[i]].active) count++;
        }

        recipients = new address[](count);
        amounts = new uint256[](count);
        uint256 index;

        for (uint256 i = 0; i < allEmployees.length; i++) {
            address wallet = allEmployees[i];
            if (employees[orgId][wallet].active) {
                Employee storage emp = employees[orgId][wallet];
                Role storage role = roles[orgId][emp.roleId];

                recipients[index] = wallet;
                amounts[index] = role.salaryPerPeriod;
                total += role.salaryPerPeriod;
                index++;
            }
        }
    }

    /**
     * @notice Get organization details
     * @param orgId Organization ID
     * @return org Organization struct
     */
    function getOrganization(
        uint256 orgId
    ) external view returns (Organization memory) {
        return organizations[orgId];
    }

    /**
     * @notice Get role details
     * @param orgId Organization ID
     * @param roleId Role ID
     * @return role Role struct
     */
    function getRole(
        uint256 orgId,
        uint256 roleId
    ) external view returns (Role memory) {
        return roles[orgId][roleId];
    }

    /**
     * @notice Get total number of roles in an organization
     * @param orgId Organization ID
     * @return count Number of roles
     */
    function getRoleCount(uint256 orgId) external view returns (uint256) {
        return roleCount[orgId];
    }

    /**
     * @notice Check if an address is an admin of an organization
     * @param orgId Organization ID
     * @param account Address to check
     * @return isAdmin Whether the address is an admin
     */
    function isOrgAdmin(
        uint256 orgId,
        address account
    ) external view returns (bool) {
        return organizations[orgId].admin == account;
    }
}
