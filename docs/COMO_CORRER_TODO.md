# Cómo correr todo (P2P Exchange)

Guía para levantar el monorepo completo en local: contratos, API, web y (opcional) subgraph.

---

## 1. Requisitos previos

- **Node.js** 20+ (recomendado 22 LTS)
- **pnpm**: `npm i -g pnpm`
- **PostgreSQL** en ejecución (ej. `postgresql://postgres:postgres@127.0.0.1:5432/p2p`)
- **Ganache** (GUI o CLI) en `http://127.0.0.1:7545`
- Opcional: Redis, MinIO (para el MVP mínimo basta Postgres + Ganache)

### Usar siempre chain id 1337 (recomendado)

Este proyecto usa **1337** por defecto. Si al desplegar ves *"connected to a chain with id 1337"*, configura Ganache así:

- **Ganache GUI**: menú (☰) → **Settings** (o **Configuración**) → busca **Chain ID** o **Network ID** → pon **1337** → **Save and Restart** (Guardar y reiniciar). Reinicia el workspace para que aplique.
- **Ganache CLI**: arranca con `npx ganache-cli --chainId 1337 --port 7545` (el puerto 7545 para coincidir con la doc; si no, por defecto usa 8545).

Después de reiniciar Ganache con 1337, el deploy y la API funcionarán sin poner `GANACHE_CHAIN_ID` en ningún `.env`.

---

## 2. Instalar dependencias

En la **raíz del monorepo**:

```bash
pnpm install
```

---

## 3. Configurar variables de entorno

### API (`apps/api/.env`)

Copia el ejemplo y ajusta:

```bash
cp apps/api/.env.example apps/api/.env
```

Mínimo necesario:

- `DATABASE_URL`: conexión a tu Postgres (ej. `postgresql://postgres:postgres@127.0.0.1:5432/p2p?schema=public`)
- `GANACHE_RPC_URL=http://127.0.0.1:7545`
- `P2P_ESCROW_CONTRACT_ADDRESS`: lo rellenarás después del deploy (paso 5)

Si usas Redis/MinIO, configura también `REDIS_URL`, `MINIO_*`, etc.

### Web (`apps/web`)

Si existe `apps/web/.env.example`, copia a `apps/web/.env`. Opcional: `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000` si la API no está en ese puerto.

### Contratos (`packages/contracts/.env`)

```bash
cp packages/contracts/.env.example packages/contracts/.env
```

Añade el mnemonic o la clave privada de Ganache para el deploy (ej. `GANACHE_MNEMONIC` o `DEPLOYER_PRIVATE_KEY`).

---

## 4. Base de datos (Postgres)

Crea la base de datos si no existe (ej. `p2p`). Luego, desde la raíz:

```bash
pnpm -C apps/api prisma:generate
pnpm -C apps/api prisma:migrate
```

Si prefieres solo sincronizar el schema sin migraciones:

```bash
cd apps/api
pnpm prisma db push
```

---

## 5. Ganache y contratos

1. **Arranca Ganache** en `http://127.0.0.1:7545` (chainId 1337 si usas Ganache GUI).

2. **Compilar contratos**:
   ```bash
   pnpm -C packages/contracts build
   ```
   (o `pnpm -C packages/contracts run build`)

3. **Desplegar escrow nativo (ETH)** en Ganache:
   ```bash
   pnpm contracts:deploy:ganache
   ```
   Copia la dirección que imprima y ponla en `apps/api/.env` como:
   ```env
   P2P_ESCROW_CONTRACT_ADDRESS=0x...
   ```

4. **(Opcional) Todo ERC-20 en Ganache (mock USDT + USDC + escrows)**  
   Para desplegar de una vez los mocks y los escrows ERC-20 en Ganache:
   ```bash
   pnpm -C packages/contracts deploy:erc20-all:ganache
   ```
   El script despliega: Mock USDT, Mock USDC (6 decimales, con mint al deployer), P2PEscrowERC20 para USDT y para USDC. Al final imprime la línea `P2P_CHAINS=...` para copiar en `apps/api/.env`.  
   **Importante:** antes debes tener desplegado el escrow nativo (`pnpm contracts:deploy:ganache`) y usar su dirección en el campo `escrow` del JSON de `P2P_CHAINS` (el script te recuerda este paso).

   Si en una red ya tienes direcciones reales de USDT/USDC, despliega solo los escrows:
   ```bash
   cd packages/contracts
   TOKEN_ADDRESS=0x... pnpm deploy:erc20:ganache
   ```
   y configura `P2P_CHAINS` con `escrowUsdt`, `tokenUsdt`, `escrowUsdc`, `tokenUsdc` (ver `apps/api/.env.example`).

---

## 6. Levantar API y Web

Desde la **raíz**:

```bash
pnpm dev
```

Esto arranca en paralelo:

- **API**: `http://127.0.0.1:4000`
- **Web**: `http://localhost:3000` (o el puerto que use Next.js)

Para comprobar la API:

```bash
curl http://127.0.0.1:4000/health
```

---

## 7. Probar el flujo

1. Abre **http://localhost:3000**
2. Pulsa **Dev login** para crear un usuario local
3. Crea una **oferta** (asset USDT/USDC, fiat EUR/USD/CUP)
4. Refresca y **toma la oferta** (se crea una orden)
5. En la orden:
   - Si es USDT/USDC: primero **Aprobar USDT/USDC** (wallet) y luego **Bloquear fondos**
   - Si es escrow nativo: **Bloquear fondos** directamente
   - **Confirmar pago** (buyer) → **Liberar fondos** (seller)

---

## Comandos útiles (desde la raíz)

| Comando | Descripción |
|--------|-------------|
| `pnpm dev` | API + Web en modo desarrollo |
| `pnpm dev:api` | Solo API |
| `pnpm dev:web` | Solo Web |
| `pnpm contracts:test` | Tests de contratos |
| `pnpm contracts:deploy:ganache` | Deploy P2PEscrow en Ganache |
| `pnpm -C apps/api prisma:generate` | Regenerar cliente Prisma |
| `pnpm -C apps/api prisma:migrate` | Ejecutar migraciones |
| `pnpm build` | Build de todo el monorepo |
| `pnpm typecheck` | Typecheck de todos los paquetes |

---

## Subgraph (opcional)

Si quieres indexar eventos del escrow con The Graph, ver **docs/THE_GRAPH.md**. No es necesario para que el P2P funcione.
