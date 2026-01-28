/**
 * Script de prueba del flujo completo P2P con dos usuarios
 * 
 * Flujo:
 * 1. Login alice (seller)
 * 2. Login bob (buyer)
 * 3. Alice crea oferta SELL
 * 4. Bob toma la oferta
 * 5. Alice hace lock funds (on-chain)
 * 6. Bob marca como pagado
 * 7. Alice hace release (on-chain)
 */

// @ts-check
const API_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:4000";
/** Ganache GUI suele usar 5777; Ganache CLI 1337. Debe coincidir con DEFAULT_CHAIN_ID del API. */
const CHAIN_ID = parseInt(process.env.P2P_CHAIN_ID ?? "5777", 10);

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
      body: { email: "alice@example.com" },
    });
    const alice: User = aliceRes.user;
    console.log(`   ✅ Alice: ${alice.id}`);
    console.log(`   📍 Wallet: ${alice.walletAddress}`);
    console.log(`   🔢 Index: ${alice.walletIndex}\n`);

    // 2. Login bob (buyer)
    console.log("2️⃣  Login bob (buyer)...");
    const bobRes = await apiCall("POST", "/auth/dev-login", {
      body: { email: "bob@example.com" },
    });
    const bob: User = bobRes.user;
    console.log(`   ✅ Bob: ${bob.id}`);
    console.log(`   📍 Wallet: ${bob.walletAddress}`);
    console.log(`   🔢 Index: ${bob.walletIndex}\n`);

    // 3. Alice crea oferta SELL
    console.log("3️⃣  Alice crea oferta SELL...");
    const offer = await apiCall("POST", "/offers", {
      userId: alice.id,
      body: {
        chainId: CHAIN_ID,
        side: "SELL",
        asset: "USDT",
        fiat: "EUR",
        price: 1.0,
        minAmount: 0.01,
        maxAmount: 1,
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
        amount: 0.01,
      },
    });
    console.log(`   ✅ Order creada: ${order.id}`);
    console.log(`   📊 Status: ${order.status}`);
    console.log(`   💵 Amount: ${order.amount} ETH\n`);

    await sleep(1000);

    // 5. Alice hace lock funds (on-chain)
    console.log("5️⃣  Alice hace lock funds (on-chain)...");
    console.log("   ⏳ Esperando transacción...");
    const lockedOrder = await apiCall("POST", `/orders/${order.id}/lock-funds`, {
      userId: alice.id,
    });
    console.log(`   ✅ Funds locked!`);
    console.log(`   📊 Status: ${lockedOrder.status}`);
    console.log(`   🔑 Escrow key: ${lockedOrder.escrowOrderId}`);
    console.log(`   📝 Fund tx: ${lockedOrder.fundTxHash}\n`);

    await sleep(2000);

    // 6. Bob marca como pagado
    console.log("6️⃣  Bob marca como pagado...");
    const paidOrder = await apiCall("POST", `/orders/${order.id}/mark-paid`, {
      userId: bob.id,
    });
    console.log(`   ✅ Payment marked!`);
    console.log(`   📊 Status: ${paidOrder.status}\n`);

    await sleep(1000);

    // 7. Alice hace release (on-chain)
    console.log("7️⃣  Alice hace release (on-chain)...");
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
