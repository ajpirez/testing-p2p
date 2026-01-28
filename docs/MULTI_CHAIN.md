# Cómo agregar más redes (BNB, Polygon, etc.)

Hoy el proyecto usa **una sola red**: la configurada en `GANACHE_RPC_URL` y un único contrato en `P2P_ESCROW_CONTRACT_ADDRESS`. Para soportar varias redes (Ethereum, BNB Chain/BSC, Polygon, etc.) hay que tocar **contratos**, **API** y **base de datos**.

---

## 1. Idea general

- **Una red** = una RPC + un contrato de escrow desplegado en esa red.
- Cada **oferta** y cada **orden** deben saber **en qué red** viven (`chainId`).
- El contrato Solidity es el mismo en todas (EVM compatible); lo que cambia es **dónde** está desplegado y **qué RPC** usa la API.

---

## 2. Añadir redes en Hardhat (desplegar el mismo contrato en cada una)

En `packages/contracts/hardhat.config.ts` definís una red por cada blockchain:

```ts
// hardhat.config.ts
const config: HardhatUserConfig = {
  solidity: { /* ... */ },
  networks: {
    ganache: {
      url: process.env.GANACHE_RPC_URL ?? "http://127.0.0.1:7545",
      chainId: 5777, // Ganache suele usar 5777
      accounts: /* ... */,
    },
    bscTestnet: {
      url: process.env.BSC_RPC_URL ?? "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    bsc: {
      url: process.env.BSC_MAINNET_RPC ?? "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC ?? "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    polygon: {
      url: process.env.POLYGON_RPC ?? "https://polygon-rpc.com",
      chainId: 137,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};
```

Luego desplegás el **mismo** contrato en cada red:

```bash
cd packages/contracts
pnpm hardhat run scripts/deploy.ts --network ganache
pnpm hardhat run scripts/deploy.ts --network bscTestnet
pnpm hardhat run scripts/deploy.ts --network polygonAmoy
```

Anotá la dirección que imprime cada despliegue; la vas a usar en la API por red.

---

## 3. Base de datos: guardar la red en ofertas y órdenes

Cada oferta y cada orden tienen que tener **red** (por ejemplo `chainId`).

### 3.1 Prisma

En `apps/api/prisma/schema.prisma`:

- En **Offer** añadí un campo que identifique la red, por ejemplo `chainId Int` (o `network String` si preferís nombre: `"ganache"`, `"bsc"`, `"polygon"`).
- En **Order** lo mismo: como la orden nace de una oferta, puede ser `chainId Int` y derivarse del `Offer`, o dejarlo explícito en la orden también.

Ejemplo mínimo:

```prisma
model Offer {
  id             String   @id @default(uuid())
  makerId        String
  maker          User     @relation(...)
  chainId        Int      // 5777=Ganache, 56=BSC, 137=Polygon, etc.
  side           OfferSide
  asset          AssetCode
  // ... resto igual
}

model Order {
  id        String   @id @default(uuid())
  offerId   String
  offer     Offer    @relation(...)
  chainId   Int      // mismo que la oferta; lo usamos para elegir RPC y contrato
  buyerId   String
  // ... resto igual
}
```

Después:

```bash
cd apps/api && pnpm prisma db push
# o migrations si ya las usás
```

---

## 4. API: configuración por red

La API tiene que saber, para cada `chainId`, la **RPC** y la **dirección del contrato**.

### 4.1 Variables de entorno

Una forma simple es una variable por red (en `.env` / `.env.example`):

```env
# Red por defecto (local)
GANACHE_RPC_URL=http://127.0.0.1:7545
P2P_ESCROW_CONTRACT_ADDRESS=0x...   # contrato en Ganache

# BSC
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
BSC_ESCROW_CONTRACT_ADDRESS=0x...

# Polygon Amoy (testnet)
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
POLYGON_AMOY_ESCROW_CONTRACT_ADDRESS=0x...
```

Otra opción es un único JSON con todas las redes:

```env
P2P_CHAINS='{"5777":{"rpc":"http://127.0.0.1:7545","escrow":"0x..."},"97":{"rpc":"https://...","escrow":"0x..."},"137":{"rpc":"https://...","escrow":"0x..."}}'
```

En el código podés leer eso y construir un mapa `chainId → { rpc, escrowAddress }`.

---

## 5. API: ChainService multi‑red

`ChainService` hoy tiene **un** `JsonRpcProvider`. Para varias redes necesitás **uno por chainId**.

Ejemplo de uso objetivo:

```ts
// Uso deseado
chain.getProvider(5777)   // Ganache
chain.getProvider(56)     // BSC
chain.getSignerByIndex(5777, 0)
chain.getSignerByIndex(56, 0)  // aquí “índice” solo tiene sentido si tenés cuentas inyectadas en esa RPC (ej. Ganache). En BSC/Polygon normalmente usaríais wallets externas
```

Implementación posible:

- En el constructor leés la config (env o `P2P_CHAINS`) y creás un mapa:
  - `private readonly providers = new Map<number, ethers.JsonRpcProvider>()`
- `getProvider(chainId: number): ethers.JsonRpcProvider`  
  - devuelve `this.providers.get(chainId)` o lanza si esa red no está configurada.
- `getSignerByIndex(chainId: number, index: number)`  
  - usa `getProvider(chainId)` y hace `provider.getSigner(index)` (válido sobre todo para Ganache con cuentas desbloqueadas).

Así, todo lo que hoy usa `this.chain.getProvider()` o `getSignerByIndex` tendría que recibir además el `chainId` (por ejemplo del `order.chainId` o `offer.chainId`).

---

## 6. API: EscrowService por red

Hoy `EscrowService` usa **una** dirección de contrato y **un** `ChainService` con una sola RPC.

Para multi‑red:

1. **Config**: un mapa `chainId → contractAddress` (o leés las variables `BSC_ESCROW_CONTRACT_ADDRESS`, etc.).
2. **Métodos que escriben** (`fund`, `release`, `refund`): reciben `chainId` (por ejemplo desde la orden) y:
   - piden a `ChainService` el provider/signer de ese `chainId`,
   - instancian el contrato con la dirección que corresponde a ese `chainId`.

Ejemplo de firma:

```ts
async fund(params: {
  chainId: number;
  signerIndex: number;
  escrowKey: string;
  buyerAddress: string;
  amountEth: string;
}) {
  const provider = this.chain.getProvider(params.chainId);
  const signer = await this.chain.getSignerByIndex(params.chainId, params.signerIndex);
  const address = this.getContractAddress(params.chainId);
  const contract = new ethers.Contract(address, this.abi, signer);
  const value = ethers.parseEther(params.amountEth);
  const tx = await contract.fund(params.escrowKey, params.buyerAddress, { value });
  // ...
}
```

`OrdersService.lockFunds` (y `release`) tendría que pasar `order.chainId` (o `order.offer.chainId`) a `escrow.fund(...)`.

---

## 7. Ofertas y órdenes: de dónde sale el chainId

- **Al crear la oferta**: el frontend (o el API) debe enviar `chainId` (o `network`). Ej.: selector “Red: Ethereum / BSC / Polygon” → guardás el `chainId` en `Offer`.
- **Al tomar la oferta**: la orden hereda el `chainId` de la oferta y lo guardás en `Order`.
- **Lock / Release**: la API lee `order.chainId` y usa ese chainId en `ChainService` y `EscrowService`.

Mientras tanto, en **shared** (o en el backend) el schema de “crear oferta” y “tomar oferta” debe incluir `chainId` (o `network`) y validarlo según las redes que soportes.

---

## 8. Dev‑login y cuentas por red

Hoy el dev-login usa **una** RPC (Ganache) y asigna `walletIndex` de esa RPC. Con varias redes tenés dos caminos:

- **Solo Ganache con índices**: dejá el dev-login como está y usá “multi‑red” solo para **escrow**. Es decir: en local, todas las órdenes usan chainId 5777 y el contrato en Ganache; el “signer” sigue siendo “cuenta por índice” en esa única RPC. BSC/Polygon los usáis cuando tengáis wallets reales (MetaMask, etc.) y ahí no usás “índice” sino la dirección conectada.
- **Varias RPC con índices**: si en algún entorno tenés varias RPC con cuentas desbloqueadas (por ejemplo una BSC testnet con cuentas inyectadas), en ese caso `getSignerByIndex(chainId, index)` ya tendría sentido y el dev-login podría guardar “por chainId” qué índice usa cada usuario en esa red (eso implica cambios en el modelo User o en una tabla user_wallets por chainId).

Para no complicar el primer paso, lo más práctico es **seguir con dev-login solo en Ganache** y que “multi‑red” en la API signifique:

- Configurar varias redes (RPC + contrato).
- Que ofertas/órdenes tengan `chainId`.
- Que lock/release usen la red de la orden.
- Si la orden es `chainId === 5777`, usás signer por índice; si es 56/137, de momento podés devolver un error tipo “solo disponible en red local” o, más adelante, integrar firma con wallet externa.

---

## 9. Frontend

- Al **crear oferta**: desplegá un selector “Red” (Ethereum, BNB, Polygon, etc.) y enviá el `chainId` en el payload.
- En **listado de ofertas** y en **detalle de orden**: mostrá la red (nombre + icono si querés).
- En la **página de orden**: que quede claro en qué red está el escrow (y qué wallet/conectar con esa red cuando integres MetaMask/WalletConnect).

---

## 10. Resumen de cambios por capa

| Capa | Cambio |
|------|--------|
| **Hardhat** | Añadir redes `bsc`, `polygon`, etc. en `hardhat.config.ts` y desplegar el mismo contrato en cada una. |
| **Prisma** | Añadir `chainId` (o `network`) en `Offer` y `Order`. |
| **Config (API)** | Definir por red: RPC URL y dirección del contrato (env o JSON). |
| **ChainService** | Mantener un `Map<chainId, Provider>` (y por red, signer si aplica). |
| **EscrowService** | Recibir `chainId` en fund/release/refund y usar provider + dirección de esa red. |
| **OffersService** | Aceptar y persistir `chainId` al crear oferta; al crear orden, copiarlo de la oferta. |
| **OrdersService** | Pasar `order.chainId` (o `order.offer.chainId`) a `escrow.fund` / `escrow.release`. |
| **Shared** | Incluir `chainId` en schemas de oferta y, si hace falta, de orden. |
| **Frontend** | Selector de red al crear oferta; mostrar red en ofertas y órdenes. |

Con esto podés tener la misma lógica P2P y el mismo contrato en Ethereum, BNB, Polygon, etc., diferenciando solo por `chainId` y por la configuración RPC + contrato por red.
