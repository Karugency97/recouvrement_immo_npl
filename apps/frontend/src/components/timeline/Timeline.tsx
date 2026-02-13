import { Check, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils/format-date";

interface TimelineEvent {
  id: string;
  titre: string;
  description?: string | null;
  date_evenement: string;
  type: string;
  state: "completed" | "current" | "upcoming";
}

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  return (
    <div className="space-y-0">
      {events.map((event, index) => (
        <div
          key={event.id}
          className={cn("relative flex gap-4 pb-8", index === events.length - 1 && "pb-0")}
        >
          {/* Vertical line */}
          {index < events.length - 1 && (
            <div
              className={cn(
                "absolute left-[15px] top-8 h-[calc(100%-32px)] w-0.5",
                event.state === "completed" ? "bg-emerald-200" : "bg-slate-200"
              )}
            />
          )}

          {/* Dot */}
          <div
            className={cn(
              "h-8 w-8 rounded-full border-4 border-background flex items-center justify-center shrink-0",
              event.state === "completed" &&
                "bg-emerald-500 border-emerald-100",
              event.state === "current" &&
                "bg-blue-500 border-blue-100 ring-4 ring-blue-100",
              event.state === "upcoming" && "bg-slate-200 border-slate-100"
            )}
          >
            {event.state === "completed" && (
              <Check className="h-3 w-3 text-white" />
            )}
            {event.state === "current" && (
              <Clock className="h-3 w-3 text-white" />
            )}
            {event.state === "upcoming" && (
              <Circle className="h-2 w-2 text-slate-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pt-1">
            <p className="text-sm font-medium text-foreground">{event.titre}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(event.date_evenement)}
            </p>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {event.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
