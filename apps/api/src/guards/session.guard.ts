import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { AuthService } from "../modules/auth/auth.service";

export const SESSION_COOKIE = "pxa_session";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!sessionId) {
      throw new UnauthorizedException("Authentication required");
    }
    const session = this.auth.requireSession(sessionId);
    // Attach session to request for downstream use
    (req as Request & { session: typeof session }).session = session;
    return true;
  }
}
