import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { ChainService } from "../chain/chain.service";
import * as fs from "fs";
import * as path from "path";

/**
 * Carga el ABI completo desde el JSON generado por Hardhat
 * Este JSON se genera automáticamente cuando compilas el contrato con `hardhat compile`
 * Ruta: packages/contracts/artifacts/contracts/P2PEscrow.sol/P2PEscrow.json
 */
function loadABIFromArtifact(): any[] {
  try {
    // Ruta relativa desde apps/api/src/escrow/ a packages/contracts/artifacts/
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
  private readonly contractAddress: string;
  private readonly abi: any[];
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
    @Inject(ChainService)
    private readonly chain: ChainService,
  ) {
    this.contractAddress = this.config.get<string>("P2P_ESCROW_CONTRACT_ADDRESS") ?? "";
    // Cargar ABI completo desde el artifact (incluye funciones Y eventos)
    this.abi = loadABIFromArtifact();
    this.logger.log(`✅ ABI cargado desde artifact (${this.abi.length} items, incluye eventos)`);
  }

  orderIdToEscrowKey(orderId: string) {
    // Stable bytes32 derived from order UUID string
    return ethers.id(orderId);
  }

  /**
   * Crea una instancia del contrato con un signer (para escribir/transacciones)
   * 
   * ¿Cómo funciona la llamada a funciones del contrato?
   * 1. ethers.Contract necesita: dirección del contrato, ABI, y un signer/provider
   * 2. El ABI le dice a ethers qué funciones existen y cómo llamarlas
   * 3. El signer es quien firma la transacción (necesario para funciones que modifican estado)
   * 4. Cuando llamas contract.fund(...), ethers:
   *    - Codifica los parámetros según el ABI
   *    - Crea una transacción firmada por el signer
   *    - La envía a la blockchain (Ganache en local)
   *    - Espera la confirmación
   */
  private getContractWithSignerIndex(index: number) {
    if (!this.contractAddress) {
      throw new BadRequestException("Missing P2P_ESCROW_CONTRACT_ADDRESS in .env");
    }
    return this.chain.getSignerByIndex(index).then((signer) => {
      return new ethers.Contract(this.contractAddress, this.abi, signer);
    });
  }

  /**
   * Obtiene una instancia del contrato sin signer (solo lectura, para escuchar eventos)
   */
  getContractReadOnly(): ethers.Contract {
    if (!this.contractAddress) {
      throw new BadRequestException("Missing P2P_ESCROW_CONTRACT_ADDRESS in .env");
    }
    const provider = this.chain.getProvider();
    return new ethers.Contract(this.contractAddress, this.abi, provider);
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

