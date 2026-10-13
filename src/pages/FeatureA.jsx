import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card.jsx';

export default function FeatureA() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Feature placeholder
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Swap your feature in here.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empty by design</CardTitle>
          <CardDescription>
            This page exists so you have a route + shell to copy. Replace the contents with your
            real feature when you're ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border bg-surface text-sm text-muted-foreground">
            Your feature goes here
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
