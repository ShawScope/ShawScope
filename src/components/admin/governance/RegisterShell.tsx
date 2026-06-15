import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Inbox } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  count?: number;
  onNew?: () => void;
  newLabel?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  empty?: { title: string; hint?: string };
  isEmpty?: boolean;
}

export const RegisterShell: React.FC<Props> = ({
  title, description, count, onNew, newLabel = "New entry",
  toolbar, children, empty, isEmpty,
}) => (
  <div className="space-y-3">
    <Card className="p-3 sm:p-4 bg-slate-950/60 border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-serif text-lg leading-tight">{title}</h2>
            {typeof count === "number" && (
              <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                {count} record{count === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {toolbar}
          {onNew && (
            <Button size="sm" onClick={onNew} className="bg-amber-500/15 border border-amber-500/40 text-amber-200 hover:bg-amber-500/25 h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> {newLabel}
            </Button>
          )}
        </div>
      </div>
    </Card>
    {isEmpty && empty && (
      <Card className="p-8 bg-slate-950/60 border-slate-800 text-center">
        <Inbox className="h-8 w-8 mx-auto mb-3 text-slate-500" />
        <h3 className="text-sm font-medium">{empty.title}</h3>
        {empty.hint && <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{empty.hint}</p>}
      </Card>
    )}
    {children}
  </div>
);

export const severityTone = (sev: string) => {
  switch (sev) {
    case "critical": return "bg-rose-500/15 text-rose-300 border-rose-500/40";
    case "high": return "bg-orange-500/15 text-orange-300 border-orange-500/40";
    case "medium": return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    case "low": return "bg-sky-500/15 text-sky-300 border-sky-500/40";
    default: return "bg-slate-500/15 text-slate-300 border-slate-500/40";
  }
};

export const statusTone = (status: string) => {
  switch (status) {
    case "open":
    case "active": return "bg-rose-500/15 text-rose-300 border-rose-500/40";
    case "in_progress":
    case "investigating": return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    case "closed":
    case "completed":
    case "resolved":
    case "current": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
    case "overdue": return "bg-rose-500/15 text-rose-300 border-rose-500/40";
    default: return "bg-slate-500/15 text-slate-300 border-slate-500/40";
  }
};

export const logAccess = async (
  supabase: any,
  action: string,
  entity: string,
  details?: Record<string, any>,
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("gov_access_log").insert({
      user_id: user?.id, user_email: user?.email, action, entity, details: details ?? {},
    });
  } catch {/* swallow */}
};