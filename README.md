# P2P Exchange (Local Monorepo)

Monorepo con:
- `apps/web`: Next.js 16 (frontend)
- `apps/api`: NestJS (backend)
- `packages/contracts`: Smart contracts EVM (Hardhat) conectando a Ganache (GUI)
- `packages/shared`: tipos/schemas compartidos

## Requisitos (local)
- Node.js (recomendado >= 20)
- pnpm
- Ganache (GUI) corriendo en `http://127.0.0.1:7545`
- Postgres, Redis y MinIO levantados por tu cuenta (este repo solo se conecta por `.env`)

## Arranque rápido (local)
1. Instalar deps:
   - `pnpm install`
2. Configurar envs:
   - copia `apps/api/.env.example` a `apps/api/.env` y apunta a tu Postgres/Redis/MinIO locales
   - copia `apps/web/.env.example` a `apps/web/.env`
   - copia `packages/contracts/.env.example` a `packages/contracts/.env`
3. Prisma client:
   - `pnpm -C apps/api prisma:generate`
4. DB (Postgres): crea la DB y corre migraciones:
   - `pnpm -C apps/api prisma:migrate`
5. API + Web:
   - `pnpm dev`

Nota: este repo incluye `.npmrc` con `ignore-scripts=false` para que Prisma funcione sin `pnpm approve-builds`.

## Ganache + contratos (local)
1. Arranca Ganache GUI en `http://127.0.0.1:7545`
2. En Ganache, copia el **mnemonic** o una **private key** y ponlo en `packages/contracts/.env` (`GANACHE_MNEMONIC` o `DEPLOYER_PRIVATE_KEY`).
2. Compilar contratos:
   - `pnpm -C packages/contracts build`
3. Tests de contratos:
   - `pnpm contracts:test`
4. Deploy a Ganache:
   - `pnpm contracts:deploy:ganache`
   - copia la address impresa y ponla en `apps/api/.env` como `P2P_ESCROW_CONTRACT_ADDRESS` (opcional por ahora)

## Flujo de prueba manual (MVP)
1. Abre `apps/web` (por defecto `http://localhost:3000`)
2. Pulsa **Dev login** para crear un user local
3. Crea una oferta
4. Refresca y toma la oferta (crea una orden)
5. Abre la orden y prueba:
   - **Mark paid** (solo buyer)
   - **Release** (solo seller)

