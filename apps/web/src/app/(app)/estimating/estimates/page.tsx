import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EstimatesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimates</CardTitle>
        <CardDescription>Build bids from cost codes, price list items, and assemblies.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">Coming shortly — built next in this phase.</CardContent>
    </Card>
  );
}
