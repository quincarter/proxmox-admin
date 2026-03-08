import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import * as cookieParser from "cookie-parser";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";
import { ProxmoxHttpService } from "../../src/modules/proxmox/proxmox-http.service";
import { EventsService } from "../../src/modules/events/events.service";

// ─── Mock shapes ──────────────────────────────────────────────────────────────

export type MockPrisma = {
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  knownServer: {
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    upsert: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  connectionAudit: { create: jest.Mock };
  discoveryResult: { upsert: jest.Mock; findMany: jest.Mock };
};

export type MockProxmoxHttp = {
  buildBaseUrl: jest.Mock;
  buildClient: jest.Mock;
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
};

export interface TestApp {
  app: INestApplication;
  prisma: MockPrisma;
  proxmoxHttp: MockProxmoxHttp;
}

// ─── Factory helpers ──────────────────────────────────────────────────────────

/** Sentinel passed from buildClient() → get()/post() — services just forward it. */
const CLIENT = Symbol("proxmox-client");

export function buildMockPrisma(): MockPrisma {
  return {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    knownServer: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    connectionAudit: { create: jest.fn().mockResolvedValue(undefined) },
    discoveryResult: {
      upsert: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

export function buildMockProxmoxHttp(): MockProxmoxHttp {
  return {
    buildBaseUrl: jest
      .fn()
      .mockImplementation(
        (host: string, port: number) => `https://${host}:${port}/api2/json`,
      ),
    buildClient: jest.fn().mockReturnValue(CLIENT),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
}

export async function createTestApp(
  opts: { overrideEventsService?: Partial<EventsService> } = {},
): Promise<TestApp> {
  const prisma = buildMockPrisma();
  const proxmoxHttp = buildMockProxmoxHttp();

  let builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(ProxmoxHttpService)
    .useValue(proxmoxHttp);

  if (opts.overrideEventsService) {
    builder = builder
      .overrideProvider(EventsService)
      .useValue(opts.overrideEventsService);
  }

  const module: TestingModule = await builder.compile();

  const app = module.createNestApplication();
  app.setGlobalPrefix("api");
  app.useWebSocketAdapter(new WsAdapter(app));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return { app, prisma, proxmoxHttp };
}

// ─── Shared test fixtures ─────────────────────────────────────────────────────

/** The mock Proxmox auth ticket returned from POST /access/ticket */
export const MOCK_PROXMOX_TICKET = {
  ticket: "PVE:root@pam:DEADBEEF::TESTTOKEN",
  CSRFPreventionToken: "TESTCSRF123",
  username: "root@pam",
  expire: Math.floor(Date.now() / 1000) + 7200,
};

/** Default login body — uses an ephemeral (non-persisted) server */
export const LOGIN_BODY = {
  host: "192.168.1.10",
  port: 8006,
  username: "root",
  password: "test-password",
  realm: "pam",
  tlsMode: "insecure" as const,
  saveServer: false,
};

/** Performs a login, asserts 200, and returns the raw Set-Cookie header value */
export async function doLogin(
  app: INestApplication,
  proxmoxHttp: MockProxmoxHttp,
): Promise<string> {
  proxmoxHttp.post.mockResolvedValueOnce(MOCK_PROXMOX_TICKET);

  const res = await request(app.getHttpServer())
    .post("/api/auth/login")
    .send(LOGIN_BODY)
    .expect(200);

  const rawCookies = res.headers["set-cookie"] as unknown as
    | string[]
    | undefined;
  const cookies = Array.isArray(rawCookies)
    ? rawCookies
    : rawCookies
      ? [rawCookies as unknown as string]
      : [];
  if (!cookies.length) throw new Error("Login did not set pxa_session cookie");

  // Return just the name=value pair, stripped of directives
  const sessionCookie = cookies.find((c) => c.startsWith("pxa_session"));
  if (!sessionCookie) throw new Error("pxa_session cookie not found");
  return sessionCookie.split(";")[0]; // "pxa_session=<uuid>"
}

// ─── Mock Proxmox data fixtures ───────────────────────────────────────────────

export const MOCK_NODE_SUMMARY = {
  node: "pve",
  status: "online",
  cpu: 0.05,
  maxcpu: 4,
  mem: 1_073_741_824,
  maxmem: 8_589_934_592,
  uptime: 86_400,
  type: "node",
  id: "node/pve",
};

export const MOCK_NODE_VERSION = {
  release: "8.4",
  version: "8.4.0",
  repoid: "abc123def456",
};

export const MOCK_NODE_SUBSCRIPTION = {
  status: "Active",
  productname: "Proxmox VE Subscription",
};

export const MOCK_LXC_GUEST = {
  vmid: 100,
  name: "test-container",
  status: "running",
  type: "lxc",
  node: "pve",
  cpu: 0.01,
  mem: 134_217_728,
  maxmem: 536_870_912,
  uptime: 3600,
};

export const MOCK_QEMU_GUEST = {
  vmid: 101,
  name: "test-vm",
  status: "running",
  type: "qemu",
  node: "pve",
  cpu: 0.03,
  mem: 268_435_456,
  maxmem: 2_147_483_648,
  uptime: 7200,
};

export const MOCK_LXC_CONFIG = {
  hostname: "test-container",
  memory: 512,
  swap: 512,
  arch: "amd64",
  ostype: "debian",
  rootfs: "local:100/vm-100-disk-0.raw",
  net0: "name=eth0,bridge=vmbr0,ip=dhcp",
};

export const MOCK_STORAGE_SUMMARY = {
  storage: "local",
  type: "dir",
  active: 1,
  enabled: 1,
  total: 107_374_182_400,
  used: 53_687_091_200,
  avail: 53_687_091_200,
  content: "images,rootdir",
};

export const MOCK_STORAGE_VOLUME = {
  volid: "local:100/vm-100-disk-0.raw",
  content: "rootdir",
  size: 10_737_418_240,
  format: "raw",
};

export const MOCK_TASK_SUMMARY = {
  upid: "UPID:pve:000A1B2C:00D4E5F6:6789ABCD:qmstart:101:root@pam:",
  node: "pve",
  pid: 12345,
  pstart: 6789,
  starttime: 1_700_000_000,
  type: "qmstart",
  id: "101",
  user: "root@pam",
  status: "OK",
  endtime: 1_700_000_010,
};

export const MOCK_LXC_CURRENT_STATUS = {
  status: "running",
  name: "test-container",
  cpu: 0.02,
  cpus: 2,
  mem: 134_217_728,
  maxmem: 536_870_912,
  disk: 1_073_741_824,
  maxdisk: 10_737_418_240,
  netin: 1_048_576,
  netout: 524_288,
  uptime: 3600,
  pid: 9876,
};

export const MOCK_QEMU_CONFIG = {
  name: "test-vm",
  memory: 2048,
  cores: 2,
  sockets: 1,
  ostype: "l26",
  bios: "seabios",
  machine: "pc",
  boot: "order=scsi0",
  onboot: true,
  scsi0: "local-lvm:vm-101-disk-0,size=32G",
};

export const MOCK_QEMU_CURRENT_STATUS = {
  status: "running",
  name: "test-vm",
  cpu: 0.05,
  cpus: 2,
  mem: 1_073_741_824,
  maxmem: 2_147_483_648,
  disk: 0,
  maxdisk: 34_359_738_368,
  netin: 2_097_152,
  netout: 1_048_576,
  diskread: 4_096,
  diskwrite: 2_048,
  uptime: 7200,
  pid: 10001,
};
