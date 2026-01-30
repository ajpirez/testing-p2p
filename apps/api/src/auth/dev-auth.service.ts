import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ChainService } from "../chain/chain.service";

@Injectable()
export class DevAuthService {
  private readonly logger = new Logger(DevAuthService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ChainService)
    private readonly chain: ChainService,
  ) {
    this.logger.log("DevAuthService initialized");
    if (!this.prisma) {
      this.logger.error("PrismaService is not injected!");
    }
  }

  async devLogin(email?: string) {
    this.logger.log("devLogin called with email:", email);

    const accounts = await this.chain.listAccounts();
    if (accounts.length === 0) {
      throw new BadRequestException("Ganache has no unlocked accounts (check GANACHE_RPC_URL)");
    }

    // Reuse by email when present; otherwise create a fresh user
    let user =
      email && email.trim()
        ? await this.prisma.user.findUnique({ where: { email: email.trim() } })
        : null;

    if (!user) {
      const max = await this.prisma.user.aggregate({ _max: { walletIndex: true } });
      const nextIndex = (max._max.walletIndex ?? -1) + 1;
      if (nextIndex >= accounts.length) {
        throw new BadRequestException(
          `No more Ganache accounts available (need index ${nextIndex}, only ${accounts.length})`,
        );
      }

      user = await this.prisma.user.create({
        data: {
          email: email?.trim() ? email.trim() : null,
          walletIndex: nextIndex,
          walletAddress: accounts[nextIndex],
        },
      });
    } else {
      // Ensure wallet is assigned
      if (user.walletIndex === null || user.walletIndex === undefined) {
        const max = await this.prisma.user.aggregate({ _max: { walletIndex: true } });
        const nextIndex = (max._max.walletIndex ?? -1) + 1;
        if (nextIndex >= accounts.length) {
          throw new BadRequestException(
            `No more Ganache accounts available (need index ${nextIndex}, only ${accounts.length})`,
          );
        }
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { walletIndex: nextIndex, walletAddress: accounts[nextIndex] },
        });
      } else if (!user.walletAddress) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { walletAddress: accounts[user.walletIndex] ?? null },
        });
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        walletIndex: user.walletIndex,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Dev-only: crea/obtiene un usuario cuyo wallet es el signer para (chainId, 0).
   * Sirve para cualquier red configurada con signerPk o con cuentas desbloqueadas.
   * Ese usuario (walletIndex 0) es el que puede hacer lock/release en esa cadena.
   */
  async devLoginByChain(chainId: number, email?: string) {
    const address = await this.chain.getAddressByIndex(chainId, 0);
    let user = await this.prisma.user.findFirst({ where: { walletAddress: address } });
    if (user) {
      if (user.walletIndex !== 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { walletIndex: 0 },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email: email?.trim() ? email.trim() : null,
          walletIndex: 0,
          walletAddress: address,
        },
      });
    }
    return {
      user: {
        id: user.id,
        email: user.email,
        walletIndex: user.walletIndex,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
    };
  }
}

