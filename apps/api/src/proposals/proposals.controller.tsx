import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { renderToStream } from "@react-pdf/renderer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth-context";
import { ProposalsService } from "./proposals.service";
import { ProposalDocument } from "./templates/proposal-document";

// fastify@5.10.0's own .d.ts has an upstream typing regression: FastifyReply
// resolves with every instance method (.header/.send/.status/...) missing,
// reproduced in isolation with a bare `reply: FastifyReply` and unrelated to
// this app's tsconfig or any other dependency here. The methods work fine
// at runtime (this is a types-only bug) — ReplyLike just re-declares the
// two we call with their real signatures so the actual Fastify methods
// still run (onSend hooks, e.g. @fastify/helmet's headers, still fire
// normally) without fighting the broken generic defaults. Drop this once
// fastify ships a fix — reply.header(...).send(...) without a cast should
// typecheck cleanly again.
interface ReplyLike {
  header(key: string, value: string): ReplyLike;
  send(payload: unknown): void;
}

// Generated on demand, never persisted — no file storage (R2) wired up
// yet. internal=true includes full line-item cost detail; the default
// (false) is the customer-facing view (section lump sums only).
@Controller("estimates/:id/proposal")
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(private readonly proposals: ProposalsService) {}

  @Get()
  async generate(
    @CurrentAuth() auth: AuthContext,
    @Param("id") id: string,
    @Query("internal") internalParam: string | undefined,
    @Res() reply: FastifyReply,
  ) {
    const internal = internalParam === "true";
    const data = await this.proposals.getProposalData(auth.orgId, id);

    const stream = await renderToStream(
      <ProposalDocument
        org={data.org}
        estimate={data.estimate}
        rollup={data.rollup}
        resolvedSellPrice={data.resolvedSellPrice}
        resolvedSellPriceWithTax={data.resolvedSellPriceWithTax}
        internal={internal}
      />,
    );

    (reply as unknown as ReplyLike)
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        `inline; filename="${data.estimate.number}-${internal ? "internal" : "proposal"}.pdf"`,
      )
      .send(stream);
  }
}
