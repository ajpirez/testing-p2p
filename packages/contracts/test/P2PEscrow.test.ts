import { expect } from "chai";
import { ethers } from "hardhat";

describe("P2PEscrow", () => {
  it("fund -> release sends ETH to buyer", async () => {
    const [seller, buyer] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("P2PEscrow");
    const escrow = await Escrow.deploy();
    await escrow.waitForDeployment();

    const orderId = ethers.keccak256(ethers.toUtf8Bytes("order-1"));
    const amount = ethers.parseEther("0.01");

    const buyerBefore = await buyer.provider.getBalance(buyer.address);

    // TypeScript: sin TypeChain en MVP, casteamos a any para usar métodos del ABI.
    await (escrow.connect(seller) as any).fund(orderId, buyer.address, { value: amount });
    await (escrow.connect(seller) as any).release(orderId);

    const buyerAfter = await buyer.provider.getBalance(buyer.address);
    expect(buyerAfter).to.be.greaterThan(buyerBefore);
  });
});

