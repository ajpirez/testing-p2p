import { BadRequestException, Body, Controller, Get, Headers, Inject, Post } from "@nestjs/common";
import { CreateOfferSchema, TakeOfferSchema } from "@p2p/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { OffersService } from "./offers.service";

@Controller("offers")
export class OffersController {
  constructor(
    @Inject(OffersService)
    private readonly offersService: OffersService,
  ) {}

  @Get()
  async list() {
    return this.offersService.listActive();
  }

  @Post()
  async create(
    @Headers("x-user-id") userId: string,
    @Body(new ZodValidationPipe(CreateOfferSchema)) body: unknown,
  ) {
    if (!userId) throw new BadRequestException("Missing x-user-id header");
    return this.offersService.create(userId, body as any);
  }

  @Post("take")
  async take(
    @Headers("x-user-id") userId: string,
    @Body(new ZodValidationPipe(TakeOfferSchema)) body: unknown,
  ) {
    if (!userId) throw new BadRequestException("Missing x-user-id header");
    return this.offersService.take(userId, body as any);
  }
}

