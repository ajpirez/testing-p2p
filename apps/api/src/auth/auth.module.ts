import { Module } from "@nestjs/common";
import { DevAuthController } from "./dev-auth.controller";
import { DevAuthService } from "./dev-auth.service";

@Module({
  controllers: [DevAuthController],
  providers: [DevAuthService],
  exports: [DevAuthService],
})
export class AuthModule {}

