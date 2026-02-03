import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EscrowService } from "../escrow/escrow.service";

/** Order with offer and buyer/seller relations loaded (e.g. from get()). */
type OrderWithOffer = Awaited<ReturnType<OrdersService["get"]>>;

/**
 * Rol efectivo según la oferta: SELL = maker vende (seller), BUY = maker compra (buyer).
 * Así funciona igual para órdenes creadas antes o después del fix en take().
 */
function getEffectiveBuyerAndSeller(order: OrderWithOffer): {
  effectiveBuyerId: string;
  effectiveSellerId: string;
} {
  const offer = order.offer as { side?: string; makerId?: string };
  const makerId = offer?.makerId;
  const side = offer?.side;
  if (makerId && (side === "BUY" || side === "SELL")) {
    // BUY: maker = buyer, el otro = seller. SELL: maker = seller, el otro = buyer.
    const effectiveBuyerId = side === "BUY" ? makerId : (order.buyerId === makerId ? order.sellerId : order.buyerId);
    const effectiveSellerId = side === "BUY" ? (order.buyerId === makerId ? order.sellerId : order.buyerId) : makerId;
    return { effectiveBuyerId, effectiveSellerId };
  }
  return { effectiveBuyerId: order.buyerId, effectiveSellerId: order.sellerId };
}

function getEffectiveSellerAndBuyerUsers(order: OrderWithOffer) {
  const { effectiveBuyerId, effectiveSellerId } = getEffectiveBuyerAndSeller(order);
  const effectiveSeller = order.seller.id === effectiveSellerId ? order.seller : order.buyer;
  const effectiveBuyer = order.buyer.id === effectiveBuyerId ? order.buyer : order.seller;
  return { effectiveSeller, effectiveBuyer, effectiveSellerId, effectiveBuyerId };
}

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

  /**
   * For ERC-20 offers (USDT/USDC), returns whether the seller has sufficient allowance for lock.
   * Caller should be the seller (or anyone checking before showing "Lock").
   */
  async getAllowance(orderId: string): Promise<
    | { notApplicable: true }
    | { notApplicable?: false; sufficient: boolean; allowance: string; amountRequired: string }
  > {
    const order = await this.get(orderId);
    const asset = (order.offer as { asset?: string })?.asset;
    if (asset !== "USDT" && asset !== "USDC") {
      return { notApplicable: true };
    }
    const chainId = order.chainId ?? (order.offer as { chainId?: number })?.chainId ?? 1337;
    const { effectiveSeller } = getEffectiveSellerAndBuyerUsers(order);
    const sellerAddress = effectiveSeller.walletAddress;
    if (!sellerAddress) {
      throw new BadRequestException("Seller has no walletAddress");
    }
    const amountHuman = Number(order.amount);
    const amountInTokenUnits = BigInt(Math.round(amountHuman * 1e6));
    const { sufficient, allowance } = await this.escrow.checkAllowance({
      chainId,
      asset,
      ownerAddress: sellerAddress,
      amountInTokenUnits,
    });
    return {
      sufficient,
      allowance: allowance.toString(),
      amountRequired: amountInTokenUnits.toString(),
    };
  }

  /**
   * Firma la tx approve desde la cuenta del seller (para dev/test o cuando el backend tiene la clave).
   * Solo el seller puede llamar. Requerido antes de lock-funds para USDT/USDC.
   */
  async approveTokenForOrder(orderId: string, userId: string): Promise<{ txHash: string }> {
    const order = await this.get(orderId);
    const { effectiveSellerId, effectiveSeller } = getEffectiveSellerAndBuyerUsers(order);
    if (effectiveSellerId !== userId) throw new BadRequestException("Only seller can approve token");
    if (order.status !== "CREATED") throw new BadRequestException("Order not in CREATED state");

    const asset = (order.offer as { asset?: string })?.asset;
    if (asset !== "USDT" && asset !== "USDC") {
      throw new BadRequestException("Approve only for USDT/USDC orders");
    }

    const sellerIndex = effectiveSeller.walletIndex;
    if (sellerIndex === null || sellerIndex === undefined) {
      throw new BadRequestException("Seller has no walletIndex.");
    }

    const chainId = order.chainId ?? (order.offer as { chainId?: number })?.chainId ?? 1337;
    const escrowAddress = this.escrow.getEscrowAddressForAsset(chainId, asset);
    const amountHuman = Number(order.amount);
    const amountInTokenUnits = BigInt(Math.round(amountHuman * 1e6));

    return this.escrow.approveToken({
      chainId,
      signerIndex: sellerIndex,
      asset,
      spenderAddress: escrowAddress,
      amountInTokenUnits,
    });
  }

  async lockFunds(orderId: string, userId: string) {
    const order = await this.get(orderId);
    const { effectiveSellerId, effectiveSeller, effectiveBuyer } = getEffectiveSellerAndBuyerUsers(order);
    if (effectiveSellerId !== userId) throw new BadRequestException("Only seller can lock funds");
    if (order.status !== "CREATED") throw new BadRequestException("Order not in CREATED state");

    const sellerIndex = effectiveSeller.walletIndex;
    const buyerAddress = effectiveBuyer.walletAddress;
    const sellerAddress = effectiveSeller.walletAddress;
    if (sellerIndex === null || sellerIndex === undefined) {
      throw new BadRequestException("Seller has no walletIndex. Login again with email.");
    }
    if (!buyerAddress) throw new BadRequestException("Buyer has no walletAddress. Login again with email.");

    const chainId = order.chainId ?? (order.offer as { chainId?: number })?.chainId ?? 1337;
    const escrowKey = order.escrowOrderId ?? this.escrow.orderIdToEscrowKey(order.id);
    const asset = (order.offer as { asset?: string })?.asset;

    if (asset === "USDT" || asset === "USDC") {
      // ERC-20: amount in token units (6 decimals for USDT/USDC)
      const amountHuman = Number(order.amount);
      if (!Number.isFinite(amountHuman) || amountHuman <= 0) {
        throw new BadRequestException("Invalid order amount for ERC-20");
      }
      const amountInTokenUnits = BigInt(Math.round(amountHuman * 1e6));
      if (!sellerAddress) {
        throw new BadRequestException("Seller has no walletAddress. Login again with email.");
      }
      const { sufficient } = await this.escrow.checkAllowance({
        chainId,
        asset,
        ownerAddress: sellerAddress,
        amountInTokenUnits,
      });
      if (!sufficient) {
        throw new BadRequestException(
          `Insufficient token allowance. Please approve ${asset} for the escrow contract in your wallet before locking funds.`,
        );
      }
      const { txHash } = await this.escrow.fund({
        chainId,
        signerIndex: sellerIndex,
        escrowKey,
        buyerAddress,
        asset,
        amountInTokenUnits,
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

    // Native (ETH) path
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
    const { effectiveBuyerId } = getEffectiveBuyerAndSeller(order);
    if (effectiveBuyerId !== userId) throw new BadRequestException("Only buyer can mark paid");
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
    const { effectiveSellerId, effectiveSeller } = getEffectiveSellerAndBuyerUsers(order);
    if (effectiveSellerId !== userId) throw new BadRequestException("Only seller can release");
    if (order.status !== "PAYMENT_MARKED") throw new BadRequestException("Order not marked paid");

    const sellerIndex = effectiveSeller.walletIndex;
    if (sellerIndex === null || sellerIndex === undefined) {
      throw new BadRequestException("Seller has no walletIndex. Login again with email.");
    }
    const chainId = order.chainId ?? (order.offer as { chainId?: number })?.chainId ?? 1337;
    const escrowKey = order.escrowOrderId ?? this.escrow.orderIdToEscrowKey(order.id);
    const asset = (order.offer as { asset?: string })?.asset;

    const { txHash } = await this.escrow.release({
      chainId,
      signerIndex: sellerIndex,
      escrowKey,
      asset: asset === "USDT" || asset === "USDC" ? asset : undefined,
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

