import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AssembliesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assemblies</CardTitle>
        <CardDescription>Reusable pricing recipes built from price list and labor rate components.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">Coming shortly — built next in this phase.</CardContent>
    </Card>
  );
}
