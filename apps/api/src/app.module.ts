import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ProxmoxModule } from "./modules/proxmox/proxmox.module";
import { NodesModule } from "./modules/nodes/nodes.module";
import { GuestsModule } from "./modules/guests/guests.module";
import { StorageModule } from "./modules/storage/storage.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ProxmoxModule,
    NodesModule,
    GuestsModule,
    StorageModule,
    DiscoveryModule,
  ],
})
export class AppModule {}
