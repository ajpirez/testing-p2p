import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { EscrowController } from "./escrow.controller";

@Module({
  imports: [OrdersModule],
  controllers: [EscrowController],
})
export class EscrowModule {}

