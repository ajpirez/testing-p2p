import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from "@nestjs/common";
import { ethers } from "ethers";
import { ChainService } from "../chain/chain.service";
import { EscrowService } from "./escrow.service";

/**
 * Servicio que escucha eventos del contrato P2PEscrow en tiempo real
 * 
 * ¿Cómo funcionan los eventos?
 * 1. Cuando el contrato ejecuta `emit Released(orderId)`, el evento se escribe en los logs de la tx
 * 2. Los eventos NO se "envían" automáticamente, quedan en la blockchain
 * 3. Para escucharlos, necesitas suscribirte usando ethers.js
 * 4. Este servicio se inicia automáticamente cuando arranca la app (OnModuleInit)
 */
@Injectable()
export class EscrowEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EscrowEventsService.name);
  private contract: ethers.Contract | null = null;
  private listeners: Array<() => void> = [];

  constructor(
    @Inject(ChainService)
    private readonly chain: ChainService,
    @Inject(EscrowService)
    private readonly escrowService: EscrowService,
  ) {}

  async onModuleInit() {
    const defaultChainId = this.chain.getDefaultChainId();
    if (!this.chain.isChainConfigured(defaultChainId)) {
      this.logger.warn("Chain por defecto no configurado, eventos deshabilitados");
      return;
    }
    const addr = this.chain.getEscrowAddress(defaultChainId);
    if (!addr) {
      this.logger.warn("P2P_ESCROW_CONTRACT_ADDRESS no configurado para chain por defecto, eventos deshabilitados");
      return;
    }

    try {
      this.contract = this.escrowService.getContractReadOnly(defaultChainId);
      this.setupEventListeners();
      this.logger.log(`✅ Servicio de eventos iniciado - chain ${defaultChainId}`);
    } catch (error) {
      this.logger.error("Error iniciando servicio de eventos", error);
    }
  }

  private setupEventListeners() {
    if (!this.contract) return;

    // Evento: Funded
    const fundedListener = (orderId: string, seller: string, buyer: string, amount: bigint, event: any) => {
      this.logger.log(
        `🔵 [EVENT] Funded - orderId: ${orderId}, seller: ${seller}, buyer: ${buyer}, amount: ${ethers.formatEther(amount)} ETH`,
      );
      // Aquí podrías:
      // - Validar que el evento coincide con la DB
      // - Enviar notificación al buyer
      // - Registrar en logs de auditoría
    };
    this.contract.on("Funded", fundedListener);
    this.listeners.push(() => this.contract?.off("Funded", fundedListener));

    // Evento: Released
    const releasedListener = (orderId: string, event: any) => {
      this.logger.log(`🟢 [EVENT] Released - orderId: ${orderId}`);
      // Aquí podrías:
      // - Validar que el evento coincide con la DB
      // - Enviar notificación al buyer
      // - Registrar en logs de auditoría
    };
    this.contract.on("Released", releasedListener);
    this.listeners.push(() => this.contract?.off("Released", releasedListener));

    // Evento: Refunded
    const refundedListener = (orderId: string, event: any) => {
      this.logger.log(`🟡 [EVENT] Refunded - orderId: ${orderId}`);
      // Aquí podrías:
      // - Validar que el evento coincide con la DB
      // - Enviar notificación al seller
      // - Registrar en logs de auditoría
    };
    this.contract.on("Refunded", refundedListener);
    this.listeners.push(() => this.contract?.off("Refunded", refundedListener));
  }

  /**
   * Consulta eventos históricos desde un bloque específico
   */
  async queryPastEvents(eventName: "Funded" | "Released" | "Refunded", fromBlock: number = 0) {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }
    const filter = this.contract.filters[eventName]();
    const events = await this.contract.queryFilter(filter, fromBlock);
    return events;
  }

  async onModuleDestroy() {
    // Limpiar listeners al cerrar la app
    this.listeners.forEach((cleanup) => cleanup());
    this.logger.log("🛑 Servicio de eventos detenido");
  }
}
