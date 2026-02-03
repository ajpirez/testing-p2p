# Subgraph P2P Escrow

Indexa eventos de los contratos **P2PEscrow** (nativo) y **P2PEscrowERC20** (USDT/USDC).

## Deploy a The Graph Studio

El error **"You must provide a deploy key"** aparece porque el CLI no está autenticado.

### 1. Obtener el deploy key

1. Entrá a [Subgraph Studio](https://thegraph.com/studio/).
2. Conectá tu wallet (MetaMask, WalletConnect, etc.).
3. Creá un subgraph o abrí uno existente (ej. `p2p-escrow` o `p2p-escrow-erc20`).
4. En la página del subgraph, copiá el **Deploy key** que se muestra.

### 2. Autenticarse una vez en el CLI

En la raíz del monorepo o en `packages/subgraph`:

```bash
graph auth --studio <TU_DEPLOY_KEY>
```

Reemplazá `<TU_DEPLOY_KEY>` por el valor que copiaste. El CLI guarda la clave en tu máquina.

### 3. Desplegar

- **Un solo subgraph (nativo + ERC20):**
  ```bash
  pnpm run build
  graph deploy --studio p2p-escrow
  ```
  (El nombre `p2p-escrow` debe coincidir con el **slug** del subgraph en Studio.)

- **Solo local (sin Studio):**
  ```bash
  pnpm run deploy:local
  ```

### Scripts en `package.json`

| Script | Qué hace |
|--------|----------|
| `codegen` | Genera tipos desde `subgraph.yaml` y el schema. |
| `build` | Compila el subgraph (requerido antes de deploy). |
| `deploy` | Deploy a Studio (sin slug; te pide el subgraph). |
| `deploy:erc20` | Deploy a Studio con slug `p2p-escrow-erc20`. |
| `create:local` | Crea el subgraph en un graph-node local. |
| `deploy:local` | Deploy a graph-node + IPFS local. |
| `deploy:local:erc20` | Deploy local con slug `p2p-escrow-erc20`. |

Para **cualquier** deploy a Studio (`deploy` o `deploy:erc20`) tenés que haber ejecutado antes `graph auth --studio <DEPLOY_KEY>`.
