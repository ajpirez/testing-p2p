# Flujo P2P: ejecución paso a paso (solo local)

Esta guía asume que **PostgreSQL, Redis, MinIO y Ganache** ya están corriendo en tu máquina y solo usas `.env` para conectarte. No se usa Docker para esos servicios.

---

## 1. Prerrequisitos

- **Node.js** 20+ (o 22 LTS)
- **pnpm** (`npm i -g pnpm`)
- **Ganache** (GUI o CLI) en marcha en `http://127.0.0.1:7545` (o el puerto que uses)
- **PostgreSQL** accesible (ej. `postgresql://postgres:postgres@127.0.0.1:5432/p2p`)
- **Redis** y **MinIO** si los usas; para el MVP mínimo basta Postgres + Ganache

---

## 2. Variables de entorno

En `apps/api/` crea o ajusta `.env`:

```env
# API
PORT=4000

# Base de datos (tu Postgres local)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/p2p?schema=public

# Ganache (RPC donde corre tu blockchain local)
GANACHE_RPC_URL=http://127.0.0.1:7545

# Dirección del contrato P2PEscrow desplegado en Ganache
# La obtienes en el paso 4 tras hacer "deploy"
P2P_ESCROW_CONTRACT_ADDRESS=0x...
```

Si usas **Ganache GUI** con chainId **5777** y otro puerto (ej. 7545), asegúrate de que `GANACHE_RPC_URL` apunte a ese puerto. El proyecto usa por defecto `chainId = 5777` para Ganache GUI.

---

## 3. Instalar dependencias y preparar BD

Desde la raíz del monorepo:

```bash
pnpm install
```

Generar cliente Prisma y aplicar el schema a la BD:

```bash
cd apps/api
pnpm prisma generate
pnpm prisma db push
```

`db push` sincroniza el schema con la base de datos (sin migraciones formales). Si ya tienes tablas, puede haber que resolver conflictos; en un entorno nuevo suele bastar.

---

## 4. Compilar y desplegar el contrato en Ganache

Con Ganache encendido:

```bash
cd packages/contracts
pnpm install
pnpm hardhat compile
```

Desplegar en la red Ganache definida en `hardhat.config.ts`:

```bash
pnpm deploy:ganache
```

(O desde la raíz: `pnpm contracts:deploy:ganache`.)

La salida incluirá algo como:

```
P2PEscrow deployed to: 0x1234567890abcdef...
```

Copia esa dirección y pégala en `apps/api/.env` como:

```env
P2P_ESCROW_CONTRACT_ADDRESS=0x1234567890abcdef...
```

Si tu Ganache usa **chainId 5777** (típico en Ganache GUI), en `packages/contracts/hardhat.config.ts` la red `ganache` debe tener `chainId: 5777` si quieres coincidencia; si no, el API ya está preparado para usar 5777 por defecto en dev.

---

## 5. Arrancar API y frontend

En una terminal, desde la raíz:

```bash
pnpm run dev
```

O por apps:

- **Solo API:**  
  `cd apps/api && pnpm dev`
- **Solo Web:**  
  `cd apps/web && pnpm dev`

Comprueba que la API responda:

```bash
curl http://127.0.0.1:4000/health
```

El front se sirve en `http://localhost:3000` (o el puerto que use Next.js).

---

## 6. Probar el flujo con el script (dos usuarios)

Con la API en marcha y `P2P_ESCROW_CONTRACT_ADDRESS` configurado:

```bash
cd apps/api
pnpm test:flow
```

O desde la raíz del monorepo:

```bash
pnpm test:flow
```

El script hace de forma automática:

1. Login **alice** (vendedora)
2. Login **bob** (comprador)
3. Alice crea oferta **SELL** (chainId por defecto 5777, o `P2P_CHAIN_ID` si lo defines)
4. Bob toma la oferta
5. Alice hace **lock funds** (on-chain)
6. Bob marca **pagado**
7. Alice hace **release** (on-chain)

Si algo falla, revisa:

- Que Ganache esté en la misma RPC que `GANACHE_RPC_URL`
- Que el contrato esté desplegado y la dirección en `.env` sea correcta
- Que en Ganache haya al menos 2 cuentas con balance (Alice índice 0, Bob índice 1 tras los logins)

Variables útiles para el script:

- `API_BASE_URL` → por defecto `http://127.0.0.1:4000`
- `P2P_CHAIN_ID` → por defecto `5777` (Ganache GUI)

Ejemplo con API en otro host:

```bash
API_BASE_URL=http://127.0.0.1:4000 P2P_CHAIN_ID=5777 pnpm test:flow
```

---

## 7. Probar el flujo a mano desde el frontend

1. Abre **http://localhost:3000**
2. **Usuario vendedor:**  
   - Email `alice@example.com` → Iniciar sesión  
   - Crear oferta: Red **Ganache (local)**, SELL, USDT/EUR, límites que quieras  
   - Crear Oferta
3. **Usuario comprador:**  
   - Abre una ventana privada o otro navegador  
   - Email `bob@example.com` → Iniciar sesión  
   - En “Tomar Oferta” elige la oferta de Alice y cantidad  
   - Tomar Oferta  
   - Entra en la orden (enlace “Ver orden” o “Mis órdenes”)
4. **En la orden:**  
   - Con **Alice (seller):** Lock funds → cuando esté “Fondos bloqueados”, esperar a que Bob marque pagado  
   - Con **Bob (buyer):** Marcar como pagado cuando haya “simulado” el pago fiat  
   - Con **Alice (seller):** Release para liberar fondos on-chain

La pantalla de orden cambia según seas comprador o vendedor (quién puede hacer lock, marcar pagado o release).

---

## 8. Añadir más redes (BNB, Polygon, etc.)

- **Configuración:** Ver [MULTI_CHAIN.md](./MULTI_CHAIN.md).
- En resumen:
  - Añades redes en `packages/contracts/hardhat.config.ts`
  - Despliegas el mismo contrato en cada red
  - En `apps/api/.env` usas `P2P_CHAINS` (JSON) o variables por red para RPC y dirección del escrow
- En “Crear oferta” eliges la red; la orden hereda el `chainId` de la oferta y lock/release usan esa red.

---

## Resumen mínimo para un primer flujo local

1. Postgres y Ganache encendidos.
2. `apps/api/.env` con `DATABASE_URL`, `GANACHE_RPC_URL`, `P2P_ESCROW_CONTRACT_ADDRESS`.
3. `pnpm install` → `cd apps/api && pnpm prisma generate && pnpm prisma db push`
4. `cd packages/contracts && pnpm hardhat compile && pnpm hardhat run scripts/deploy.ts --network ganache` → copiar dirección al `.env`
5. `cd apps/api && pnpm dev` (y en otra terminal `cd apps/web && pnpm dev` si quieres el front).
6. `cd apps/api && pnpm test:flow` para el flujo automático de dos usuarios.

Si algo falla en un paso concreto, indica en cuál y el mensaje de error (API, script o consola del navegador) para afinarlo.
