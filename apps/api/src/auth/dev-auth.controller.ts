import { BadRequestException, Body, Controller, Inject, Post } from "@nestjs/common";
import { DevAuthService } from "./dev-auth.service";

@Controller("auth")
export class DevAuthController {
  constructor(
    @Inject(DevAuthService)
    private readonly devAuthService: DevAuthService,
  ) {}

  @Post("dev-login")
  async devLogin(@Body() body: { email?: string }) {
    return this.devAuthService.devLogin(body?.email);
  }

  @Post("dev-login-by-chain")
  async devLoginByChain(@Body() body: { chainId?: number; email?: string }) {
    const chainId = typeof body?.chainId === "number" ? body.chainId : undefined;
    if (chainId == null) {
      throw new BadRequestException("chainId (number) required");
    }
    return this.devAuthService.devLoginByChain(chainId, body?.email);
  }
}

