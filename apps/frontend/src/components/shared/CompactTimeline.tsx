import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactTimelineStep {
  label: string;
  state: "completed" | "current" | "upcoming";
}

interface CompactTimelineProps {
  steps: CompactTimelineStep[];
}

export function CompactTimeline({ steps }: CompactTimelineProps) {
  return (
    <div className="flex items-center">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center">
          {/* Dot */}
          <div
            className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
              step.state === "completed" && "bg-emerald-500",
              step.state === "current" && "bg-blue-500 ring-2 ring-blue-200",
              step.state === "upcoming" && "bg-slate-200"
            )}
            title={step.label}
          >
            {step.state === "completed" && (
              <Check className="h-3 w-3 text-white" />
            )}
            {step.state === "current" && (
              <Circle className="h-2 w-2 text-white fill-white" />
            )}
            {step.state === "upcoming" && (
              <Circle className="h-2 w-2 text-slate-400" />
            )}
          </div>

          {/* Connecting line */}
          {index < steps.length - 1 && (
            <div
              className={cn(
                "h-0.5 w-8 mx-1",
                step.state === "completed" ? "bg-emerald-500" : "bg-slate-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
