import { Module } from "@nestjs/common";
import { GuestsController, GuestsListController } from "./guests.controller";
import { GuestsService } from "./guests.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [GuestsController, GuestsListController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule {}
