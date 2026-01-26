import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      log: ["error", "warn"],
    });
    // Lazy connection: Prisma se conectará automáticamente en el primer query
    // Esto evita que el servidor falle si la DB no está disponible al inicio
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
