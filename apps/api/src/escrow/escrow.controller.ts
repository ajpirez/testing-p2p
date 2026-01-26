import { BadRequestException, Body, Controller, Headers, Inject, Post } from "@nestjs/common";
import { OrdersService } from "../orders/orders.service";

@Controller("escrow")
export class EscrowController {
  constructor(
    @Inject(OrdersService)
    private readonly ordersService: OrdersService,
  ) {}

  @Post("fund")
  async fund(@Headers("x-user-id") userId: string, @Body() body: { orderId?: string }) {
    if (!userId) throw new BadRequestException("Missing x-user-id header");
    if (!body?.orderId) throw new BadRequestException("Missing orderId");
    return this.ordersService.lockFunds(body.orderId, userId);
  }

  @Post("release")
  async release(@Headers("x-user-id") userId: string, @Body() body: { orderId?: string }) {
    if (!userId) throw new BadRequestException("Missing x-user-id header");
    if (!body?.orderId) throw new BadRequestException("Missing orderId");
    return this.ordersService.release(body.orderId, userId);
  }
}

