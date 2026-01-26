import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DevAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async devLogin(email?: string) {
    const user = await this.prisma.user.create({
      data: {
        email: email ?? null,
      },
      select: { id: true, email: true, createdAt: true },
    });

    return { user };
  }
}

