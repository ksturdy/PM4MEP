import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CatalogWebSearchResultSchema, type CatalogWebSearchResult } from "@pm4mep/shared-schema";
import { z } from "zod";

const SERPAPI_BASE_URL = "https://serpapi.com/search";
const MAX_RESULTS = 5;

const ImagesResultSchema = z.object({
  title: z.string().optional(),
  link: z.string().url(),
  // Not every result carries a full-resolution `original` — fall back to
  // `thumbnail` (still a real photo, just lower-res) rather than discarding
  // the result outright.
  original: z.string().url().optional(),
  thumbnail: z.string().url().optional(),
});

// SerpAPI returns HTTP 200 with an `error` string in the body for account
// issues (invalid key, no credits, unverified account) rather than a
// non-2xx status — checked explicitly below so those don't get silently
// swallowed as "zero results found."
const ImagesResponseSchema = z.object({
  images_results: z.array(ImagesResultSchema).optional(),
  error: z.string().optional(),
});

const OrganicResultSchema = z.object({
  link: z.string().url(),
});

const OrganicResponseSchema = z.object({
  organic_results: z.array(OrganicResultSchema).optional(),
  error: z.string().optional(),
});

// Finds equipment photos/spec sheets via SerpAPI's Google Search/Google
// Images results — direct image and PDF URLs straight from Google's own
// index, no LLM in the loop. An earlier version of this routed through the
// Claude API's web_search/web_fetch tools, but that returns text snippets
// meant for an LLM to reason over, not structured image/product data — it
// was slow (searches took 30s-a few minutes), and even with web_fetch added
// it frequently failed to find any real photo/spec-sheet URL at all. A
// direct search API is both much faster and, since Google's own index has
// already extracted these as structured results, much more reliable for
// exactly this "find me a photo and a spec sheet" task.
@Injectable()
export class CatalogWebSearchService {
  private readonly logger = new Logger(CatalogWebSearchService.name);

  constructor(private readonly config: ConfigService) {}

  async search(query: string): Promise<CatalogWebSearchResult[]> {
    const apiKey = this.config.getOrThrow<string>("SERPAPI_KEY");

    const [images, specSheetUrls] = await Promise.all([
      this.fetchImages(query, apiKey),
      this.fetchSpecSheetUrls(query, apiKey),
    ]);

    // Dedupe by source page (link) — the same product page often surfaces
    // more than once with different image crops/angles.
    const seenLinks = new Set<string>();
    const candidates: CatalogWebSearchResult[] = [];
    for (const image of images) {
      const imageUrl = image.original ?? image.thumbnail;
      if (!imageUrl || seenLinks.has(image.link)) continue;
      seenLinks.add(image.link);

      const sourceHost = this.hostname(image.link);
      const specSheetUrl = specSheetUrls.find((url) => this.hostname(url) === sourceHost) ?? null;

      candidates.push(
        CatalogWebSearchResultSchema.parse({
          manufacturer: null,
          modelNumber: null,
          description: image.title?.trim() || query,
          sourceUrl: image.link,
          imageUrl,
          specSheetUrl,
        }),
      );
      if (candidates.length >= MAX_RESULTS) break;
    }

    return candidates;
  }

  private async fetchImages(
    query: string,
    apiKey: string,
  ): Promise<Array<{ title?: string; link: string; original?: string; thumbnail?: string }>> {
    const url = new URL(SERPAPI_BASE_URL);
    url.searchParams.set("engine", "google_images");
    url.searchParams.set("q", query);
    url.searchParams.set("api_key", apiKey);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`SerpAPI image search failed with status ${response.status} for query "${query}"`);
        return [];
      }

      const parsed = ImagesResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        this.logger.warn(`SerpAPI image search response failed validation for query "${query}"`);
        return [];
      }
      if (parsed.data.error) {
        this.logger.error(`SerpAPI image search returned an error for query "${query}": ${parsed.data.error}`);
        throw new BadGatewayException(`SerpAPI error: ${parsed.data.error}`);
      }

      return parsed.data.images_results ?? [];
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      this.logger.warn(`SerpAPI image search request failed for query "${query}": ${(err as Error).message}`);
      return [];
    }
  }

  // Google's own index already surfaces spec-sheet PDFs directly for a
  // `filetype:pdf` query — no need for an LLM to guess at a URL.
  private async fetchSpecSheetUrls(query: string, apiKey: string): Promise<string[]> {
    const url = new URL(SERPAPI_BASE_URL);
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", `${query} spec sheet filetype:pdf`);
    url.searchParams.set("api_key", apiKey);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`SerpAPI spec-sheet search failed with status ${response.status} for query "${query}"`);
        return [];
      }

      const parsed = OrganicResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        this.logger.warn(`SerpAPI spec-sheet search response failed validation for query "${query}"`);
        return [];
      }
      if (parsed.data.error) {
        this.logger.error(`SerpAPI spec-sheet search returned an error for query "${query}": ${parsed.data.error}`);
        throw new BadGatewayException(`SerpAPI error: ${parsed.data.error}`);
      }

      return (parsed.data.organic_results ?? [])
        .map((result) => result.link)
        .filter((link) => link.toLowerCase().endsWith(".pdf"));
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      this.logger.warn(`SerpAPI spec-sheet search request failed for query "${query}": ${(err as Error).message}`);
      return [];
    }
  }

  private hostname(url: string): string | null {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }
}
