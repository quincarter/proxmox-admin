import { UnauthorizedException } from "@nestjs/common";
import { ExecutionContext } from "@nestjs/common";
import { SessionGuard } from "./session.guard";
import { AuthService } from "../modules/auth/auth.service";

const fakeSession = {
  id: "sess-1",
  serverId: "ephemeral:pve.local:8006",
  username: "root@pam",
  realm: "pam",
  ticket: "PVE:root@pam:abc",
  csrfToken: "csrf",
  expiresAt: Date.now() + 60_000,
  server: {} as any,
};

const mockAuthService = {
  requireSession: jest.fn(),
};

function makeContext(cookies: Record<string, string>): ExecutionContext {
  const req = { cookies } as any;
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe("SessionGuard", () => {
  let guard: SessionGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new SessionGuard(mockAuthService as unknown as AuthService);
  });

  it("throws UnauthorizedException when no session cookie is present", () => {
    const ctx = makeContext({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when the session is invalid", () => {
    mockAuthService.requireSession.mockImplementation(() => {
      throw new UnauthorizedException("Session not found or expired");
    });
    const ctx = makeContext({ pxa_session: "bad-session-id" });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it("returns true and attaches the session when valid", () => {
    mockAuthService.requireSession.mockReturnValue(fakeSession);
    const req = { cookies: { pxa_session: "sess-1" } } as any;
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.session).toEqual(fakeSession);
    expect(mockAuthService.requireSession).toHaveBeenCalledWith("sess-1");
  });
});
