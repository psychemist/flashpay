// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {LendingPool} from "../src/LendingPool.sol";
import {PayrollHook} from "../src/PayrollHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title DeployLending
 * @notice Deploys LendingPool and PayrollHook to Base Sepolia
 * @dev Run: forge script script/DeployLending.s.sol --rpc-url base-sepolia --broadcast
 */
contract DeployLending is Script {
    // Existing deployed MockUSDC on Base Sepolia
    address constant USDC = 0x936721eB348aAc1f1A11b5288f7EF2F70c46C720;
    // Base Sepolia PoolManager
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy PayrollHook
        PayrollHook hook = new PayrollHook(IPoolManager(POOL_MANAGER));
        console2.log("PayrollHook deployed at:", address(hook));

        // 2. Deploy LendingPool
        LendingPool pool = new LendingPool(USDC);
        console2.log("LendingPool deployed at:", address(pool));

        // 3. Wire them together
        hook.setLendingPool(address(pool));

        // 4. Configure Org 1 (Test Org)
        // maxLTV: 50% (5000 bps), Interest: 5% (500 bps), Duration: 30 days
        pool.configureOrg(1, 5000, 500, 30 days, address(hook));

        // 5. Setup Mock Data for Deployer
        hook.registerOrg(1, deployer);
        hook.registerEmployee(deployer, 1);

        // Set mock position: 10,000 USDC collateral (10000 * 1e6)
        hook.setMockPosition(1, deployer, 10000 * 1e6);
        console2.log(
            "Configured Org 1 and set 10k USDC mock collateral for deployer"
        );

        // 6. Fund the Lending Pool
        // Check if deployer has USDC first
        // IERC20(USDC).approve(address(pool), 5000 * 1e6);
        // pool.fundPool(5000 * 1e6);
        // console2.log("Funded LendingPool with 5k USDC");

        vm.stopBroadcast();

        // Output for frontend config
        console2.log("\n--- Update frontend/src/lib/wagmi.ts ---");
        console2.log("payrollHook:", address(hook));
        console2.log("lendingPool:", address(pool));
    }
}
