import { ethers } from "ethers";
import type { SignerStrategy, SignerStrategyContext } from "../signer-strategy.interface";

/**
 * Estrategia: usar la cuenta desbloqueada del provider por índice (ej. Ganache).
 */
export class ProviderIndexSignerStrategy implements SignerStrategy {
  async getSigner(ctx: SignerStrategyContext): Promise<ethers.Signer> {
    const provider = ctx.provider as ethers.JsonRpcProvider;
    return provider.getSigner(ctx.index);
  }
}

/**
 * Estrategia: usar una clave privada configurada.
 * Solo soporta index === 0 (una cuenta por cadena).
 */
export class PrivateKeySignerStrategy implements SignerStrategy {
  constructor(private readonly signerPk: string) {
    if (!signerPk?.startsWith("0x") || signerPk.length < 64) {
      throw new Error("PrivateKeySignerStrategy requires a valid hex private key (0x...)");
    }
  }

  async getSigner(ctx: SignerStrategyContext): Promise<ethers.Signer> {
    if (ctx.index !== 0) {
      throw new Error("PrivateKeySignerStrategy only supports index 0");
    }
    return new ethers.Wallet(this.signerPk, ctx.provider);
  }
}

/** Tipo de config que expone signerPk opcional */
export type ChainConfigWithSigner = SignerStrategyContext["config"];

/**
 * Devuelve la estrategia a usar según la config de la cadena.
 * No usa nombres de red ni chainIds; solo la forma de la config.
 */
export function getSignerStrategyFor(config: ChainConfigWithSigner): SignerStrategy {
  if (config.signerPk && config.signerPk.startsWith("0x") && config.signerPk.length >= 64) {
    return new PrivateKeySignerStrategy(config.signerPk);
  }
  return new ProviderIndexSignerStrategy();
}
