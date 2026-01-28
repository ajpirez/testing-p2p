/**
 * Registro de redes soportadas: chainId -> { rpcUrl, escrowAddress }
 * Compatible con .env actual (Ganache) y P2P_CHAINS JSON.
 */
export interface ChainConfig {
  rpcUrl: string;
  escrowAddress: string;
}

export const DEFAULT_CHAIN_ID = 5777;

export function parseChainsFromEnv(env: Record<string, string | undefined>): Map<number, ChainConfig> {
  const map = new Map<number, ChainConfig>();

  const ganacheRpc = env.GANACHE_RPC_URL ?? "http://127.0.0.1:7545";
  const ganacheEscrow = env.P2P_ESCROW_CONTRACT_ADDRESS ?? "";
  map.set(DEFAULT_CHAIN_ID, { rpcUrl: ganacheRpc, escrowAddress: ganacheEscrow });

  const chainsJson = env.P2P_CHAINS;
  if (chainsJson && typeof chainsJson === "string") {
    try {
      const parsed = JSON.parse(chainsJson) as Record<string, { rpc: string; escrow: string }>;
      for (const [key, val] of Object.entries(parsed)) {
        const chainId = parseInt(key, 10);
        if (!Number.isNaN(chainId) && val?.rpc && val?.escrow) {
          map.set(chainId, { rpcUrl: val.rpc, escrowAddress: val.escrow });
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return map;
}
