import "dotenv/config";
import { ethers } from "hardhat";

const INITIAL_MINT = 1_000_000n * 10n ** 6n; // 1M tokens, 6 decimals

/**
 * Deploy everything needed for ERC-20 P2P on Ganache:
 * - Mock USDT (6 decimals) + mint to deployer
 * - Mock USDC (6 decimals) + mint to deployer
 * - P2PEscrowERC20 for USDT
 * - P2PEscrowERC20 for USDC
 *
 * Run: pnpm deploy:erc20-all:ganache
 * Then add the printed P2P_CHAINS (or escrow/token vars) to apps/api/.env
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1. Mock USDT
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdt = await MockERC20.deploy("Mock USDT", "USDT", 6);
  await usdt.waitForDeployment();
  const tokenUsdt = await usdt.getAddress();
  await usdt.mint(deployer.address, INITIAL_MINT);
  console.log("Mock USDT deployed to:", tokenUsdt, "(minted", INITIAL_MINT.toString(), "to deployer)");

  // 2. Mock USDC
  const usdc = await MockERC20.deploy("Mock USDC", "USDC", 6);
  await usdc.waitForDeployment();
  const tokenUsdc = await usdc.getAddress();
  await usdc.mint(deployer.address, INITIAL_MINT);
  console.log("Mock USDC deployed to:", tokenUsdc, "(minted", INITIAL_MINT.toString(), "to deployer)");

  // 3. P2PEscrowERC20 for USDT
  const EscrowERC20 = await ethers.getContractFactory("P2PEscrowERC20");
  const escrowUsdt = await EscrowERC20.deploy(tokenUsdt);
  await escrowUsdt.waitForDeployment();
  const escrowUsdtAddress = await escrowUsdt.getAddress();
  console.log("P2PEscrowERC20 (USDT) deployed to:", escrowUsdtAddress);

  // 4. P2PEscrowERC20 for USDC
  const escrowUsdc = await EscrowERC20.deploy(tokenUsdc);
  await escrowUsdc.waitForDeployment();
  const escrowUsdcAddress = await escrowUsdc.getAddress();
  console.log("P2PEscrowERC20 (USDC) deployed to:", escrowUsdcAddress);

  const ganacheRpc = process.env.GANACHE_RPC_URL ?? "http://127.0.0.1:7545";
  const chainId = process.env.GANACHE_CHAIN_ID
    ? parseInt(process.env.GANACHE_CHAIN_ID, 10)
    : 1337;
  const nativeEscrow = process.env.P2P_ESCROW_CONTRACT_ADDRESS?.trim();

  console.log("\n--- Añade a apps/api/.env ---");
  console.log("1. Si aún no lo has hecho, despliega el escrow nativo: pnpm contracts:deploy:ganache");
  console.log("2. Pon la dirección del P2PEscrow nativo en 'escrow' y esta línea en .env:\n");
  const chainsEntry = {
    rpc: ganacheRpc,
    escrow: nativeEscrow || "0x13c764643E05b8866c7935E18e7DFC76A6f06413",
    escrowUsdt: escrowUsdtAddress,
    tokenUsdt,
    escrowUsdc: escrowUsdcAddress,
    tokenUsdc,
  };
  console.log("P2P_CHAINS=" + JSON.stringify({ [chainId]: chainsEntry }));
  console.log("\n(Opcional: si ya tenías P2P_ESCROW_CONTRACT_ADDRESS en .env, puedes seguir usándolo para la red 1337 sin P2P_CHAINS; entonces añade las variables por cadena según docs.)");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
