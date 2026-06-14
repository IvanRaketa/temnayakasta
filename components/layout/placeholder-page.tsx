import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description: string;
  details?: string;
}

export function PlaceholderPage({ title, description, details }: PlaceholderPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        {details ? <p className="text-sm leading-6 text-muted-foreground">{details}</p> : null}
      </CardContent>
    </Card>
  );
}
