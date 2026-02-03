import "dotenv/config";
import { ethers } from "hardhat";

/**
 * Deploy P2PEscrowERC20 for a given ERC-20 token (e.g. USDT, USDC).
 * Set TOKEN_ADDRESS in .env or pass as env when running:
 *   TOKEN_ADDRESS=0x... pnpm hardhat run scripts/deploy-erc20.ts --network bscTestnet
 */
async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    throw new Error("Set TOKEN_ADDRESS in .env (e.g. USDT or USDC contract address)");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Token address:", tokenAddress);

  const EscrowERC20 = await ethers.getContractFactory("P2PEscrowERC20");
  const escrow = await EscrowERC20.deploy(tokenAddress);
  await escrow.waitForDeployment();

  console.log("P2PEscrowERC20 deployed to:", await escrow.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
