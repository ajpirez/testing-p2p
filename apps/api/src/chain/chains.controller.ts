import { Controller, Get, Inject } from "@nestjs/common";
import { ChainService } from "./chain.service";

const CHAIN_NAMES: Record<number, string> = {
  5777: "Ganache (local)",
  97: "BSC Testnet",
  56: "BNB Chain",
  80002: "Polygon Amoy",
  137: "Polygon",
};

@Controller("chains")
export class ChainsController {
  constructor(
    @Inject(ChainService)
    private readonly chain: ChainService,
  ) {}

  @Get()
  list() {
    const ids = this.chain.getConfiguredChainIds();
    return ids.map((chainId) => ({
      chainId,
      name: CHAIN_NAMES[chainId] ?? `Chain ${chainId}`,
    }));
  }
}
