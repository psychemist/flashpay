// Generated from contracts/out/OrgRegistry.sol/OrgRegistry.json
export const OrgRegistryABI = [
    {
        type: 'function',
        name: 'createOrganization',
        inputs: [
            { name: 'name', type: 'string' },
            { name: 'treasury', type: 'address' },
            { name: 'payrollCycle', type: 'uint256' },
        ],
        outputs: [{ name: 'orgId', type: 'uint256' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'createRole',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'name', type: 'string' },
            { name: 'salaryPerPeriod', type: 'uint256' },
            { name: 'periodDuration', type: 'uint256' },
        ],
        outputs: [{ name: 'roleId', type: 'uint256' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'addEmployee',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'wallet', type: 'address' },
            { name: 'roleId', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'removeEmployee',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'wallet', type: 'address' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'getOrganization',
        inputs: [{ name: 'orgId', type: 'uint256' }],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'id', type: 'uint256' },
                    { name: 'admin', type: 'address' },
                    { name: 'name', type: 'string' },
                    { name: 'treasury', type: 'address' },
                    { name: 'payrollCycle', type: 'uint256' },
                    { name: 'lastPayrollTime', type: 'uint256' },
                    { name: 'active', type: 'bool' },
                ],
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getActiveEmployees',
        inputs: [{ name: 'orgId', type: 'uint256' }],
        outputs: [{ name: '', type: 'address[]' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getEmployeeWithRole',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'wallet', type: 'address' },
        ],
        outputs: [
            {
                name: 'employee',
                type: 'tuple',
                components: [
                    { name: 'wallet', type: 'address' },
                    { name: 'roleId', type: 'uint256' },
                    { name: 'startDate', type: 'uint256' },
                    { name: 'active', type: 'bool' },
                ],
            },
            {
                name: 'role',
                type: 'tuple',
                components: [
                    { name: 'name', type: 'string' },
                    { name: 'salaryPerPeriod', type: 'uint256' },
                    { name: 'periodDuration', type: 'uint256' },
                    { name: 'active', type: 'bool' },
                ],
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'calculatePayroll',
        inputs: [{ name: 'orgId', type: 'uint256' }],
        outputs: [
            { name: 'total', type: 'uint256' },
            { name: 'recipients', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'isOrgAdmin',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'account', type: 'address' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getRole',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'roleId', type: 'uint256' },
        ],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'name', type: 'string' },
                    { name: 'salaryPerPeriod', type: 'uint256' },
                    { name: 'periodDuration', type: 'uint256' },
                    { name: 'active', type: 'bool' },
                ],
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getRoleCount',
        inputs: [{ name: 'orgId', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'OrganizationCreated',
        inputs: [
            { name: 'orgId', type: 'uint256', indexed: true },
            { name: 'admin', type: 'address', indexed: true },
            { name: 'name', type: 'string', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'RoleCreated',
        inputs: [
            { name: 'orgId', type: 'uint256', indexed: true },
            { name: 'roleId', type: 'uint256', indexed: true },
            { name: 'name', type: 'string', indexed: false },
            { name: 'salaryPerPeriod', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'EmployeeAdded',
        inputs: [
            { name: 'orgId', type: 'uint256', indexed: true },
            { name: 'employee', type: 'address', indexed: true },
            { name: 'roleId', type: 'uint256', indexed: true },
        ],
    },
] as const;

export const PayrollABI = [
    {
        type: 'function',
        name: 'executePayrollDirect',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'recipients', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' },
        ],
        outputs: [{ name: 'payrollId', type: 'uint256' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'executePayrollFromRegistry',
        inputs: [{ name: 'orgId', type: 'uint256' }],
        outputs: [{ name: 'payrollId', type: 'uint256' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'previewPayroll',
        inputs: [{ name: 'orgId', type: 'uint256' }],
        outputs: [
            { name: 'total', type: 'uint256' },
            { name: 'recipients', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getPayrollBatch',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'payrollId', type: 'uint256' },
        ],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'id', type: 'uint256' },
                    { name: 'orgId', type: 'uint256' },
                    { name: 'merkleRoot', type: 'bytes32' },
                    { name: 'totalAmount', type: 'uint256' },
                    { name: 'recipientCount', type: 'uint256' },
                    { name: 'createdAt', type: 'uint256' },
                    { name: 'executedAt', type: 'uint256' },
                    { name: 'approved', type: 'bool' },
                    { name: 'executed', type: 'bool' },
                    { name: 'cancelled', type: 'bool' },
                ],
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getPayrollCount',
        inputs: [{ name: 'orgId', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'PayrollExecuted',
        inputs: [
            { name: 'orgId', type: 'uint256', indexed: true },
            { name: 'payrollId', type: 'uint256', indexed: true },
            { name: 'totalPaid', type: 'uint256', indexed: false },
            { name: 'recipientCount', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'PaymentSent',
        inputs: [
            { name: 'orgId', type: 'uint256', indexed: true },
            { name: 'payrollId', type: 'uint256', indexed: true },
            { name: 'recipient', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
        ],
    },
] as const;

export const ERC20ABI = [
    {
        type: 'function',
        name: 'approve',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'allowance',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
] as const;
