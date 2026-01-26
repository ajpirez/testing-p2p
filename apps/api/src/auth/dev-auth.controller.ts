import { Body, Controller, Inject, Post } from "@nestjs/common";
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
}

