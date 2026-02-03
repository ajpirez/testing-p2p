/**
 * Script de prueba del flujo completo P2P (ERC-20 USDT) con dos usuarios.
 *
 * Requisitos:
 * - API corriendo, Ganache con chainId 1337, P2P_CHAINS con escrow/token USDT.
 * - El seller (Alice = cuenta 0 en Ganache) debe tener USDT de prueba:
 *   En packages/contracts: TOKEN_USDT=0x... TOKEN_USDC=0x... pnpm run fund-test-tokens:ganache
 *   (sin TARGET_ADDRESS se envía a la cuenta 0 = Alice).
 *
 * Flujo:
 * 1. Login alice (seller)
 * 2. Login bob (buyer)
 * 3. Alice crea oferta SELL USDT
 * 4. Bob toma la oferta
 * 5. (ERC-20) Alice aprueba token → 6. Alice lock funds → 7. Bob mark paid → 8. Alice release
 */

// @ts-check
const API_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:4000";
/** Ganache por defecto usa 1337. Debe coincidir con DEFAULT_CHAIN_ID del API. */
const CHAIN_ID = parseInt(process.env.P2P_CHAIN_ID ?? "1337", 10);

interface User {
  id: string;
  email: string | null;
  walletAddress?: string | null;
  walletIndex?: number | null;
}

async function apiCall(method: string, path: string, options: { userId?: string; body?: any } = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (options.userId) {
    headers["x-user-id"] = options.userId;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Iniciando flujo de prueba P2P...\n");

  try {
    // 1. Login alice (seller)
    console.log("1️⃣  Login alice (seller)...");
    const aliceRes = await apiCall("POST", "/auth/dev-login", {
      body: { email: "ajpirez1994@example.com" },
    });
    const alice: User = aliceRes.user;
    console.log(`   ✅ Alejandro: ${alice.id}`);
    console.log(`   📍 Wallet: ${alice.walletAddress}`);
    console.log(`   🔢 Index: ${alice.walletIndex}\n`);

    // 2. Login bob (buyer)
    console.log("2️⃣  Alex bob (buyer)...");
    const bobRes = await apiCall("POST", "/auth/dev-login", {
      body: { email: "reybis@example.com" },
    });
    const bob: User = bobRes.user;
    console.log(`   ✅ Reybis: ${bob.id}`);
    console.log(`   📍 Wallet: ${bob.walletAddress}`);
    console.log(`   🔢 Index: ${bob.walletIndex}\n`);

    // 3. Alice crea oferta SELL
    console.log("3️⃣  Alejandro crea oferta SELL...");
    const offer = await apiCall("POST", "/offers", {
      userId: alice.id,
      body: {
        chainId: CHAIN_ID,
        side: "SELL",
        asset: "USDT",
        fiat: "CUP",
        price: 560,
        minAmount: 10,
        maxAmount: 100,
        paymentMethods: ["BANK_TRANSFER"],
      },
    });
    console.log(`   ✅ Offer creada: ${offer.id}`);
    console.log(`   💰 ${offer.side} ${offer.asset}/${offer.fiat} @ ${offer.price}\n`);

    await sleep(500);

    // 4. Bob toma la oferta
    console.log("4️⃣  Bob toma la oferta...");
    const order = await apiCall("POST", "/offers/take", {
      userId: bob.id,
      body: {
        offerId: offer.id,
        amount: 10,
      },
    });
    console.log(`   ✅ Order creada: ${order.id}`);
    console.log(`   📊 Status: ${order.status}`);
    console.log(`   💵 Amount: ${order.amount} ETH\n`);

    await sleep(1000);

    // 5. (ERC-20) Alice aprueba token para el escrow
    if (offer.asset === "USDT" || offer.asset === "USDC") {
      console.log(`5️⃣  Alejandro aprueba ${offer.asset} para el escrow (on-chain)...`);
      const approveRes = await apiCall("POST", `/orders/${order.id}/approve-token`, {
        userId: alice.id,
      });
      console.log(`   ✅ Approve tx: ${approveRes.txHash}\n`);
      await sleep(1500);
    }

    // 6. Alice hace lock funds (on-chain)
    console.log("6️⃣  Alejandro hace lock funds (on-chain)...");
    console.log("   ⏳ Esperando transacción...");
    const lockedOrder = await apiCall("POST", `/orders/${order.id}/lock-funds`, {
      userId: alice.id,
    });
    console.log(`   ✅ Funds locked!`);
    console.log(`   📊 Status: ${lockedOrder.status}`);
    console.log(`   🔑 Escrow key: ${lockedOrder.escrowOrderId}`);
    console.log(`   📝 Fund tx: ${lockedOrder.fundTxHash}\n`);

    await sleep(2000);

    // 7. Bob marca como pagado
    console.log("7️⃣  Reybis marca como pagado...");
    const paidOrder = await apiCall("POST", `/orders/${order.id}/mark-paid`, {
      userId: bob.id,
    });
    console.log(`   ✅ Payment marked!`);
    console.log(`   📊 Status: ${paidOrder.status}\n`);

    await sleep(1000);

    // 8. Alice hace release (on-chain)
    console.log("8️⃣  Alejandro hace release (on-chain)...");
    console.log("   ⏳ Esperando transacción...");
    const releasedOrder = await apiCall("POST", `/orders/${order.id}/release`, {
      userId: alice.id,
    });
    console.log(`   ✅ Funds released!`);
    console.log(`   📊 Status: ${releasedOrder.status}`);
    console.log(`   📝 Release tx: ${releasedOrder.releaseTxHash}\n`);

    console.log("🎉 Flujo completo ejecutado exitosamente!");
    console.log("\n📋 Resumen:");
    console.log(`   - Offer: ${offer.id}`);
    console.log(`   - Order: ${order.id}`);
    console.log(`   - Seller (Alice): ${alice.walletAddress}`);
    console.log(`   - Buyer (Bob): ${bob.walletAddress}`);
    console.log(`   - Fund tx: ${lockedOrder.fundTxHash}`);
    console.log(`   - Release tx: ${releasedOrder.releaseTxHash}`);
  } catch (error) {
    console.error("\n❌ Error en el flujo:", error);
    if (error instanceof Error) {
      console.error(`   Mensaje: ${error.message}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
