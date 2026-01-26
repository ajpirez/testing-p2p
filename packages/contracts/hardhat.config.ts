import "dotenv/config";
import "@nomicfoundation/hardhat-toolbox";
import type { HardhatUserConfig } from "hardhat/config";

const ganacheUrl = process.env.GANACHE_RPC_URL ?? "http://127.0.0.1:7545";
const deployerPk = process.env.DEPLOYER_PRIVATE_KEY;
const ganacheMnemonic = process.env.GANACHE_MNEMONIC;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    ganache: {
      url: ganacheUrl,
      accounts: deployerPk
        ? [deployerPk]
        : ganacheMnemonic
          ? { mnemonic: ganacheMnemonic }
          : undefined,
    },
  },
};

export default config;

