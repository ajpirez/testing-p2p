import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EscrowService } from "../escrow/escrow.service";

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EscrowService)
    private readonly escrow: EscrowService,
  ) {}

  async getMy(userId: string) {
    return this.prisma.order.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { updatedAt: "desc" },
      include: {
        offer: { select: { id: true, side: true, asset: true, fiat: true, chainId: true } },
      },
    });
  }

  async get(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        offer: true,
        buyer: { select: { id: true, email: true, walletAddress: true, walletIndex: true } },
        seller: { select: { id: true, email: true, walletAddress: true, walletIndex: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async lockFunds(orderId: string, userId: string) {
    const order = await this.get(orderId);
    if (order.sellerId !== userId) throw new BadRequestException("Only seller can lock funds");
    if (order.status !== "CREATED") throw new BadRequestException("Order not in CREATED state");

    const sellerIndex = order.seller.walletIndex;
    const buyerAddress = order.buyer.walletAddress;
    if (sellerIndex === null || sellerIndex === undefined) {
      throw new BadRequestException("Seller has no walletIndex. Login again with email.");
    }
    if (!buyerAddress) throw new BadRequestException("Buyer has no walletAddress. Login again with email.");

    const chainId = order.chainId ?? (order.offer as { chainId?: number })?.chainId ?? 5777;
    const escrowKey = order.escrowOrderId ?? this.escrow.orderIdToEscrowKey(order.id);
    const amountEth = String(order.amount);

    const { txHash } = await this.escrow.fund({
      chainId,
      signerIndex: sellerIndex,
      escrowKey,
      buyerAddress,
      amountEth,
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: "FUNDS_LOCKED",
        escrowOrderId: escrowKey,
        fundTxHash: txHash,
      },
      include: {
        offer: true,
        buyer: { select: { id: true, email: true, walletAddress: true, walletIndex: true } },
        seller: { select: { id: true, email: true, walletAddress: true, walletIndex: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
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
      include: {
        offer: true,
        buyer: { select: { id: true, email: true, walletAddress: true, walletIndex: true } },
        seller: { select: { id: true, email: true, walletAddress: true, walletIndex: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async release(orderId: string, userId: string) {
    const order = await this.get(orderId);
    if (order.sellerId !== userId) throw new BadRequestException("Only seller can release");
    if (order.status !== "PAYMENT_MARKED") throw new BadRequestException("Order not marked paid");

    const sellerIndex = order.seller.walletIndex;
    if (sellerIndex === null || sellerIndex === undefined) {
      throw new BadRequestException("Seller has no walletIndex. Login again with email.");
    }
    const chainId = order.chainId ?? (order.offer as { chainId?: number })?.chainId ?? 5777;
    const escrowKey = order.escrowOrderId ?? this.escrow.orderIdToEscrowKey(order.id);

    const { txHash } = await this.escrow.release({
      chainId,
      signerIndex: sellerIndex,
      escrowKey,
    });

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: "RELEASED", escrowOrderId: escrowKey, releaseTxHash: txHash },
      include: {
        offer: true,
        buyer: { select: { id: true, email: true, walletAddress: true, walletIndex: true } },
        seller: { select: { id: true, email: true, walletAddress: true, walletIndex: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
  }
}

