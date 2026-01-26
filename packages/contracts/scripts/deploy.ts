import "dotenv/config";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const Escrow = await ethers.getContractFactory("P2PEscrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();

  console.log("P2PEscrow deployed to:", await escrow.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

