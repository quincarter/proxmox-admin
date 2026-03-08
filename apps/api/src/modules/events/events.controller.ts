import { Controller, MessageEvent, Req, Sse, UseGuards } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { concat, Observable, of } from "rxjs";
import type { Request } from "express";
import { SessionGuard } from "../../guards/session.guard";
import { EventsService } from "./events.service";

@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /**
   * SSE stream endpoint at GET /api/events/stream.
   *
   * Multiplexes all Proxmox realtime events (node status, guest status,
   * storage updates, task updates) over a single persistent HTTP connection.
   * Uses HTTP/2 for connection multiplexing when behind Caddy or nginx.
   *
   * Authentication: requires a valid pxa_session cookie (SessionGuard).
   */
  @UseGuards(SessionGuard)
  @Sse("stream")
  stream(@Req() _req: Request): Observable<MessageEvent> {
    const clientId = uuidv4();

    // Emit a "connected" event first so the client knows the stream is live
    const connected$: Observable<MessageEvent> = of({
      data: JSON.stringify({
        type: "connected",
        clientId,
        timestamp: Date.now(),
      }),
      type: "connected",
      id: clientId,
    } satisfies MessageEvent);

    return concat(connected$, this.events.getEventStream());
  }
}
