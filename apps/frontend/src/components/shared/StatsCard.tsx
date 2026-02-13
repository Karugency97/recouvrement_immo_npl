import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  valueColor?: string;
}

export function StatsCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconBgColor,
  iconColor,
  valueColor = "text-foreground",
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${valueColor}`}>{value}</p>
          </div>
          <div
            className={`h-12 w-12 rounded-full ${iconBgColor} flex items-center justify-center`}
          >
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-3">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
