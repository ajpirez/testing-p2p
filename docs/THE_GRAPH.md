# Indexar P2PEscrow con The Graph

Este proyecto incluye un **subgraph** de [The Graph](https://thegraph.com/) para indexar los eventos del contrato **P2PEscrow** (Funded, Released, Refunded) y consultarlos por GraphQL.

---

## Qué hace `mapping.ts`

El archivo **`packages/subgraph/src/mapping.ts`** define **handlers** que The Graph ejecuta cada vez que el contrato P2PEscrow emite un evento. Así se va construyendo una base de datos consultable por GraphQL (entidad `Escrow`).

| Función | Evento del contrato | Qué hace |
|--------|----------------------|----------|
| **handleFunded** | `Funded(orderId, seller, buyer, amount)` | Crea o actualiza una entidad `Escrow` con ese `orderId`: guarda seller, buyer, amount, status = FUNDED, bloque y timestamp del fund. |
| **handleReleased** | `Released(orderId)` | Busca el `Escrow` por `orderId`, pone status = RELEASED y guarda bloque/timestamp del cierre. |
| **handleRefunded** | `Refunded(orderId)` | Igual que Released pero con status = REFUNDED. |

Flujo típico en blockchain:

1. Alguien llama `fund(orderId, buyer)` → se emite **Funded** → el indexador ejecuta **handleFunded** y persiste un `Escrow` con status FUNDED.
2. Luego llaman `release(orderId)` o `refund(orderId)` → se emite **Released** o **Refunded** → el indexador ejecuta **handleReleased** o **handleRefunded** y actualiza ese `Escrow` a RELEASED o REFUNDED con bloque/timestamp de cierre.

No tenés que llamar estas funciones a mano: The Graph (graph-node o Studio) escucha la red, detecta los eventos y ejecuta los handlers automáticamente.

---

## Cómo probar el subgraph

### Opción 1 – Subgraph Studio (la más simple)

1. **Desplegá el contrato** en una red soportada (ej. BSC Testnet, Polygon Amoy) y anotá la dirección y el bloque de despliegue.
2. En **`packages/subgraph/subgraph.yaml`** poné esa `address`, ese `startBlock` y el `network` correcto.
3. **Generá y compilá**:
   ```bash
   cd packages/subgraph
   pnpm codegen
   pnpm build
   ```
4. En [Subgraph Studio](https://thegraph.com/studio/) creá un subgraph, copiá el deploy key y el slug.
5. **Autenticación** (una vez): `npx graph auth --studio <DEPLOY_KEY>`
6. **Desplegar**: `npx graph deploy --studio <tu-usuario>/<tu-subgraph-slug>`
7. En Studio, en la pestaña **Playground**, ejecutá una query GraphQL (ver ejemplos abajo). El subgraph indexa en segundo plano; cuando haya bloques con eventos Funded/Released/Refunded, los verás en la query.

### Opción 2 – graph-node local + Ganache

1. Arrancá **Ganache** (bloques con transacciones).
2. Desplegá **P2PEscrow** en Ganache y anotá la dirección y el bloque.
3. Actualizá `subgraph.yaml`: `network: ganache`, `address` y `startBlock`.
4. En `packages/subgraph`: `pnpm codegen` y `pnpm build`.
5. Arrancá un **graph-node** apuntando a Ganache (por ejemplo con Docker: [graph-node](https://github.com/graphprotocol/graph-node#running-a-graph-node)).
6. Desplegá el subgraph contra ese graph-node: `pnpm run deploy:local` (ajustá la URL en `package.json` si hace falta).
7. Hacé transacciones en Ganache: `fund`, luego `release` o `refund`. Esperá unos segundos y consultá el endpoint GraphQL del graph-node con las queries de abajo.

### Queries para probar

Listar escrows con status FUNDED:

```graphql
query {
  escrows(where: { status: "FUNDED" }) {
    id
    seller
    buyer
    amount
    status
    fundedAtBlock
    fundedAtTimestamp
  }
}
```

Obtener un escrow por `orderId` (el `id` en GraphQL es el orderId en hex, ej. `0x123...`):

```graphql
query {
  escrow(id: "0xTU_ORDER_ID_EN_HEX") {
    id
    seller
    buyer
    amount
    status
    fundedAtTimestamp
    closedAtTimestamp
  }
}
```

Si no ves datos: asegurate de que el contrato esté desplegado, que hayas llamado `fund` (y opcionalmente `release` o `refund`) **después** del `startBlock`, y de darle unos segundos al indexador para procesar los bloques.

---

## Qué indexa el subgraph

- **Escrow**: por cada `orderId` (bytes32) guarda seller, buyer, amount, status (FUNDED | RELEASED | REFUNDED), bloques y timestamps de fund y de cierre (release/refund).

Consulta de ejemplo (una vez desplegado):

```graphql
query {
  escrows(where: { status: "FUNDED" }) {
    id
    seller
    buyer
    amount
    status
    fundedAtBlock
    fundedAtTimestamp
  }
}
```

Por orderId:

```graphql
query {
  escrow(id: "0x...") {
    id
    seller
    buyer
    amount
    status
    fundedAtTimestamp
    closedAtTimestamp
  }
}
```

## Estructura del paquete

```
packages/subgraph/
  abis/
    P2PEscrow.json    # ABI (solo eventos)
  schema.graphql      # Entidades (Escrow, EscrowStatus)
  subgraph.yaml       # Manifest: contrato, red, eventHandlers
  src/
    mapping.ts        # handleFunded, handleReleased, handleRefunded
```

## Cómo agregar The Graph (pasos)

### 1. Instalar dependencias

En la raíz del monorepo:

```bash
pnpm install
```

En `packages/subgraph` se instalan `@graphprotocol/graph-cli` y `@graphprotocol/graph-ts`.

### 2. Configurar dirección y bloque inicial

Antes de generar y compilar, **reemplazá** en `packages/subgraph/subgraph.yaml`:

- **address**: dirección del contrato P2PEscrow desplegado en la red que vayas a indexar.
- **startBlock**: número de bloque en el que se desplegó el contrato (recomendado para no escanear desde 0).
- **network**: `ganache`, `bsc`, `polygon`, `mainnet`, etc. según [redes soportadas](https://thegraph.com/docs/en/supported-networks/).

Ejemplo para Ganache (red local):

```yaml
source:
  address: "0xTuDireccionEscrowEnGanache"
  abi: P2PEscrow
  startBlock: 2
```

Para BSC Testnet (Subgraph Studio):

```yaml
network: bsc
source:
  address: "0x..."
  abi: P2PEscrow
  startBlock: 45000000
```

### 3. Generar tipos y compilar

Desde `packages/subgraph`:

```bash
cd packages/subgraph
pnpm codegen
pnpm build
```

- `codegen`: genera los tipos en `generated/` a partir del ABI y del schema.
- `build`: compila el mapping a WASM.

Si cambiás el schema o los eventHandlers, volvé a ejecutar ambos.

### 4. Desplegar

**Opción A – Subgraph Studio (recomendado para BSC, Polygon, etc.)**

1. Entrá en [Subgraph Studio](https://thegraph.com/studio/), conectá billetera y creá un subgraph.
2. Copiá el **Deploy key** y el **slug** del subgraph.
3. Autenticación (una vez):

   ```bash
   npx graph auth --studio <DEPLOY_KEY>
   ```

4. Desplegar (reemplazá `tu-usuario/tu-subgraph-slug`):

   ```bash
   npx graph deploy --studio tu-usuario/tu-subgraph-slug
   ```

**Opción B – graph-node local (Ganache)**

Si tenés un [graph-node](https://github.com/graphprotocol/graph-node) corriendo en `http://127.0.0.1:8020/`:

```bash
pnpm run deploy:local
```

(Ajustá la URL en `package.json` si tu graph-node usa otro puerto.)

### 5. Consultar

- **Studio**: en la pestaña "Playground" del subgraph podés hacer queries GraphQL.
- **Producción**: después de publicar en The Graph Network, usá la Query URL que aparece en [Graph Explorer](https://thegraph.com/explorer/).

## Multi‑red

Un subgraph indexa **una sola red**. Para varias redes (Ganache, BSC, Polygon):

1. Creá un subgraph por red en Studio (o un graph-node por red).
2. En cada `subgraph.yaml` usá el mismo schema y mappings, pero distinto `network`, `address` y `startBlock`.
3. Desplegá cada uno con un slug distinto (ej. `p2p-escrow-ganache`, `p2p-escrow-bsc`).

No hace falta duplicar código; solo cambiar la config del manifest por red.

## Referencias

- [The Graph – Quick Start](https://thegraph.com/docs/en/subgraphs/quick-start/)
- [Subgraph Manifest](https://thegraph.com/docs/en/subgraphs/developing/creating/subgraph-manifest/)
- [GraphQL Schema](https://thegraph.com/docs/en/subgraphs/developing/creating/ql-schema/)
- [Redes soportadas](https://thegraph.com/docs/en/supported-networks/)
