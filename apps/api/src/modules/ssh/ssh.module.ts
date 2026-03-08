import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { SshGateway } from "./ssh.gateway";

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [SshGateway],
})
export class SshModule {}
