// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {OrgRegistry} from "../src/OrgRegistry.sol";
import {Payroll} from "../src/Payroll.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";

/**
 * @title DeployFlashPay
 * @notice Deploys FlashPay contracts to Base Sepolia
 * @dev Run: forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast
 */
contract DeployFlashPay is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDC (on testnet only)
        MockUSDC usdc = new MockUSDC();
        console2.log("MockUSDC deployed at:", address(usdc));

        // 2. Deploy OrgRegistry
        OrgRegistry orgRegistry = new OrgRegistry();
        console2.log("OrgRegistry deployed at:", address(orgRegistry));

        // 3. Deploy Payroll with dependencies
        Payroll payroll = new Payroll(address(orgRegistry), address(usdc));
        console2.log("Payroll deployed at:", address(payroll));

        // 4. Mint some test USDC to deployer
        usdc.mint(msg.sender, 1_000_000 * 1e6); // 1M USDC
        console2.log("Minted 1M USDC to deployer");

        vm.stopBroadcast();

        // Output for frontend config
        console2.log("\n--- Update frontend/src/lib/wagmi.ts ---");
        console2.log("84532: {");
        console2.log("  orgRegistry:", address(orgRegistry));
        console2.log("  payroll:", address(payroll));
        console2.log("  usdc:", address(usdc));
        console2.log("}");
    }
}
