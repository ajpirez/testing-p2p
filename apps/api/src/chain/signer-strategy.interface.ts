import type { Provider, Signer } from "ethers";

/**
 * Parámetros que recibe una estrategia para obtener un signer.
 * La estrategia no conoce chainId ni nombres de red; solo config e index.
 */
export interface SignerStrategyContext {
  /** Índice solicitado (ej. 0 = primera cuenta / clave configurada) */
  index: number;
  /** Provider de la red (ya conectado) */
  provider: Provider;
  /** Configuración de la cadena: rpc, escrow, y opcionalmente signerPk */
  config: { rpcUrl: string; escrowAddress: string; signerPk?: string };
}

/**
 * Estrategia para obtener un Signer en una red.
 * Puede ser "por índice en el provider" o "por clave privada" según la config.
 */
export interface SignerStrategy {
  getSigner(ctx: SignerStrategyContext): Promise<Signer>;
}
