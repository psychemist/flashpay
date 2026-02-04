// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {OrgRegistry} from "../src/OrgRegistry.sol";
import {Payroll} from "../src/Payroll.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";

contract FlashPayTest is Test {
    OrgRegistry public registry;
    Payroll public payroll;
    MockUSDC public usdc;

    address public admin = makeAddr("admin");
    address public treasury = makeAddr("treasury");
    address public employee1 = makeAddr("employee1");
    address public employee2 = makeAddr("employee2");
    address public employee3 = makeAddr("employee3");

    uint256 public constant ENGINEER_SALARY = 5000 * 1e6; // 5000 USDC
    uint256 public constant DESIGNER_SALARY = 4000 * 1e6; // 4000 USDC
    uint256 public constant MANAGER_SALARY = 7000 * 1e6; // 7000 USDC

    function setUp() public {
        // Deploy contracts
        registry = new OrgRegistry();
        usdc = new MockUSDC();
        payroll = new Payroll(address(registry), address(usdc));

        // Mint USDC to treasury
        usdc.mint(treasury, 100_000 * 1e6); // 100k USDC
    }

    function test_CreateOrganization() public {
        vm.prank(admin);
        uint256 orgId = registry.createOrganization(
            "FlashPay Inc",
            treasury,
            30 days
        );

        assertEq(orgId, 1);

        OrgRegistry.Organization memory org = registry.getOrganization(orgId);
        assertEq(org.admin, admin);
        assertEq(org.name, "FlashPay Inc");
        assertEq(org.treasury, treasury);
        assertEq(org.payrollCycle, 30 days);
        assertTrue(org.active);
    }

    function test_CreateRoles() public {
        vm.startPrank(admin);

        uint256 orgId = registry.createOrganization(
            "FlashPay Inc",
            treasury,
            30 days
        );

        uint256 engineerRole = registry.createRole(
            orgId,
            "Engineer",
            ENGINEER_SALARY,
            30 days
        );
        uint256 designerRole = registry.createRole(
            orgId,
            "Designer",
            DESIGNER_SALARY,
            30 days
        );
        uint256 managerRole = registry.createRole(
            orgId,
            "Manager",
            MANAGER_SALARY,
            30 days
        );

        vm.stopPrank();

        assertEq(engineerRole, 0);
        assertEq(designerRole, 1);
        assertEq(managerRole, 2);
        assertEq(registry.getRoleCount(orgId), 3);

        OrgRegistry.Role memory eng = registry.getRole(orgId, engineerRole);
        assertEq(eng.salaryPerPeriod, ENGINEER_SALARY);
        assertEq(eng.name, "Engineer");
    }

    function test_AddEmployees() public {
        vm.startPrank(admin);

        uint256 orgId = registry.createOrganization(
            "FlashPay Inc",
            treasury,
            30 days
        );
        uint256 engineerRole = registry.createRole(
            orgId,
            "Engineer",
            ENGINEER_SALARY,
            30 days
        );
        uint256 designerRole = registry.createRole(
            orgId,
            "Designer",
            DESIGNER_SALARY,
            30 days
        );

        registry.addEmployee(orgId, employee1, engineerRole);
        registry.addEmployee(orgId, employee2, engineerRole);
        registry.addEmployee(orgId, employee3, designerRole);

        vm.stopPrank();

        (
            OrgRegistry.Employee memory emp1,
            OrgRegistry.Role memory role1
        ) = registry.getEmployeeWithRole(orgId, employee1);

        assertEq(emp1.wallet, employee1);
        assertEq(role1.salaryPerPeriod, ENGINEER_SALARY);
        assertTrue(emp1.active);

        address[] memory activeEmployees = registry.getActiveEmployees(orgId);
        assertEq(activeEmployees.length, 3);
    }

    function test_CalculatePayroll() public {
        vm.startPrank(admin);

        uint256 orgId = registry.createOrganization(
            "FlashPay Inc",
            treasury,
            30 days
        );
        uint256 engineerRole = registry.createRole(
            orgId,
            "Engineer",
            ENGINEER_SALARY,
            30 days
        );
        uint256 designerRole = registry.createRole(
            orgId,
            "Designer",
            DESIGNER_SALARY,
            30 days
        );

        registry.addEmployee(orgId, employee1, engineerRole);
        registry.addEmployee(orgId, employee2, engineerRole);
        registry.addEmployee(orgId, employee3, designerRole);

        vm.stopPrank();

        (
            uint256 total,
            address[] memory recipients,
            uint256[] memory amounts
        ) = registry.calculatePayroll(orgId);

        // 2 * 5000 + 1 * 4000 = 14000 USDC
        assertEq(total, 14_000 * 1e6);
        assertEq(recipients.length, 3);
        assertEq(amounts.length, 3);
    }

    function test_ExecutePayrollDirect() public {
        vm.startPrank(admin);

        uint256 orgId = registry.createOrganization(
            "FlashPay Inc",
            treasury,
            30 days
        );
        uint256 engineerRole = registry.createRole(
            orgId,
            "Engineer",
            ENGINEER_SALARY,
            30 days
        );
        uint256 designerRole = registry.createRole(
            orgId,
            "Designer",
            DESIGNER_SALARY,
            30 days
        );

        registry.addEmployee(orgId, employee1, engineerRole);
        registry.addEmployee(orgId, employee2, engineerRole);
        registry.addEmployee(orgId, employee3, designerRole);

        vm.stopPrank();

        // Treasury approves payroll contract
        vm.prank(treasury);
        usdc.approve(address(payroll), type(uint256).max);

        // Execute payroll
        vm.prank(admin);
        address[] memory recipients = new address[](3);
        recipients[0] = employee1;
        recipients[1] = employee2;
        recipients[2] = employee3;

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = ENGINEER_SALARY;
        amounts[1] = ENGINEER_SALARY;
        amounts[2] = DESIGNER_SALARY;

        uint256 payrollId = payroll.executePayrollDirect(
            orgId,
            recipients,
            amounts
        );

        // Verify balances
        assertEq(usdc.balanceOf(employee1), ENGINEER_SALARY);
        assertEq(usdc.balanceOf(employee2), ENGINEER_SALARY);
        assertEq(usdc.balanceOf(employee3), DESIGNER_SALARY);

        // Verify payroll record
        Payroll.PayrollBatch memory batch = payroll.getPayrollBatch(
            orgId,
            payrollId
        );
        assertTrue(batch.executed);
        assertEq(batch.totalAmount, 14_000 * 1e6);
        assertEq(batch.recipientCount, 3);
    }

    function test_ExecutePayrollFromRegistry() public {
        vm.startPrank(admin);

        uint256 orgId = registry.createOrganization(
            "FlashPay Inc",
            treasury,
            30 days
        );
        uint256 engineerRole = registry.createRole(
            orgId,
            "Engineer",
            ENGINEER_SALARY,
            30 days
        );
        uint256 designerRole = registry.createRole(
            orgId,
            "Designer",
            DESIGNER_SALARY,
            30 days
        );

        registry.addEmployee(orgId, employee1, engineerRole);
        registry.addEmployee(orgId, employee2, engineerRole);
        registry.addEmployee(orgId, employee3, designerRole);

        vm.stopPrank();

        // Treasury approves payroll contract
        vm.prank(treasury);
        usdc.approve(address(payroll), type(uint256).max);

        // Execute payroll from registry data
        vm.prank(admin);
        uint256 payrollId = payroll.executePayrollFromRegistry(orgId);

        // Verify all employees got paid
        assertEq(usdc.balanceOf(employee1), ENGINEER_SALARY);
        assertEq(usdc.balanceOf(employee2), ENGINEER_SALARY);
        assertEq(usdc.balanceOf(employee3), DESIGNER_SALARY);

        // Verify treasury balance decreased
        assertEq(usdc.balanceOf(treasury), 100_000 * 1e6 - 14_000 * 1e6);
    }

    function test_RemoveEmployeeFromPayroll() public {
        vm.startPrank(admin);

        uint256 orgId = registry.createOrganization(
            "FlashPay Inc",
            treasury,
            30 days
        );
        uint256 engineerRole = registry.createRole(
            orgId,
            "Engineer",
            ENGINEER_SALARY,
            30 days
        );

        registry.addEmployee(orgId, employee1, engineerRole);
        registry.addEmployee(orgId, employee2, engineerRole);

        // Remove employee1
        registry.removeEmployee(orgId, employee1);

        vm.stopPrank();

        // Verify only employee2 in payroll
        (uint256 total, address[] memory recipients, ) = registry
            .calculatePayroll(orgId);
        assertEq(total, ENGINEER_SALARY);
        assertEq(recipients.length, 1);
        assertEq(recipients[0], employee2);
    }

    function test_RevertNonAdminActions() public {
        vm.prank(admin);
        uint256 orgId = registry.createOrganization(
            "FlashPay Inc",
            treasury,
            30 days
        );

        // Try to create role as non-admin
        vm.prank(employee1);
        vm.expectRevert(OrgRegistry.NotOrganizationOwner.selector);
        registry.createRole(orgId, "Engineer", ENGINEER_SALARY, 30 days);
    }

    function test_PreviewPayroll() public {
        vm.startPrank(admin);

        uint256 orgId = registry.createOrganization(
            "FlashPay Inc",
            treasury,
            30 days
        );
        uint256 engineerRole = registry.createRole(
            orgId,
            "Engineer",
            ENGINEER_SALARY,
            30 days
        );

        registry.addEmployee(orgId, employee1, engineerRole);
        registry.addEmployee(orgId, employee2, engineerRole);

        vm.stopPrank();

        // Preview payroll through payroll contract
        (
            uint256 total,
            address[] memory recipients,
            uint256[] memory amounts
        ) = payroll.previewPayroll(orgId);

        assertEq(total, 2 * ENGINEER_SALARY);
        assertEq(recipients.length, 2);
        assertEq(amounts[0], ENGINEER_SALARY);
        assertEq(amounts[1], ENGINEER_SALARY);
    }
}
