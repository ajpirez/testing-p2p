import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";

@Injectable()
export class ChainService {
  private readonly provider: ethers.JsonRpcProvider;

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
  ) {
    const rpcUrl = this.config.get<string>("GANACHE_RPC_URL") ?? "http://127.0.0.1:7545";
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  getProvider() {
    return this.provider;
  }

  async listAccounts(): Promise<string[]> {
    const accounts = await this.provider.listAccounts();
    // ethers v6 JsonRpcProvider may return JsonRpcSigner[] here
    return accounts.map((a: any) => (typeof a === "string" ? a : a?.address)).filter(Boolean);
  }

  async getSignerByIndex(index: number): Promise<ethers.JsonRpcSigner> {
    return await this.provider.getSigner(index);
  }

  async getAddressByIndex(index: number) {
    const signer = await this.getSignerByIndex(index);
    return await signer.getAddress();
  }
}

