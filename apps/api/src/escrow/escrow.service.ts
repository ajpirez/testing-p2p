import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { ChainService } from "../chain/chain.service";
import * as fs from "fs";
import * as path from "path";

const ERC20_ALLOWANCE_ABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ERC20_APPROVE_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

function loadABIFromArtifact(contractName: string): any[] {
  const dir = contractName === "P2PEscrow" ? "P2PEscrow.sol" : "P2PEscrowERC20.sol";
  const file = contractName === "P2PEscrow" ? "P2PEscrow.json" : "P2PEscrowERC20.json";
  try {
    const artifactPath = path.join(
      __dirname,
      `../../../../packages/contracts/artifacts/contracts/${dir}/${file}`,
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    return artifact.abi;
  } catch (error) {
    Logger.error(
      `No se pudo cargar el ABI desde el artifact (${contractName}). Asegúrate de compilar con 'hardhat compile'`,
      "EscrowService",
    );
    throw new Error(`Error cargando ABI: ${error instanceof Error ? error.message : String(error)}`);
  }
}

type Erc20Asset = "USDT" | "USDC";

@Injectable()
export class EscrowService {
  private readonly abi: any[];
  private readonly abiErc20: any[];
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
    @Inject(ChainService)
    private readonly chain: ChainService,
  ) {
    this.abi = loadABIFromArtifact("P2PEscrow");
    this.abiErc20 = loadABIFromArtifact("P2PEscrowERC20");
    this.logger.log(`✅ ABI native + ERC-20 cargados (${this.abi.length} / ${this.abiErc20.length} items)`);
  }

  orderIdToEscrowKey(orderId: string): string {
    return ethers.id(orderId);
  }

  getEscrowAddressForAsset(chainId: number, asset: Erc20Asset): string {
    return this.chain.getEscrowAddressForAsset(chainId, asset);
  }

  private async getContractWithSigner(chainId: number, signerIndex: number): Promise<ethers.Contract> {
    const address = this.chain.getEscrowAddress(chainId);
    if (!address) {
      throw new BadRequestException(`Escrow not configured for chain ${chainId}. Set P2P_ESCROW_CONTRACT_ADDRESS or P2P_CHAINS.`);
    }
    const signer = await this.chain.getSignerByIndex(chainId, signerIndex);
    return new ethers.Contract(address, this.abi, signer);
  }

  private async getContractErc20WithSigner(
    chainId: number,
    signerIndex: number,
    asset: Erc20Asset,
  ): Promise<ethers.Contract> {
    const address = this.chain.getEscrowAddressForAsset(chainId, asset);
    const signer = await this.chain.getSignerByIndex(chainId, signerIndex);
    return new ethers.Contract(address, this.abiErc20, signer);
  }

  getContractReadOnly(chainId: number): ethers.Contract {
    const address = this.chain.getEscrowAddress(chainId);
    if (!address) {
      throw new BadRequestException(`Escrow not configured for chain ${chainId}.`);
    }
    const provider = this.chain.getProvider(chainId);
    return new ethers.Contract(address, this.abi, provider);
  }

  /**
   * Check if the owner has sufficient token allowance for the escrow contract.
   * Use before calling fund() for ERC-20 to return a clear error if the seller hasn't approved.
   */
  async checkAllowance(params: {
    chainId: number;
    asset: Erc20Asset;
    ownerAddress: string;
    amountInTokenUnits: bigint;
  }): Promise<{ sufficient: boolean; allowance: bigint }> {
    const tokenAddress = this.chain.getTokenAddressForAsset(params.chainId, params.asset);
    const escrowAddress = this.chain.getEscrowAddressForAsset(params.chainId, params.asset);
    const provider = this.chain.getProvider(params.chainId);
    const token = new ethers.Contract(tokenAddress, ERC20_ALLOWANCE_ABI, provider);
    const allowance = await token.allowance(params.ownerAddress, escrowAddress);
    return {
      sufficient: allowance >= params.amountInTokenUnits,
      allowance,
    };
  }

  /**
   * Envía la tx approve desde el signer (para dev/test cuando el seller es cuenta del backend).
   */
  async approveToken(params: {
    chainId: number;
    signerIndex: number;
    asset: Erc20Asset;
    spenderAddress: string;
    amountInTokenUnits: bigint;
  }): Promise<{ txHash: string }> {
    const tokenAddress = this.chain.getTokenAddressForAsset(params.chainId, params.asset);
    const signer = await this.chain.getSignerByIndex(params.chainId, params.signerIndex);
    const token = new ethers.Contract(tokenAddress, ERC20_APPROVE_ABI, signer);
    const tx = await token.approve(params.spenderAddress, params.amountInTokenUnits);
    await tx.wait(1);
    return { txHash: tx.hash as string };
  }

  async fund(params: {
    chainId: number;
    signerIndex: number;
    escrowKey: string;
    buyerAddress: string;
    amountEth?: string;
    asset?: Erc20Asset;
    amountInTokenUnits?: bigint;
  }) {
    if (params.asset === "USDT" || params.asset === "USDC") {
      if (params.amountInTokenUnits === undefined || params.amountInTokenUnits === null) {
        throw new BadRequestException("amountInTokenUnits required for ERC-20 fund");
      }
      const contract = await this.getContractErc20WithSigner(params.chainId, params.signerIndex, params.asset);
      const tx = await contract.fund(params.escrowKey, params.buyerAddress, params.amountInTokenUnits);
      const receipt = await tx.wait(1);
      return { txHash: tx.hash as string, blockNumber: receipt?.blockNumber ?? null };
    }
    const contract = await this.getContractWithSigner(params.chainId, params.signerIndex);
    const value = ethers.parseEther(params.amountEth ?? "0");
    const tx = await contract.fund(params.escrowKey, params.buyerAddress, { value });
    const receipt = await tx.wait(1);
    return { txHash: tx.hash as string, blockNumber: receipt?.blockNumber ?? null };
  }

  async release(params: {
    chainId: number;
    signerIndex: number;
    escrowKey: string;
    asset?: Erc20Asset;
  }) {
    if (params.asset === "USDT" || params.asset === "USDC") {
      const contract = await this.getContractErc20WithSigner(params.chainId, params.signerIndex, params.asset);
      const tx = await contract.release(params.escrowKey);
      const receipt = await tx.wait(1);
      return { txHash: tx.hash as string, blockNumber: receipt?.blockNumber ?? null };
    }
    const contract = await this.getContractWithSigner(params.chainId, params.signerIndex);
    const tx = await contract.release(params.escrowKey);
    const receipt = await tx.wait(1);
    return { txHash: tx.hash as string, blockNumber: receipt?.blockNumber ?? null };
  }

  async refund(params: {
    chainId: number;
    signerIndex: number;
    escrowKey: string;
    asset?: Erc20Asset;
  }) {
    if (params.asset === "USDT" || params.asset === "USDC") {
      const contract = await this.getContractErc20WithSigner(params.chainId, params.signerIndex, params.asset);
      const tx = await contract.refund(params.escrowKey);
      const receipt = await tx.wait(1);
      return { txHash: tx.hash as string, blockNumber: receipt?.blockNumber ?? null };
    }
    const contract = await this.getContractWithSigner(params.chainId, params.signerIndex);
    const tx = await contract.refund(params.escrowKey);
    const receipt = await tx.wait(1);
    return { txHash: tx.hash as string, blockNumber: receipt?.blockNumber ?? null };
  }
}
