import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateOfferInput, TakeOfferInput } from "@p2p/shared";

@Injectable()
export class OffersService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async listActive() {
    return this.prisma.offer.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(makerId: string, input: CreateOfferInput) {
    const maker = await this.prisma.user.findUnique({ where: { id: makerId } });
    if (!maker) throw new BadRequestException("Unknown user. Use dev-login first.");

    if (input.minAmount > input.maxAmount) {
      throw new BadRequestException("minAmount cannot be greater than maxAmount");
    }

    return this.prisma.offer.create({
      data: {
        makerId,
        side: input.side,
        asset: input.asset,
        fiat: input.fiat,
        price: input.price,
        minAmount: input.minAmount,
        maxAmount: input.maxAmount,
        paymentMethods: input.paymentMethods,
      },
    });
  }

  async take(buyerId: string, input: TakeOfferInput) {
    const buyer = await this.prisma.user.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new BadRequestException("Unknown user. Use dev-login first.");

    const offer = await this.prisma.offer.findUnique({ where: { id: input.offerId } });
    if (!offer || !offer.isActive) throw new NotFoundException("Offer not found");

    const amount = input.amount;
    if (amount < Number(offer.minAmount) || amount > Number(offer.maxAmount)) {
      throw new BadRequestException("Amount out of offer bounds");
    }

    // MVP: offer can be taken only once. Use conditional update to prevent race.
    const updated = await this.prisma.offer.updateMany({
      where: { id: offer.id, isActive: true },
      data: { isActive: false },
    });
    if (updated.count !== 1) throw new BadRequestException("Offer already taken");

    const sellerId = offer.makerId;

    return this.prisma.order.create({
      data: {
        offerId: offer.id,
        buyerId,
        sellerId,
        amount: amount,
        status: "CREATED",
      },
    });
  }
}

