import { Module } from "@nestjs/common";
import { StorageController, NodeStorageController } from "./storage.controller";
import { StorageService } from "./storage.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [StorageController, NodeStorageController],
  providers: [StorageService],
})
export class StorageModule {}
