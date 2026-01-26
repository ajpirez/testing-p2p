import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { ChainService } from "../chain/chain.service";

const P2P_ESCROW_ABI = [
  "function fund(bytes32 orderId, address buyer) payable",
  "function release(bytes32 orderId)",
  "function refund(bytes32 orderId)",
  "function escrows(bytes32) view returns (address seller, address buyer, uint256 amount, uint8 status)",
];

@Injectable()
export class EscrowService {
  private readonly contractAddress: string;

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
    @Inject(ChainService)
    private readonly chain: ChainService,
  ) {
    this.contractAddress = this.config.get<string>("P2P_ESCROW_CONTRACT_ADDRESS") ?? "";
  }

  orderIdToEscrowKey(orderId: string) {
    // Stable bytes32 derived from order UUID string
    return ethers.id(orderId);
  }

  private getContractWithSignerIndex(index: number) {
    if (!this.contractAddress) {
      throw new BadRequestException("Missing P2P_ESCROW_CONTRACT_ADDRESS in .env");
    }
    return this.chain.getSignerByIndex(index).then((signer) => {
      return new ethers.Contract(this.contractAddress, P2P_ESCROW_ABI, signer);
    });
  }

  async fund(params: { signerIndex: number; escrowKey: string; buyerAddress: string; amountEth: string }) {
    const contract = await this.getContractWithSignerIndex(params.signerIndex);

    // MVP: we treat `amount` as native ETH amount (18 decimals)
    const value = ethers.parseEther(params.amountEth);
    const tx = await contract.fund(params.escrowKey, params.buyerAddress, { value });
    const receipt = await tx.wait(1);

    return { txHash: tx.hash as string, blockNumber: receipt?.blockNumber ?? null };
  }

  async release(params: { signerIndex: number; escrowKey: string }) {
    const contract = await this.getContractWithSignerIndex(params.signerIndex);
    const tx = await contract.release(params.escrowKey);
    const receipt = await tx.wait(1);
    return { txHash: tx.hash as string, blockNumber: receipt?.blockNumber ?? null };
  }

  async refund(params: { signerIndex: number; escrowKey: string }) {
    const contract = await this.getContractWithSignerIndex(params.signerIndex);
    const tx = await contract.refund(params.escrowKey);
    const receipt = await tx.wait(1);
    return { txHash: tx.hash as string, blockNumber: receipt?.blockNumber ?? null };
  }
}

