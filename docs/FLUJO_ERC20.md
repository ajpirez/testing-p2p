# Flujo ERC-20 (USDT/USDC) de punta a punta

Scripts para tener USDT de prueba y probar el flujo completo con el API.

---

## Requisitos

- Ganache en marcha (chainId 1337, puerto 7545).
- Contratos desplegados: `pnpm contracts:deploy:ganache` y `pnpm contracts:deploy:erc20-all:ganache`.
- `apps/api/.env` con `P2P_CHAINS` que incluya `tokenUsdt`, `escrowUsdt`, `tokenUsdc`, `escrowUsdc`.
- API corriendo (`pnpm dev:api` o `bun run dev:api`).

---

## 1. Dar USDT/USDC de prueba a la cuenta del seller (Alice)

En dev, el seller es la **cuenta 0** de Ganache (la primera que asigna dev-login). Esa cuenta debe tener mock USDT/USDC.

En `packages/contracts/.env` añade (copia de tu `P2P_CHAINS` en api):

```env
TOKEN_USDT=0x...
TOKEN_USDC=0x...
```

Luego, **sin** `TARGET_ADDRESS`, se envía a la cuenta 0 (deployer = misma que usará Alice):

```bash
pnpm -C packages/contracts fund-test-tokens:ganache
```

Para enviar a **otra wallet** (p. ej. tu MetaMask):

```bash
TARGET_ADDRESS=0xTuDirección pnpm -C packages/contracts fund-test-tokens:ganache
```

Se envían 10_000 USDT y 10_000 USDC de prueba.

---

## 2. Ejecutar el flujo completo (approve + lock + mark-paid + release)

El script hace: login Alice, login Bob, oferta SELL USDT, Bob toma la oferta, **Alice aprueba token**, Alice lock funds, Bob mark paid, Alice release.

```bash
cd apps/api
pnpm test:flow
```

O desde la raíz:

```bash
pnpm test:flow
```

Si el seller (Alice) no tiene USDT, el paso **lock funds** fallará. Ejecuta antes el paso 1.

---

## Resumen de comandos (orden)

```bash
# Terminal 1: Ganache
npx ganache-cli --chainId 1337 --networkId 1337 --port 7545

# Terminal 2: API
pnpm dev:api

# Una vez: dar USDT a la cuenta 0 (seller en test-flow)
# En packages/contracts/.env: TOKEN_USDT=0x... TOKEN_USDC=0x...
pnpm -C packages/contracts fund-test-tokens:ganache

# Probar flujo ERC-20
pnpm test:flow
```
