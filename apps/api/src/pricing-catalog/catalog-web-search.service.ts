import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { CatalogWebSearchResultSchema, type CatalogWebSearchResult } from "@pm4mep/shared-schema";
import { z } from "zod";

const MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You help HVAC/MEP contractors find equipment to add to a price catalog. Given the name of
a piece of equipment, search the web for it and return up to 5 real, distinct matches.

Prefer manufacturer sites and authorized-distributor pages over marketplaces or forums. Search result
snippets alone rarely contain a direct image or PDF link — for each promising match, fetch its product
or spec-sheet page so you can find a real, direct URL for a product photo (an actual image file, not a
general product page) and, if available, a spec-sheet PDF. Only set imageUrl/specSheetUrl when you found
a direct, working link to an actual image file or PDF document — it is fine and expected to leave these
null when a page genuinely doesn't have one. Never invent a manufacturer, model number, or URL — if
you're not confident a field is correct, leave it null rather than guessing.`;

const responseFormat = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            manufacturer: { type: ["string", "null"] },
            modelNumber: { type: ["string", "null"] },
            description: { type: "string" },
            sourceUrl: { type: "string" },
            imageUrl: { type: ["string", "null"] },
            specSheetUrl: { type: ["string", "null"] },
          },
          required: ["manufacturer", "modelNumber", "description", "sourceUrl", "imageUrl", "specSheetUrl"],
          additionalProperties: false,
        },
      },
    },
    required: ["results"],
    additionalProperties: false,
  },
};

const ResultsEnvelopeSchema = z.object({ results: z.array(CatalogWebSearchResultSchema) });

// Wraps the Claude API's web_search server tool to find equipment (photos,
// spec sheets, manufacturer/model) that isn't in the org's own price list
// yet. Structured outputs (output_config.format) constrain the final
// response to parseable JSON; results are still validated against our own
// Zod schema below rather than trusted blindly, since the model can still
// return a URL that isn't actually reachable/correctly typed.
@Injectable()
export class CatalogWebSearchService {
  private readonly logger = new Logger(CatalogWebSearchService.name);
  private client: Anthropic | undefined;

  constructor(private readonly config: ConfigService) {}

  private get anthropic(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({ apiKey: this.config.getOrThrow<string>("ANTHROPIC_API_KEY") });
    }
    return this.client;
  }

  async search(query: string): Promise<CatalogWebSearchResult[]> {
    const response = await this.anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Find equipment matching: ${query}` }],
      // web_fetch is what actually lets Claude read a product page's HTML
      // and pull a real image/PDF URL out of it — web_search alone only
      // returns snippets, which rarely contain a direct file link.
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: 4 },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 4 },
      ],
      output_config: { effort: "medium", format: responseFormat },
    });

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
    if (!textBlock) {
      this.logger.warn(`catalog web search returned no text block for query "${query}"`);
      return [];
    }

    let raw: unknown;
    try {
      raw = JSON.parse(textBlock.text);
    } catch {
      this.logger.warn(`catalog web search returned unparseable JSON for query "${query}"`);
      return [];
    }

    const parsed = ResultsEnvelopeSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.warn(`catalog web search result failed validation for query "${query}": ${parsed.error.message}`);
      return [];
    }

    return parsed.data.results;
  }
}
