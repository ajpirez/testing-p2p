"use client";

import { createPublicClient, createWalletClient, custom, type Chain } from "viem";

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

type EthereumProvider = import("viem").EIP1193Provider & {
  providers?: EthereumProvider[];
  isMetaMask?: boolean;
};

/** Obtiene el provider de MetaMask cuando hay varias wallets (Phantom, etc.). */
function getMetaMaskProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ethereum?: EthereumProvider };
  const eth = w.ethereum;
  if (!eth) return null;
  // Varias wallets: EIP-5740 expone .providers; elegir la que sea MetaMask
  if (eth.providers?.length) {
    const metamask = eth.providers.find((p: EthereumProvider) => p.isMetaMask);
    if (metamask) return metamask;
  }
  if (eth.isMetaMask) return eth;
  return null;
}

/**
 * Request MetaMask to approve an ERC-20 token spend.
 * Uses MetaMask specifically so Phantom/other wallets don't open.
 */
export async function approveErc20FromWallet(params: {
  tokenAddress: `0x${string}`;
  spenderAddress: `0x${string}`;
  amount: bigint;
  chainId: number;
}): Promise<`0x${string}`> {
  const ethereum = getMetaMaskProvider();
  if (!ethereum) {
    throw new Error(
      "MetaMask no detectado. Abre MetaMask o desactiva otras wallets (ej. Phantom) para esta página.",
    );
  }

  const client = createWalletClient({
    transport: custom(ethereum as import("viem").EIP1193Provider),
  });

  const [address] = await client.requestAddresses();
  if (!address) {
    throw new Error("Wallet not connected. Please connect your wallet.");
  }

  // Pedir a la wallet que cambie a la red correcta antes de firmar (evita "chain id does not match")
  const chainIdHex = `0x${params.chainId.toString(16)}`;
  try {
    await (ethereum as import("viem").EIP1193Provider).request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchErr: unknown) {
    const msg = switchErr instanceof Error ? switchErr.message : String(switchErr);
    if (msg.includes("4902") || msg.includes("Unrecognized chain")) {
      throw new Error(
        `Añade la red ${params.chainId} (Ganache) en MetaMask: RPC http://127.0.0.1:7545, Chain ID ${params.chainId}.`,
      );
    }
    throw switchErr;
  }

  const chain: Chain = {
    id: params.chainId,
    name: `Chain ${params.chainId}`,
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [] } },
  };

  const hash = await client.writeContract({
    address: params.tokenAddress,
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [params.spenderAddress, params.amount],
    account: address,
    chain,
  });

  // Esperar a que la tx se mine para que el allowance esté actualizado al volver
  const publicClient = createPublicClient({
    chain,
    transport: custom(ethereum as import("viem").EIP1193Provider),
  });
  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}
