import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DevAuthService {
  private readonly logger = new Logger(DevAuthService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {
    this.logger.log("DevAuthService initialized");
    if (!this.prisma) {
      this.logger.error("PrismaService is not injected!");
    }
  }

  async devLogin(email?: string) {
    this.logger.log("devLogin called with email:", email);
    
    if (!this.prisma) {
      throw new Error("PrismaService is not available");
    }
    
    const user = await this.prisma.user.create({
      data: {
        email: email ?? null,
      },
      select: { id: true, email: true, createdAt: true },
    });

    return { user };
  }
}

