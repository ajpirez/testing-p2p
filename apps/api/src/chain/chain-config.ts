/**
 * Registro de redes: chainId -> { rpcUrl, escrowAddress, signerPk?, name?, escrow USDT/USDC? }
 * signerPk: si existe, el signer se obtiene por estrategia de clave privada; si no, por índice en el provider.
 * name: etiqueta opcional para UI (viene de config; el código no conoce "BSC" ni redes concretas).
 * escrowUsdt/tokenUsdt, escrowUsdc/tokenUsdc: escrow ERC-20 y dirección del token para USDT/USDC.
 */
export interface ChainConfig {
  rpcUrl: string;
  escrowAddress: string;
  /** Opcional: clave privada hex (0x...) para usar Wallet en lugar de provider.getSigner(index) */
  signerPk?: string;
  /** Opcional: nombre para mostrar (ej. en listado de redes); viene de P2P_CHAINS, no hardcodeado */
  name?: string;
  /** Escrow ERC-20 y token para USDT (P2PEscrowERC20 + dirección USDT) */
  escrowUsdtAddress?: string;
  tokenUsdtAddress?: string;
  /** Escrow ERC-20 y token para USDC */
  escrowUsdcAddress?: string;
  tokenUsdcAddress?: string;
}

export const DEFAULT_CHAIN_ID = 1337;

type ChainEntry = {
  rpc: string;
  escrow: string;
  signerPk?: string;
  name?: string;
  escrowUsdt?: string;
  tokenUsdt?: string;
  escrowUsdc?: string;
  tokenUsdc?: string;
};

export function parseChainsFromEnv(env: Record<string, string | undefined>): Map<number, ChainConfig> {
  const map = new Map<number, ChainConfig>();

  const ganacheRpc = env.GANACHE_RPC_URL ?? "http://127.0.0.1:7545";
  const ganacheEscrow = env.P2P_ESCROW_CONTRACT_ADDRESS ?? "";
  const defaultName = env.P2P_DEFAULT_CHAIN_NAME?.trim() || undefined;
  map.set(DEFAULT_CHAIN_ID, {
    rpcUrl: ganacheRpc,
    escrowAddress: ganacheEscrow,
    name: defaultName,
  });

  const chainsJson = env.P2P_CHAINS;
  if (chainsJson && typeof chainsJson === "string") {
    try {
      const parsed = JSON.parse(chainsJson) as Record<string, ChainEntry>;
      for (const [key, val] of Object.entries(parsed)) {
        const chainId = parseInt(key, 10);
        if (!Number.isNaN(chainId) && val?.rpc && val?.escrow) {
          const asAddr = (s: string | undefined) =>
            s && typeof s === "string" && s.startsWith("0x") ? s : undefined;
          map.set(chainId, {
            rpcUrl: val.rpc,
            escrowAddress: val.escrow,
            signerPk: val.signerPk && val.signerPk.startsWith("0x") ? val.signerPk : undefined,
            name: typeof val.name === "string" && val.name.trim() ? val.name.trim() : undefined,
            escrowUsdtAddress: asAddr(val.escrowUsdt),
            tokenUsdtAddress: asAddr(val.tokenUsdt),
            escrowUsdcAddress: asAddr(val.escrowUsdc),
            tokenUsdcAddress: asAddr(val.tokenUsdc),
          });
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  // Si una red tiene la misma RPC que otra que sí tiene ERC-20, copiar escrow/token USDT/USDC
  // (así órdenes con chainId 5777 funcionan cuando la config está solo en 1337 para la misma Ganache)
  const rpcToErc20 = new Map<string, Pick<ChainConfig, "escrowUsdtAddress" | "tokenUsdtAddress" | "escrowUsdcAddress" | "tokenUsdcAddress">>();
  for (const cfg of map.values()) {
    if (cfg.escrowUsdtAddress && cfg.tokenUsdtAddress) {
      const rpc = cfg.rpcUrl.toLowerCase().trim();
      if (!rpcToErc20.has(rpc)) {
        rpcToErc20.set(rpc, {
          escrowUsdtAddress: cfg.escrowUsdtAddress,
          tokenUsdtAddress: cfg.tokenUsdtAddress,
          escrowUsdcAddress: cfg.escrowUsdcAddress,
          tokenUsdcAddress: cfg.tokenUsdcAddress,
        });
      }
    }
  }
  for (const [chainId, cfg] of map.entries()) {
    if (cfg.escrowUsdtAddress) continue;
    const rpc = cfg.rpcUrl.toLowerCase().trim();
    const erc20 = rpcToErc20.get(rpc);
    if (erc20) {
      map.set(chainId, { ...cfg, ...erc20 });
    }
  }

  return map;
}
