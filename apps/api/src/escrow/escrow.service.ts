import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { ChainService } from "../chain/chain.service";
import * as fs from "fs";
import * as path from "path";

function loadABIFromArtifact(): any[] {
  try {
    const artifactPath = path.join(
      __dirname,
      "../../../../packages/contracts/artifacts/contracts/P2PEscrow.sol/P2PEscrow.json",
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    return artifact.abi;
  } catch (error) {
    Logger.error(
      "No se pudo cargar el ABI desde el artifact. Asegúrate de compilar el contrato con 'hardhat compile'",
      "EscrowService",
    );
    throw new Error(`Error cargando ABI: ${error instanceof Error ? error.message : String(error)}`);
  }
}

@Injectable()
export class EscrowService {
  private readonly abi: any[];
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
    @Inject(ChainService)
    private readonly chain: ChainService,
  ) {
    this.abi = loadABIFromArtifact();
    this.logger.log(`✅ ABI cargado desde artifact (${this.abi.length} items)`);
  }

  orderIdToEscrowKey(orderId: string): string {
    return ethers.id(orderId);
  }

  private async getContractWithSigner(chainId: number, signerIndex: number): Promise<ethers.Contract> {
    const address = this.chain.getEscrowAddress(chainId);
    if (!address) {
      throw new BadRequestException(`Escrow not configured for chain ${chainId}. Set P2P_ESCROW_CONTRACT_ADDRESS or P2P_CHAINS.`);
    }
    const signer = await this.chain.getSignerByIndex(chainId, signerIndex);
    return new ethers.Contract(address, this.abi, signer);
  }

  getContractReadOnly(chainId: number): ethers.Contract {
    const address = this.chain.getEscrowAddress(chainId);
    if (!address) {
      throw new BadRequestException(`Escrow not configured for chain ${chainId}.`);
    }
    const provider = this.chain.getProvider(chainId);
    return new ethers.Contract(address, this.abi, provider);
  }

  async fund(params: {
    chainId: number;
    signerIndex: number;
    escrowKey: string;
    buyerAddress: string;
    amountEth: string;
  }) {
    const contract = await this.getContractWithSigner(params.chainId, params.signerIndex);
    const value = ethers.parseEther(params.amountEth);
    const tx = await contract.fund(params.escrowKey, params.buyerAddress, { value });
    const receipt = await tx.wait(1);
    return { txHash: tx.hash as string, blockNumber: receipt?.blockNumber ?? null };
  }

  async release(params: { chainId: number; signerIndex: number; escrowKey: string }) {
    const contract = await this.getContractWithSigner(params.chainId, params.signerIndex);
    const tx = await contract.release(params.escrowKey);
    const receipt = await tx.wait(1);
    return { txHash: tx.hash as string, blockNumber: receipt?.blockNumber ?? null };
  }

  async refund(params: { chainId: number; signerIndex: number; escrowKey: string }) {
    const contract = await this.getContractWithSigner(params.chainId, params.signerIndex);
    const tx = await contract.refund(params.escrowKey);
    const receipt = await tx.wait(1);
    return { txHash: tx.hash as string, blockNumber: receipt?.blockNumber ?? null };
  }
}
