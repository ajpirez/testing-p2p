import "dotenv/config";
import "@nomicfoundation/hardhat-toolbox";
import type { HardhatUserConfig } from "hardhat/config";

const ganacheUrl = process.env.GANACHE_RPC_URL ?? "http://127.0.0.1:7545";
// Por defecto 1337 (Ganache). Sobrescribe con GANACHE_CHAIN_ID solo si usas otra red.
const ganacheChainId = process.env.GANACHE_CHAIN_ID
  ? parseInt(process.env.GANACHE_CHAIN_ID, 10)
  : 1337;
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
      chainId: ganacheChainId,
      accounts: deployerPk
        ? [deployerPk]
        : ganacheMnemonic
          ? { mnemonic: ganacheMnemonic }
          : undefined,
    },
    bscTestnet: {
      url: process.env.BSC_RPC_URL ?? "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: deployerPk ? [deployerPk] : [],
    },
    bsc: {
      url: process.env.BSC_MAINNET_RPC ?? "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: deployerPk ? [deployerPk] : [],
    },
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC ?? "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: deployerPk ? [deployerPk] : [],
    },
    polygon: {
      url: process.env.POLYGON_RPC ?? "https://polygon-rpc.com",
      chainId: 137,
      accounts: deployerPk ? [deployerPk] : [],
    },
  },
};

export default config;

