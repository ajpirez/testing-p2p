import { Global, Module } from "@nestjs/common";
import { ChainService } from "./chain.service";
import { ChainsController } from "./chains.controller";

@Global()
@Module({
  controllers: [ChainsController],
  providers: [ChainService],
  exports: [ChainService],
})
export class ChainModule {}

