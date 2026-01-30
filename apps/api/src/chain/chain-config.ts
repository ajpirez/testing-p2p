/**
 * Registro de redes: chainId -> { rpcUrl, escrowAddress, signerPk?, name? }
 * signerPk: si existe, el signer se obtiene por estrategia de clave privada; si no, por índice en el provider.
 * name: etiqueta opcional para UI (viene de config; el código no conoce "BSC" ni redes concretas).
 */
export interface ChainConfig {
  rpcUrl: string;
  escrowAddress: string;
  /** Opcional: clave privada hex (0x...) para usar Wallet en lugar de provider.getSigner(index) */
  signerPk?: string;
  /** Opcional: nombre para mostrar (ej. en listado de redes); viene de P2P_CHAINS, no hardcodeado */
  name?: string;
}

export const DEFAULT_CHAIN_ID = 5777;

type ChainEntry = { rpc: string; escrow: string; signerPk?: string; name?: string };

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
          map.set(chainId, {
            rpcUrl: val.rpc,
            escrowAddress: val.escrow,
            signerPk: val.signerPk && val.signerPk.startsWith("0x") ? val.signerPk : undefined,
            name: typeof val.name === "string" && val.name.trim() ? val.name.trim() : undefined,
          });
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return map;
}
