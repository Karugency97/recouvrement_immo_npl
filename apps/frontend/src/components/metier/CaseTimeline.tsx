export type TimelineEvent = {
  id: string;
  date: number;
  title: string;
  description?: string;
};

// Timeline verticale minimaliste (point + ligne). S3a n'affiche que la
// création ; S5 y ajoutera les transitions de statut.
export function CaseTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun événement.</p>;
  }
  return (
    <ol className="relative ml-3 border-l border-border">
      {events.map((event) => (
        <li key={event.id} className="mb-6 ml-6">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
          <time className="text-xs text-muted-foreground">
            {new Date(event.date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
          <h3 className="text-sm font-medium text-foreground">{event.title}</h3>
          {event.description && (
            <p className="text-sm text-muted-foreground">{event.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
