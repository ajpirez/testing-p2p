import { Controller, Get, Inject, Param, ParseIntPipe } from "@nestjs/common";
import { ChainService } from "./chain.service";

@Controller("chains")
export class ChainsController {
  constructor(
    @Inject(ChainService)
    private readonly chain: ChainService,
  ) {}

  @Get()
  list() {
    return this.chain.getChainInfos();
  }

  @Get(":chainId/escrow-config")
  getEscrowConfig(@Param("chainId", ParseIntPipe) chainId: number) {
    return this.chain.getEscrowConfig(chainId);
  }
}
