import * as path from "path";
import { config } from "dotenv";
import { ethers } from "hardhat";

config({ path: path.join(__dirname, "..", ".env") });

const AMOUNT_USDT = 10_000n * 10n ** 6n; // 10k USDT (6 decimals)
const AMOUNT_USDC = 10_000n * 10n ** 6n; // 10k USDC (6 decimals)

/**
 * Envía mock USDT y USDC a una wallet para pruebas.
 * El deployer (cuenta que desplegó con deploy-erc20-all) debe tener saldo.
 *
 * Uso:
 *   TARGET_ADDRESS=0xTuWallet pnpm run fund-test-tokens:ganache
 *   (O sin TARGET_ADDRESS para enviar a la cuenta 0 de Ganache = seller en test-flow)
 *
 * Variables de entorno (copia de P2P_CHAINS en apps/api/.env):
 *   TOKEN_USDT=0x...
 *   TOKEN_USDC=0x...
 *   TARGET_ADDRESS=0x... (opcional; si no se pone, se usa la cuenta 0 = seller en dev)
 */
async function main() {
  const tokenUsdt = process.env.TOKEN_USDT;
  const tokenUsdc = process.env.TOKEN_USDC;
  if (!tokenUsdt || !ethers.isAddress(tokenUsdt)) {
    throw new Error(
      "Set TOKEN_USDT in packages/contracts/.env (copia tokenUsdt de P2P_CHAINS en apps/api/.env)"
    );
  }
  if (!tokenUsdc || !ethers.isAddress(tokenUsdc)) {
    throw new Error(
      "Set TOKEN_USDC in packages/contracts/.env (copia tokenUsdc de P2P_CHAINS en apps/api/.env)"
    );
  }

  const [deployer] = await ethers.getSigners();
  const target = process.env.TARGET_ADDRESS?.trim();
  const toAddress = target && ethers.isAddress(target) ? target : deployer.address;

  if (toAddress.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("Target (recipient):", toAddress);
  } else {
    console.log("Target: cuenta 0 (deployer) — será el seller en test-flow");
  }

  const MockERC20 = await ethers.getContractFactory("MockERC20");

  const usdt = MockERC20.attach(tokenUsdt) as { transfer: (to: string, amount: bigint) => Promise<boolean> };
  const usdc = MockERC20.attach(tokenUsdc) as { transfer: (to: string, amount: bigint) => Promise<boolean> };

  console.log("\nEnviando mock USDT...");
  const tx1 = await usdt.transfer(toAddress, AMOUNT_USDT);
  await tx1.wait(1);
  console.log("  OK:", AMOUNT_USDT.toString(), "units (10_000 USDT)");

  console.log("Enviando mock USDC...");
  const tx2 = await usdc.transfer(toAddress, AMOUNT_USDC);
  await tx2.wait(1);
  console.log("  OK:", AMOUNT_USDC.toString(), "units (10_000 USDC)");

  console.log("\nListo. La wallet tiene USDT y USDC de prueba.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
