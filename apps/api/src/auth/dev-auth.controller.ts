import { Body, Controller, Post } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { DevAuthService } from "./dev-auth.service";

const DevLoginSchema = z.object({
  email: z.string().email().optional(),
});

@Controller("auth")
export class DevAuthController {
  constructor(private readonly devAuthService: DevAuthService) {}

  @Post("dev-login")
  async devLogin(@Body(new ZodValidationPipe(DevLoginSchema)) body: { email?: string }) {
    return this.devAuthService.devLogin(body.email);
  }
}

