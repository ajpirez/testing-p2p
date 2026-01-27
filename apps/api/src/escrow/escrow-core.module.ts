import { Global, Module } from "@nestjs/common";
import { EscrowService } from "./escrow.service";
import { EscrowEventsService } from "./escrow-events.service";

@Global()
@Module({
  providers: [EscrowService, EscrowEventsService],
  exports: [EscrowService],
})
export class EscrowCoreModule {}

