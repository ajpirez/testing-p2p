import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async get(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { offer: true, messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async markPaid(orderId: string, userId: string) {
    const order = await this.get(orderId);
    if (order.buyerId !== userId) throw new BadRequestException("Only buyer can mark paid");
    if (order.status !== "CREATED" && order.status !== "FUNDS_LOCKED") {
      throw new BadRequestException("Invalid state transition");
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: "PAYMENT_MARKED" },
    });
  }

  async release(orderId: string, userId: string) {
    const order = await this.get(orderId);
    if (order.sellerId !== userId) throw new BadRequestException("Only seller can release");
    if (order.status !== "PAYMENT_MARKED") throw new BadRequestException("Order not marked paid");
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: "RELEASED" },
    });
  }
}

