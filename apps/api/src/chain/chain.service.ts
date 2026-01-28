import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { DEFAULT_CHAIN_ID, parseChainsFromEnv, type ChainConfig } from "./chain-config";

@Injectable()
export class ChainService {
  private readonly registry: Map<number, ChainConfig>;
  private readonly providers = new Map<number, ethers.JsonRpcProvider>();

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
  ) {
    const env = {
      GANACHE_RPC_URL: this.config.get<string>("GANACHE_RPC_URL"),
      P2P_ESCROW_CONTRACT_ADDRESS: this.config.get<string>("P2P_ESCROW_CONTRACT_ADDRESS"),
      P2P_CHAINS: this.config.get<string>("P2P_CHAINS"),
    };
    this.registry = parseChainsFromEnv(env);
  }

  getDefaultChainId(): number {
    return DEFAULT_CHAIN_ID;
  }

  getProvider(chainId: number = DEFAULT_CHAIN_ID): ethers.JsonRpcProvider {
    let p = this.providers.get(chainId);
    if (!p) {
      const cfg = this.registry.get(chainId);
      if (!cfg) {
        throw new BadRequestException(
          `Chain ${chainId} not configured. Use GANACHE_RPC_URL + P2P_ESCROW_CONTRACT_ADDRESS for 5777, or P2P_CHAINS for others.`,
        );
      }
      p = new ethers.JsonRpcProvider(cfg.rpcUrl);
      this.providers.set(chainId, p);
    }
    return p;
  }

  getEscrowAddress(chainId: number): string {
    const cfg = this.registry.get(chainId);
    if (!cfg) {
      throw new BadRequestException(`Chain ${chainId} not configured.`);
    }
    return cfg.escrowAddress;
  }

  isChainConfigured(chainId: number): boolean {
    return this.registry.has(chainId);
  }

  /** Lista de chainIds configurados (para validar ofertas). */
  getConfiguredChainIds(): number[] {
    return Array.from(this.registry.keys());
  }

  /** Cuentas en la red por defecto (Ganache); usado por dev-login. */
  async listAccounts(): Promise<string[]> {
    const provider = this.getProvider(DEFAULT_CHAIN_ID);
    const accounts = await provider.listAccounts();
    return accounts.map((a: unknown) => (typeof a === "string" ? a : (a as { address?: string })?.address)).filter(Boolean);
  }

  async getSignerByIndex(chainId: number, index: number): Promise<ethers.JsonRpcSigner> {
    const provider = this.getProvider(chainId);
    return provider.getSigner(index);
  }

  async getAddressByIndex(chainId: number, index: number): Promise<string> {
    const signer = await this.getSignerByIndex(chainId, index);
    return signer.getAddress();
  }
}
