// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AjoCircle} from "../src/AjoCircle.sol";
import {MockERC20} from "../src/MockERC20.sol";

/// @notice Deploys AjoCircle. No keys live here: pass the signer on the CLI
///         (e.g. `--account deployer` from `cast wallet import`, or `--private-key $PRIVATE_KEY`).
///
/// Env vars (all optional):
///   TOKEN_ADDRESS       stablecoin used for the optional demo circle
///                       (Mezo testnet MUSD 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503,
///                        Arc USDC ERC-20 interface 0x3600000000000000000000000000000000000000)
///   DEPLOY_MOCK_TOKEN   "true" to deploy a mintable MockERC20 (local anvil only) and use it as TOKEN_ADDRESS
///   CREATE_DEMO_CIRCLE  "true" to create one demo circle after deploying
///   DEMO_CONTRIBUTION   contribution in token base units (default 10e18; use 6-decimal units for Arc USDC)
///   DEMO_MEMBERS        member count (default 3)
///   DEMO_ROUND_LENGTH   seconds (default 600)
///   DEMO_COLLATERAL     "true" to require collateral (default true)
contract Deploy is Script {
    function run() external returns (AjoCircle ajo, address token) {
        bool deployMock = vm.envOr("DEPLOY_MOCK_TOKEN", false);
        token = vm.envOr("TOKEN_ADDRESS", address(0));
        bool demo = vm.envOr("CREATE_DEMO_CIRCLE", false);

        vm.startBroadcast();
        ajo = new AjoCircle();
        console2.log("AjoCircle deployed at", address(ajo));

        if (deployMock) {
            MockERC20 mock = new MockERC20("Mock USD", "mUSD", 18);
            mock.mint(msg.sender, 1_000_000e18);
            token = address(mock);
            console2.log("MockERC20 deployed at", token);
        }

        if (demo) {
            require(token != address(0), "TOKEN_ADDRESS required for demo circle");
            uint256 id = ajo.createCircle(
                token,
                vm.envOr("DEMO_CONTRIBUTION", uint256(10e18)),
                uint16(vm.envOr("DEMO_MEMBERS", uint256(3))),
                uint64(vm.envOr("DEMO_ROUND_LENGTH", uint256(600))),
                false,
                vm.envOr("DEMO_COLLATERAL", true),
                "Demo Ajo"
            );
            console2.log("Demo circle id", id);
        }
        vm.stopBroadcast();
    }
}
