import { Injectable } from "@nestjs/common";
import type { Prisma } from "@pm4mep/db";
import type {
  PriceListItemCreate,
  PriceListItemFromWebResultCreate,
  PriceListItemPhotoUploadUrlRequest,
  PriceListItemSpecSheetUploadUrlRequest,
  PriceListItemUpdate,
} from "@pm4mep/shared-schema";
import { PrismaService } from "../prisma/prisma.service";
import { R2Service } from "../storage/r2.service";

@Injectable()
export class PriceListItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  // No `search` → unchanged behavior (all items, active + inactive) for the
  // admin table. `search` present → active-only, matched against
  // description/manufacturer/modelNumber/sku, for the "From Catalog"
  // add-to-estimate typeahead — inactive items shouldn't be addable to new
  // estimates even though they still need to show up for admin management.
  list(orgId: string, search?: string) {
    const where: Prisma.PriceListItemWhereInput = search
      ? {
          orgId,
          active: true,
          OR: [
            { description: { contains: search, mode: "insensitive" } },
            { manufacturer: { contains: search, mode: "insensitive" } },
            { modelNumber: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : { orgId };

    return this.prisma.withTenant(orgId, (tx) =>
      tx.priceListItem.findMany({ where, orderBy: { description: "asc" }, ...(search ? { take: 20 } : {}) }),
    );
  }

  create(orgId: string, input: PriceListItemCreate) {
    return this.prisma.withTenant(orgId, (tx) =>
      tx.priceListItem.create({ data: { ...input, orgId } }),
    );
  }

  update(orgId: string, id: string, input: PriceListItemUpdate) {
    return this.prisma.withTenant(orgId, (tx) => tx.priceListItem.update({ where: { id }, data: input }));
  }

  createPhotoUploadUrl(orgId: string, input: PriceListItemPhotoUploadUrlRequest) {
    return this.r2.createPriceListItemPhotoUploadUrl(orgId, input.contentType);
  }

  createSpecSheetUploadUrl(orgId: string, input: PriceListItemSpecSheetUploadUrlRequest) {
    return this.r2.createPriceListItemSpecSheetUploadUrl(orgId, input.contentType);
  }

  // Turns a picked web-search candidate into a real catalog item: re-hosts
  // the source image/spec-sheet to our own R2 bucket (never hotlinked — see
  // R2Service.uploadFromUrl), then creates it through the normal `create`
  // path so it's indistinguishable from a manually-entered catalog item.
  async createFromWebResult(orgId: string, input: PriceListItemFromWebResultCreate) {
    const { imageUrl, specSheetUrl, ...rest } = input;

    const [photoUrl, hostedSpecSheetUrl] = await Promise.all([
      imageUrl ? this.r2.uploadFromUrl(orgId, imageUrl, "photo") : Promise.resolve(null),
      specSheetUrl ? this.r2.uploadFromUrl(orgId, specSheetUrl, "specSheet") : Promise.resolve(null),
    ]);

    return this.create(orgId, {
      ...rest,
      photoUrls: photoUrl ? [photoUrl] : undefined,
      specSheetUrl: hostedSpecSheetUrl ?? undefined,
    });
  }
}
