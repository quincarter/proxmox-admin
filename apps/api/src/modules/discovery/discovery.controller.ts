import { Controller, Get, Post } from "@nestjs/common";
import { DiscoveryService } from "./discovery.service";

@Controller("discovery")
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get("hints")
  getHints() {
    return { data: this.discovery.getConfiguredHints() };
  }

  @Get()
  async listResults() {
    return { data: await this.discovery.listSavedResults() };
  }

  @Post("scan")
  async scan() {
    const candidates = await this.discovery.discoverHints();
    await this.discovery.saveDiscoveryResults(candidates);
    return { data: candidates };
  }
}
