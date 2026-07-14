import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Prisma } from "@pm4mep/db";
import type { Decimal, EstimateRollupResult } from "@pm4mep/domain";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  orgName: { fontSize: 16, fontWeight: 700 },
  small: { fontSize: 9, color: "#555" },
  title: { fontSize: 18, fontWeight: 700, textAlign: "right" },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  bidToBlock: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  block: { width: "48%" },
  label: { fontSize: 9, color: "#555", marginBottom: 2 },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #ccc",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 700,
  },
  tableRow: { flexDirection: "row", paddingVertical: 3, borderBottom: "0.5 solid #eee" },
  colDescription: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colUnitCost: { flex: 1, textAlign: "right" },
  colExtended: { flex: 1, textAlign: "right" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTop: "1 solid #333",
    fontWeight: 700,
    fontSize: 12,
  },
  textBlock: { fontSize: 9, lineHeight: 1.4, marginBottom: 8 },
  footer: { marginTop: 24, fontSize: 8, color: "#777" },
});

function money(value: Decimal | number): string {
  const n = typeof value === "number" ? value : value.toNumber();
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type OrgForProposal = Prisma.OrganizationGetPayload<Record<string, never>>;
type EstimateForProposal = Prisma.EstimateGetPayload<{
  include: {
    customer: true;
    createdBy: true;
    sections: { include: { lineItems: true } };
  };
}>;

export interface ProposalDocumentProps {
  org: OrgForProposal;
  estimate: EstimateForProposal;
  rollup: EstimateRollupResult;
  resolvedSellPrice: Decimal;
  resolvedSellPriceWithTax: Decimal;
  internal: boolean;
}

export function ProposalDocument({
  org,
  estimate,
  rollup,
  resolvedSellPrice,
  resolvedSellPriceWithTax,
  internal,
}: ProposalDocumentProps) {
  const totalDirectCost = rollup.totalDirectCost.toNumber();

  return (
    <Document title={`${estimate.number} — ${estimate.name}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.orgName}>{org.name}</Text>
            {org.addressLine1 && <Text style={styles.small}>{org.addressLine1}</Text>}
            {(org.city || org.state || org.postalCode) && (
              <Text style={styles.small}>
                {[org.city, org.state, org.postalCode].filter(Boolean).join(", ")}
              </Text>
            )}
            {org.phone && <Text style={styles.small}>{org.phone}</Text>}
            {org.licenseNumber && <Text style={styles.small}>License #{org.licenseNumber}</Text>}
          </View>
          <View>
            <Text style={styles.title}>PROPOSAL</Text>
            <Text style={styles.small}>{estimate.number}</Text>
            <Text style={styles.small}>{new Date(estimate.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.bidToBlock}>
          <View style={styles.block}>
            <Text style={styles.label}>PREPARED FOR</Text>
            <Text>{estimate.customer.name}</Text>
            <Text style={styles.small}>{estimate.customer.addressLine1}</Text>
            <Text style={styles.small}>
              {[estimate.customer.city, estimate.customer.state, estimate.customer.postalCode]
                .filter(Boolean)
                .join(", ")}
            </Text>
            {estimate.bidToContactName && <Text style={styles.small}>Attn: {estimate.bidToContactName}</Text>}
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>PROJECT</Text>
            <Text>{estimate.name}</Text>
            {estimate.bidDueDate && (
              <Text style={styles.small}>Bid due: {new Date(estimate.bidDueDate).toLocaleDateString()}</Text>
            )}
            <Text style={styles.small}>Prepared by: {estimate.createdBy.name}</Text>
          </View>
        </View>

        {estimate.scopeDescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scope of Work</Text>
            <Text style={styles.textBlock}>{estimate.scopeDescription}</Text>
          </View>
        )}

        {estimate.sections.map((section) => {
          const sectionDirectCost = section.lineItems.reduce(
            (sum, li) => sum + li.extendedCost.toNumber(),
            0,
          );
          const sectionShare = totalDirectCost > 0 ? sectionDirectCost / totalDirectCost : 0;
          const sectionSellPrice = resolvedSellPrice.toNumber() * sectionShare;

          return (
            <View key={section.id} style={styles.section} wrap={false}>
              <Text style={styles.sectionTitle}>{section.name}</Text>
              {internal ? (
                <>
                  <View style={styles.tableHeader}>
                    <Text style={styles.colDescription}>Description</Text>
                    <Text style={styles.colQty}>Qty</Text>
                    <Text style={styles.colUnitCost}>Unit Cost</Text>
                    <Text style={styles.colExtended}>Extended</Text>
                  </View>
                  {section.lineItems.map((li) => (
                    <View key={li.id} style={styles.tableRow}>
                      <Text style={styles.colDescription}>{li.description}</Text>
                      <Text style={styles.colQty}>
                        {li.quantity.toNumber()} {li.unit}
                      </Text>
                      <Text style={styles.colUnitCost}>${money(li.unitCost)}</Text>
                      <Text style={styles.colExtended}>${money(li.extendedCost)}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.row}>
                  <Text>{section.lineItems.length} item(s)</Text>
                  <Text>${money(sectionSellPrice)}</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          {internal ? (
            <>
              {(["labor", "material", "equipment", "subcontract", "other"] as const).map((type) => (
                <View key={type} style={styles.summaryRow}>
                  <Text>{type[0]!.toUpperCase() + type.slice(1)} (marked up)</Text>
                  <Text>${money(rollup.markedUpByType[type])}</Text>
                </View>
              ))}
              <View style={styles.summaryRow}>
                <Text>Overhead</Text>
                <Text>${money(rollup.overheadAmount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>Profit</Text>
                <Text>${money(rollup.profitAmount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>Contingency</Text>
                <Text>${money(rollup.contingencyAmount)}</Text>
              </View>
              {estimate.taxPct.toNumber() > 0 && (
                <View style={styles.summaryRow}>
                  <Text>Tax ({estimate.taxPct.toNumber()}%)</Text>
                  <Text>${money(resolvedSellPriceWithTax.minus(resolvedSellPrice))}</Text>
                </View>
              )}
            </>
          ) : (
            estimate.taxPct.toNumber() > 0 && (
              <View style={styles.summaryRow}>
                <Text>Tax ({estimate.taxPct.toNumber()}%)</Text>
                <Text>${money(resolvedSellPriceWithTax.minus(resolvedSellPrice))}</Text>
              </View>
            )
          )}
          <View style={styles.summaryTotal}>
            <Text>Total</Text>
            <Text>${money(resolvedSellPriceWithTax)}</Text>
          </View>
        </View>

        {estimate.inclusions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inclusions</Text>
            <Text style={styles.textBlock}>{estimate.inclusions}</Text>
          </View>
        )}
        {estimate.exclusions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exclusions</Text>
            <Text style={styles.textBlock}>{estimate.exclusions}</Text>
          </View>
        )}
        {estimate.termsAndConditions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms &amp; Conditions</Text>
            <Text style={styles.textBlock}>{estimate.termsAndConditions}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          {internal ? "INTERNAL — includes cost detail, not for customer distribution." : `${org.name} — ${estimate.number}`}
        </Text>
      </Page>
    </Document>
  );
}
