import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, Plus, X, ChevronDown, ListChecks, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Suggestion<T = any> {
  key: string;
  label: string;
  hint?: string;
  matches: (rows: T[]) => T | undefined;
}

interface Props<T> {
  storageKey: string;       // e.g. "risk", "audits", "continuity", "policies"
  title?: string;
  suggestions: Suggestion<T>[];
  rows: T[];
  onAdd: (suggestion: Suggestion<T>) => void;
  onOpenMatch?: (matched: T, suggestion: Suggestion<T>) => void;
  matchLabel?: (matched: T) => string;
}

const LS_KEY = (k: string) => `shawscope:suggested_dismissed:${k}`;

export function SuggestedChecklist<T>({
  storageKey, title, suggestions, rows, onAdd, onOpenMatch, matchLabel,
}: Props<T>) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY(storageKey));
      setDismissed(raw ? JSON.parse(raw) : []);
    } catch { setDismissed([]); }
  }, [storageKey]);

  const persist = (next: string[]) => {
    setDismissed(next);
    try { localStorage.setItem(LS_KEY(storageKey), JSON.stringify(next)); } catch {}
  };

  const decorated = useMemo(() => suggestions.map(s => ({
    suggestion: s,
    matched: s.matches(rows),
    isDismissed: dismissed.includes(s.key),
  })), [suggestions, rows, dismissed]);

  // Active = visible (not manually dismissed AND not already matched -> still pending)
  const visible = decorated.filter(d => !d.isDismissed);
  const pending = visible.filter(d => !d.matched);
  const total = suggestions.length;
  const complete = total - pending.length;
  const pct = total ? Math.round((complete / total) * 100) : 0;

  // Hide the card entirely if everything is either matched or manually hidden
  if (visible.length === 0) {
    return (
      <Card className="p-3 bg-emerald-500/5 border-emerald-500/30">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <Check className="h-4 w-4 text-emerald-400" />
            <span className="font-medium text-emerald-200">Suggested checklist complete</span>
            <span className="text-muted-foreground">— all {total} items in place or dismissed</span>
          </div>
          {dismissed.length > 0 && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => persist([])}>
              <RotateCcw className="h-3 w-3 mr-1" /> Reset dismissed
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 bg-slate-950/60 border-amber-500/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between gap-2 text-left">
            <div className="flex items-center gap-2 min-w-0">
              <ListChecks className="h-4 w-4 text-amber-300 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-amber-200">
                  {title ?? "Suggested for an independent earwax practitioner"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {complete} of {total} in place
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:block w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-200 bg-amber-500/5">{pct}%</Badge>
              <ChevronDown className={cn("h-4 w-4 text-amber-300 transition-transform", open ? "rotate-180" : "")} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2 space-y-1">
          {decorated.map(({ suggestion, matched, isDismissed }) => {
            if (isDismissed) return null;
            const done = !!matched;
            return (
              <div
                key={suggestion.key}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-md border",
                  done
                    ? "bg-emerald-500/5 border-emerald-500/30"
                    : "bg-slate-900/40 border-slate-800",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0",
                    done ? "bg-emerald-500/20 border-emerald-500/60" : "border-slate-600",
                  )}
                >
                  {done && <Check className="h-3 w-3 text-emerald-300" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-xs leading-tight", done ? "text-emerald-100" : "text-slate-200")}>
                    {suggestion.label}
                  </div>
                  {done && matched && matchLabel && (
                    <button
                      type="button"
                      onClick={() => onOpenMatch?.(matched, suggestion)}
                      className="text-[10px] text-emerald-300/80 hover:text-emerald-200 underline-offset-2 hover:underline mt-0.5"
                    >
                      Linked to: {matchLabel(matched)}
                    </button>
                  )}
                  {!done && suggestion.hint && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">{suggestion.hint}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!done && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] border-amber-500/40 text-amber-200 bg-amber-500/10 hover:bg-amber-500/20"
                      onClick={() => onAdd(suggestion)}
                    >
                      <Plus className="h-3 w-3 mr-0.5" /> Add
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Hide suggestion"
                    onClick={() => persist([...dismissed, suggestion.key])}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}

          {dismissed.length > 0 && (
            <div className="pt-1">
              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground" onClick={() => persist([])}>
                <RotateCcw className="h-3 w-3 mr-1" /> Restore {dismissed.length} hidden item{dismissed.length === 1 ? "" : "s"}
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default SuggestedChecklist;