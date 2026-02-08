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

// PayrollHook ABI for Uniswap v4 lending integration
export const PayrollHookABI = [
    {
        type: 'function',
        name: 'requestLoan',
        inputs: [
            {
                name: 'key',
                type: 'tuple',
                components: [
                    { name: 'currency0', type: 'address' },
                    { name: 'currency1', type: 'address' },
                    { name: 'fee', type: 'uint24' },
                    { name: 'tickSpacing', type: 'int24' },
                    { name: 'hooks', type: 'address' },
                ],
            },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'repayLoan',
        inputs: [
            {
                name: 'key',
                type: 'tuple',
                components: [
                    { name: 'currency0', type: 'address' },
                    { name: 'currency1', type: 'address' },
                    { name: 'fee', type: 'uint24' },
                    { name: 'tickSpacing', type: 'int24' },
                    { name: 'hooks', type: 'address' },
                ],
            },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'getMaxLoan',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'employee', type: 'address' },
            {
                name: 'key',
                type: 'tuple',
                components: [
                    { name: 'currency0', type: 'address' },
                    { name: 'currency1', type: 'address' },
                    { name: 'fee', type: 'uint24' },
                    { name: 'tickSpacing', type: 'int24' },
                    { name: 'hooks', type: 'address' },
                ],
            },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getPosition',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'employee', type: 'address' },
            {
                name: 'key',
                type: 'tuple',
                components: [
                    { name: 'currency0', type: 'address' },
                    { name: 'currency1', type: 'address' },
                    { name: 'fee', type: 'uint24' },
                    { name: 'tickSpacing', type: 'int24' },
                    { name: 'hooks', type: 'address' },
                ],
            },
        ],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'liquidity', type: 'uint128' },
                    { name: 'depositTimestamp', type: 'uint256' },
                    { name: 'loanBalance', type: 'uint256' },
                    { name: 'loanTimestamp', type: 'uint256' },
                    { name: 'hasActiveLoan', type: 'bool' },
                ],
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'loanPoolBalance',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'fundLoanPool',
        inputs: [],
        outputs: [],
        stateMutability: 'payable',
    },
    {
        type: 'event',
        name: 'LoanRequested',
        inputs: [
            { name: 'employee', type: 'address', indexed: true },
            { name: 'orgId', type: 'uint256', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'collateralValue', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'LoanRepaid',
        inputs: [
            { name: 'employee', type: 'address', indexed: true },
            { name: 'orgId', type: 'uint256', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
        ],
    },
] as const;

// LendingPool ABI for employee loan borrowing and lending
export const LendingPoolABI = [
    {
        type: 'function',
        name: 'borrow',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
            { name: 'duration', type: 'uint256' },
        ],
        outputs: [{ name: 'loanId', type: 'uint256' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'repay',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'fundPool',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'withdrawPool',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'getMaxBorrow',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'employee', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getLoan',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'borrower', type: 'address' },
        ],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'principal', type: 'uint256' },
                    { name: 'interestRate', type: 'uint256' },
                    { name: 'originationTime', type: 'uint256' },
                    { name: 'dueDate', type: 'uint256' },
                    { name: 'collateralValue', type: 'uint256' },
                    { name: 'active', type: 'bool' },
                ],
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'calculateOwed',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'borrower', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'poolBalance',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'totalBorrowed',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'isOverdue',
        inputs: [
            { name: 'orgId', type: 'uint256' },
            { name: 'borrower', type: 'address' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'LoanOriginated',
        inputs: [
            { name: 'borrower', type: 'address', indexed: true },
            { name: 'orgId', type: 'uint256', indexed: true },
            { name: 'principal', type: 'uint256', indexed: false },
            { name: 'collateralValue', type: 'uint256', indexed: false },
            { name: 'dueDate', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'LoanRepaid',
        inputs: [
            { name: 'borrower', type: 'address', indexed: true },
            { name: 'orgId', type: 'uint256', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'remaining', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'PoolFunded',
        inputs: [
            { name: 'funder', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
        ],
    },
] as const;
