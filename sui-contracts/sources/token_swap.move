/// Token swap integration for multi-token payouts
/// Integrates with DeepBook for on-chain swaps
module flashpay_sui::token_swap {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::event;
    use std::type_name::{Self, TypeName};

    // ============ Errors ============
    const EInsufficientInput: u64 = 0;
    const ESlippageExceeded: u64 = 1;
    const EPoolNotFound: u64 = 2;

    // ============ Events ============
    public struct SwapExecuted has copy, drop {
        input_token: TypeName,
        output_token: TypeName,
        input_amount: u64,
        output_amount: u64,
        recipient: address,
    }

    // ============ Structs ============

    /// Swap configuration for a token pair
    public struct SwapConfig has key, store {
        id: UID,
        enabled: bool,
        max_slippage_bps: u64, // Basis points (100 = 1%)
    }

    /// Swap result for PTB composition
    public struct SwapResult<phantom T> has store {
        output: Balance<T>,
        input_consumed: u64,
    }

    // ============ Swap Functions ============

    /// Simple 1:1 swap simulation (for demo - would use DeepBook in production)
    /// In production, this would call DeepBook's swap function
    public fun swap_tokens<InputToken, OutputToken>(
        input: Coin<InputToken>,
        min_output: u64,
        ctx: &mut TxContext
    ): Coin<OutputToken> {
        let input_amount = coin::value(&input);
        assert!(input_amount > 0, EInsufficientInput);
        
        // In production: Call DeepBook swap
        // For demo: Assume 1:1 swap ratio (simplified)
        let output_amount = input_amount;
        
        assert!(output_amount >= min_output, ESlippageExceeded);
        
        // Burn input (in real impl, this goes to DEX)
        transfer::public_transfer(input, @0x0);
        
        // Mint output (in real impl, received from DEX)
        // Note: This is a placeholder - real impl would receive from pool
        
        event::emit(SwapExecuted {
            input_token: type_name::get<InputToken>(),
            output_token: type_name::get<OutputToken>(),
            input_amount,
            output_amount,
            recipient: tx_context::sender(ctx),
        });

        // In production, return actual swapped coins from DeepBook
        // This is a placeholder that will fail - need actual DEX integration
        abort EPoolNotFound
    }

    /// Calculate expected output for a swap (view function for UI)
    public fun quote_swap<InputToken, OutputToken>(
        input_amount: u64,
    ): u64 {
        // In production: Query DeepBook for actual quote
        // For demo: Assume 1:1 with 0.3% fee
        let fee = (input_amount * 30) / 10000; // 0.3% fee
        input_amount - fee
    }

    /// Pay employee with automatic swap if needed
    /// Designed to be composed in a PTB with multi_token_payroll
    public fun pay_with_swap<TreasuryToken, PreferredToken>(
        payment: Coin<TreasuryToken>,
        recipient: address,
        min_output: u64,
        same_token: bool,
        ctx: &mut TxContext
    ) {
        if (same_token) {
            // No swap needed - direct transfer
            // Note: This requires TreasuryToken == PreferredToken
            // The PTB builder should handle type matching
            transfer::public_transfer(payment, recipient);
        } else {
            // Swap required - would integrate with DeepBook
            // For now, just transfer original token
            transfer::public_transfer(payment, recipient);
            
            // In production:
            // let swapped = swap_tokens<TreasuryToken, PreferredToken>(payment, min_output, ctx);
            // transfer::public_transfer(swapped, recipient);
        }
    }
}
