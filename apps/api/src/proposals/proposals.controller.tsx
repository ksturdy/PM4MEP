import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { renderToStream } from "@react-pdf/renderer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth-context";
import { ProposalsService } from "./proposals.service";
import { ProposalDocument } from "./templates/proposal-document";

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

    reply
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        `inline; filename="${data.estimate.number}-${internal ? "internal" : "proposal"}.pdf"`,
      )
      .send(stream);
  }
}
