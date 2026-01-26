import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { ChainModule } from "./chain/chain.module";
import { AuthModule } from "./auth/auth.module";
import { OffersModule } from "./offers/offers.module";
import { OrdersModule } from "./orders/orders.module";
import { EscrowCoreModule } from "./escrow/escrow-core.module";
import { EscrowModule } from "./escrow/escrow.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ChainModule,
    AuthModule,
    OffersModule,
    OrdersModule,
    EscrowCoreModule,
    EscrowModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
