import { BadRequestException, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(
    @Inject(OrdersService)
    private readonly ordersService: OrdersService,
  ) {}

  @Get("my")
  async getMy(@Headers("x-user-id") userId: string) {
    if (!userId) throw new BadRequestException("Missing x-user-id header");
    return this.ordersService.getMy(userId);
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return this.ordersService.get(id);
  }

  @Post(":id/mark-paid")
  async markPaid(@Param("id") id: string, @Headers("x-user-id") userId: string) {
    if (!userId) throw new BadRequestException("Missing x-user-id header");
    return this.ordersService.markPaid(id, userId);
  }

  @Post(":id/release")
  async release(@Param("id") id: string, @Headers("x-user-id") userId: string) {
    if (!userId) throw new BadRequestException("Missing x-user-id header");
    return this.ordersService.release(id, userId);
  }

  @Post(":id/lock-funds")
  async lockFunds(@Param("id") id: string, @Headers("x-user-id") userId: string) {
    if (!userId) throw new BadRequestException("Missing x-user-id header");
    return this.ordersService.lockFunds(id, userId);
  }
}

