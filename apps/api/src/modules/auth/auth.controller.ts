import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

const SESSION_COOKIE = "pxa_session";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const clientIp = req.ip ?? "unknown";
    const result = await this.auth.login(dto, clientIp);

    // Set session in an httpOnly cookie — never expose it in the response body
    res.cookie(SESSION_COOKIE, result.sessionId, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 2 * 60 * 60 * 1000, // 2h
    });

    return res.json({
      data: {
        username: result.username,
        realm: result.realm,
        server: result.server,
        expiresAt: result.expiresAt,
      },
    });
  }

  @Delete("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (sessionId) {
      this.auth.logout(sessionId);
    }
    res.clearCookie(SESSION_COOKIE);
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get("session")
  getSession(@Req() req: Request) {
    const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!sessionId) {
      throw new UnauthorizedException("No session");
    }
    const session = this.auth.getSession(sessionId);
    if (!session) {
      throw new UnauthorizedException("Session expired or not found");
    }
    return {
      data: {
        username: session.username,
        realm: session.realm,
        serverId: session.serverId,
        expiresAt: session.expiresAt,
      },
    };
  }
}
