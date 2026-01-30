import { Controller, Get, Inject } from "@nestjs/common";
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
}
