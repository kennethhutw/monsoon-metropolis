import "dotenv/config";
import { defineConfig, configVariable } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

export default defineConfig({
  plugins: [hardhatToolboxViem],

  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  paths: {
    sources: "./contracts",
  },

  networks: {
    // In-memory simulated network — used by default for tests
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
    },

    // Local `hardhat node` instance (real JSON-RPC, for manual/frontend testing)
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },

    // Monad Testnet — primary deployment target
    // Chain ID / RPC verified against docs.monad.xyz (2026-07-30)
    monadTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("MONAD_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
      chainId: 10143,
    },

    // Base Sepolia Testnet — fallback deployment target (OP Stack chain)
    baseTestnet: {
      type: "http",
      chainType: "op",
      url: configVariable("BASE_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
      chainId: 84532,
    },
  },
});
