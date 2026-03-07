import { Global, Module } from "@nestjs/common";
import { ProxmoxHttpService } from "./proxmox-http.service";
import { ProxmoxService } from "./proxmox.service";

@Global()
@Module({
  providers: [ProxmoxHttpService, ProxmoxService],
  exports: [ProxmoxHttpService, ProxmoxService],
})
export class ProxmoxModule {}
