import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type DraftKind = "policy" | "continuity" | "risk_assessment";

interface Props {
  kind: DraftKind;
  /** Receives the AI draft fields and should pre-populate the create dialog */
  onDraft: (draft: { title: string; body: string; meta?: Record<string, any> }) => void;
  className?: string;
}

const LABEL: Record<DraftKind, string> = {
  policy: "Draft a policy",
  continuity: "Draft a continuity plan",
  risk_assessment: "Draft a risk assessment",
};

const PLACEHOLDER: Record<DraftKind, string> = {
  policy: "e.g. Infection prevention & control policy",
  continuity: "e.g. What to do if my van breaks down",
  risk_assessment: "e.g. Lone working in patients' homes",
};

const AIDraftButton: React.FC<Props> = ({ kind, onDraft, className }) => {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [extras, setExtras] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!topic.trim()) { toast.error("Tell me the topic"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("governance-ai-writer", {
        body: { kind, topic: topic.trim(), extras: extras.trim() },
      });
      if (error) throw error;
      if (!data?.title || !data?.body) throw new Error("AI did not return a draft");
      onDraft({ title: data.title, body: data.body, meta: data.meta });
      toast.success("Draft ready — review and save");
      setOpen(false);
      setTopic(""); setExtras("");
    } catch (e: any) {
      toast.error(e.message ?? "AI draft failed");
    }
    setLoading(false);
  };

  return (
    <>
      <Button
        type="button" size="sm" variant="outline"
        className={`h-8 bg-violet-500/10 border-violet-500/40 text-violet-200 hover:bg-violet-500/20 ${className ?? ""}`}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-3.5 w-3.5 mr-1" /> Draft with AI
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-400" /> {LABEL[kind]}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Topic *</Label>
              <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder={PLACEHOLDER[kind]} />
            </div>
            <div>
              <Label>Anything specific to include? (optional)</Label>
              <Textarea rows={3} value={extras} onChange={e => setExtras(e.target.value)}
                placeholder="Specifics, your own way of doing things, equipment used, etc." />
            </div>
            <p className="text-[11px] text-muted-foreground">
              The AI will draft a ShawScope-branded document tailored to a sole-practitioner home-visiting service.
              You'll be able to edit before saving.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={generate} disabled={loading} className="bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30">
              {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              {loading ? "Drafting…" : "Generate draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIDraftButton;