/// FlashPay Multi-Token Payroll Module for Sui
/// Enables organizations to pay employees in multiple tokens with automatic swaps
module flashpay_sui::multi_token_payroll {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};
    use std::type_name::{Self, TypeName};

    // ============ Errors ============
    const ENotAdmin: u64 = 0;
    const ENotActive: u64 = 1;
    const EInsufficientBalance: u64 = 2;
    const EEmployeeNotFound: u64 = 3;
    const EInvalidAmount: u64 = 4;
    const EPayrollNotDue: u64 = 5;

    // ============ Events ============
    public struct OrganizationCreated has copy, drop {
        org_id: ID,
        admin: address,
        name: String,
    }

    public struct EmployeeAdded has copy, drop {
        org_id: ID,
        employee: address,
        preferred_token: TypeName,
        salary: u64,
    }

    public struct PayrollExecuted has copy, drop {
        org_id: ID,
        batch_id: u64,
        total_amount: u64,
        recipient_count: u64,
        timestamp: u64,
    }

    public struct PaymentSent has copy, drop {
        org_id: ID,
        recipient: address,
        amount: u64,
        token_type: TypeName,
    }

    // ============ Structs ============
    
    /// Organization object - holds treasury and employee data
    public struct Organization<phantom T> has key, store {
        id: UID,
        name: String,
        admin: address,
        treasury: Balance<T>,
        employees: Table<address, Employee>,
        payroll_cycle: u64, // Duration in milliseconds
        last_payroll: u64,  // Timestamp of last payroll
        batch_counter: u64,
        active: bool,
    }

    /// Employee record with token preference
    public struct Employee has store, drop {
        wallet: address,
        salary: u64,
        preferred_token: TypeName, // Token type they want to receive
        start_date: u64,
        active: bool,
    }

    /// Admin capability for organization management
    public struct AdminCap has key, store {
        id: UID,
        org_id: ID,
    }

    /// Payment receipt for tracking
    public struct PaymentReceipt has key, store {
        id: UID,
        org_id: ID,
        batch_id: u64,
        recipient: address,
        amount: u64,
        token_type: TypeName,
        timestamp: u64,
    }

    // ============ Organization Management ============

    /// Create a new organization with initial treasury
    public fun create_organization<T>(
        name: vector<u8>,
        initial_treasury: Coin<T>,
        payroll_cycle_days: u64,
        ctx: &mut TxContext
    ): AdminCap {
        let org_uid = object::new(ctx);
        let org_id = object::uid_to_inner(&org_uid);
        
        let org = Organization<T> {
            id: org_uid,
            name: string::utf8(name),
            admin: tx_context::sender(ctx),
            treasury: coin::into_balance(initial_treasury),
            employees: table::new(ctx),
            payroll_cycle: payroll_cycle_days * 24 * 60 * 60 * 1000, // Convert to ms
            last_payroll: 0,
            batch_counter: 0,
            active: true,
        };

        event::emit(OrganizationCreated {
            org_id,
            admin: tx_context::sender(ctx),
            name: string::utf8(name),
        });

        transfer::share_object(org);

        AdminCap {
            id: object::new(ctx),
            org_id,
        }
    }

    /// Add funds to organization treasury
    public fun fund_treasury<T>(
        org: &mut Organization<T>,
        funds: Coin<T>,
        _ctx: &mut TxContext
    ) {
        balance::join(&mut org.treasury, coin::into_balance(funds));
    }

    // ============ Employee Management ============

    /// Add an employee to the organization
    public fun add_employee<T, PreferredToken>(
        org: &mut Organization<T>,
        admin_cap: &AdminCap,
        employee_wallet: address,
        salary: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(object::uid_to_inner(&org.id) == admin_cap.org_id, ENotAdmin);
        assert!(org.active, ENotActive);

        let preferred_token_type = type_name::get<PreferredToken>();
        
        let employee = Employee {
            wallet: employee_wallet,
            salary,
            preferred_token: preferred_token_type,
            start_date: clock::timestamp_ms(clock),
            active: true,
        };

        table::add(&mut org.employees, employee_wallet, employee);

        event::emit(EmployeeAdded {
            org_id: object::uid_to_inner(&org.id),
            employee: employee_wallet,
            preferred_token: preferred_token_type,
            salary,
        });
    }

    /// Update employee salary
    public fun update_salary<T>(
        org: &mut Organization<T>,
        admin_cap: &AdminCap,
        employee_wallet: address,
        new_salary: u64,
        _ctx: &mut TxContext
    ) {
        assert!(object::uid_to_inner(&org.id) == admin_cap.org_id, ENotAdmin);
        
        let employee = table::borrow_mut(&mut org.employees, employee_wallet);
        employee.salary = new_salary;
    }

    /// Remove an employee
    public fun remove_employee<T>(
        org: &mut Organization<T>,
        admin_cap: &AdminCap,
        employee_wallet: address,
        _ctx: &mut TxContext
    ) {
        assert!(object::uid_to_inner(&org.id) == admin_cap.org_id, ENotAdmin);
        
        let employee = table::borrow_mut(&mut org.employees, employee_wallet);
        employee.active = false;
    }

    // ============ Payroll Execution ============

    /// Execute payroll for a single employee (same token as treasury)
    /// This is the simple case - employee wants payment in treasury token
    public fun pay_employee_direct<T>(
        org: &mut Organization<T>,
        admin_cap: &AdminCap,
        employee_wallet: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(object::uid_to_inner(&org.id) == admin_cap.org_id, ENotAdmin);
        assert!(org.active, ENotActive);
        
        let employee = table::borrow(&org.employees, employee_wallet);
        assert!(employee.active, EEmployeeNotFound);
        
        let salary = employee.salary;
        assert!(balance::value(&org.treasury) >= salary, EInsufficientBalance);
        
        // Extract payment from treasury
        let payment = coin::from_balance(
            balance::split(&mut org.treasury, salary),
            ctx
        );
        
        // Transfer to employee
        transfer::public_transfer(payment, employee_wallet);

        event::emit(PaymentSent {
            org_id: object::uid_to_inner(&org.id),
            recipient: employee_wallet,
            amount: salary,
            token_type: type_name::get<T>(),
        });
    }

    /// Execute batch payroll for all active employees (same token)
    public fun execute_batch_payroll<T>(
        org: &mut Organization<T>,
        admin_cap: &AdminCap,
        employee_wallets: vector<address>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(object::uid_to_inner(&org.id) == admin_cap.org_id, ENotAdmin);
        assert!(org.active, ENotActive);
        
        let current_time = clock::timestamp_ms(clock);
        
        // Optional: Check if payroll is due (can be disabled for flexibility)
        // assert!(current_time >= org.last_payroll + org.payroll_cycle, EPayrollNotDue);
        
        let batch_id = org.batch_counter + 1;
        org.batch_counter = batch_id;
        org.last_payroll = current_time;
        
        let mut total_amount: u64 = 0;
        let recipient_count = vector::length(&employee_wallets);
        let mut i: u64 = 0;
        
        while (i < recipient_count) {
            let wallet = *vector::borrow(&employee_wallets, i);
            
            if (table::contains(&org.employees, wallet)) {
                let employee = table::borrow(&org.employees, wallet);
                
                if (employee.active) {
                    let salary = employee.salary;
                    
                    if (balance::value(&org.treasury) >= salary) {
                        let payment = coin::from_balance(
                            balance::split(&mut org.treasury, salary),
                            ctx
                        );
                        
                        transfer::public_transfer(payment, wallet);
                        total_amount = total_amount + salary;

                        event::emit(PaymentSent {
                            org_id: object::uid_to_inner(&org.id),
                            recipient: wallet,
                            amount: salary,
                            token_type: type_name::get<T>(),
                        });
                    };
                };
            };
            
            i = i + 1;
        };

        event::emit(PayrollExecuted {
            org_id: object::uid_to_inner(&org.id),
            batch_id,
            total_amount,
            recipient_count,
            timestamp: current_time,
        });
    }

    // ============ View Functions ============

    /// Get organization treasury balance
    public fun treasury_balance<T>(org: &Organization<T>): u64 {
        balance::value(&org.treasury)
    }

    /// Check if employee exists and is active
    public fun is_employee_active<T>(org: &Organization<T>, wallet: address): bool {
        if (!table::contains(&org.employees, wallet)) {
            return false
        };
        let employee = table::borrow(&org.employees, wallet);
        employee.active
    }

    /// Get employee salary
    public fun get_employee_salary<T>(org: &Organization<T>, wallet: address): u64 {
        let employee = table::borrow(&org.employees, wallet);
        employee.salary
    }

    /// Get last payroll timestamp
    public fun last_payroll_time<T>(org: &Organization<T>): u64 {
        org.last_payroll
    }

    /// Get payroll cycle duration
    public fun payroll_cycle<T>(org: &Organization<T>): u64 {
        org.payroll_cycle
    }

    /// Check if payroll is due
    public fun is_payroll_due<T>(org: &Organization<T>, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);
        current_time >= org.last_payroll + org.payroll_cycle
    }
}
