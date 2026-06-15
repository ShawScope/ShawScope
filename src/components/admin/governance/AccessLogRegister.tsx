import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { History } from "lucide-react";
import { RegisterShell } from "./RegisterShell";

interface Row {
  id: string; user_email: string | null; action: string; entity: string | null;
  entity_id: string | null; details: any; occurred_at: string;
}

const actionTone = (a: string) => {
  if (a === "create") return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";
  if (a === "update") return "border-sky-500/40 text-sky-300 bg-sky-500/10";
  if (a === "delete") return "border-rose-500/40 text-rose-300 bg-rose-500/10";
  return "border-slate-700 text-slate-300";
};

const AccessLogRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("gov_access_log").select("*").order("occurred_at", { ascending: false }).limit(500)
      .then(({ data }) => setRows((data as any) ?? []));
  }, []);

  const filtered = rows.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.user_email ?? "").toLowerCase().includes(s)
      || (r.entity ?? "").toLowerCase().includes(s)
      || r.action.toLowerCase().includes(s);
  });

  return (
    <RegisterShell
      title="Access log"
      description="Append-only audit trail of governance record changes. Retained for CQC inspection and incident investigation."
      count={rows.length}
      toolbar={<Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter by user, entity, action…" className="h-8 w-56" />}
      isEmpty={rows.length === 0}
      empty={{ title: "No access events yet", hint: "Every create / update / delete of a governance record will appear here." }}
    >
      <Card className="p-0 bg-slate-950/60 border-slate-800 overflow-hidden">
        <div className="divide-y divide-slate-800">
          {filtered.map(r => (
            <div key={r.id} className="p-2.5 flex items-start gap-3 text-xs">
              <History className="h-3.5 w-3.5 text-slate-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${actionTone(r.action)}`}>{r.action}</Badge>
                  {r.entity && <span className="font-mono text-slate-300">{r.entity}</span>}
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{r.user_email ?? "system"}</span>
                </div>
                {r.details && Object.keys(r.details).length > 0 && (
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{JSON.stringify(r.details)}</div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground shrink-0">
                {format(parseISO(r.occurred_at), "dd/MM/yyyy HH:mm")}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">No matching events.</div>
          )}
        </div>
      </Card>
    </RegisterShell>
  );
};

export default AccessLogRegister;