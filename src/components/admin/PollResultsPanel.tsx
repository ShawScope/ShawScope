import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { BarChart3, ChevronDown, Plus, Trash2, Eye, Copy, MessageSquare, X, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Poll {
  id: string;
  question: string;
  options: string[];
  is_active: boolean;
  campaign_id: string | null;
  created_at: string;
  questions?: any[] | null;
  title?: string | null;
}

interface PollResponse {
  id: string;
  poll_id: string;
  selected_option: string;
  comment: string | null;
  respondent_email: string | null;
  respondent_name: string | null;
  created_at: string;
  answers?: Record<string, any> | null;
}

const PollResultsPanel = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [creating, setCreating] = useState(false);
  const [viewingPoll, setViewingPoll] = useState<Poll | null>(null);
  const [responses, setResponses] = useState<PollResponse[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});

  const fetchPolls = async () => {
    const { data } = await supabase
      .from("marketing_polls" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPolls(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchPolls(); }, []);

  const createPoll = async () => {
    const validOptions = newOptions.filter(o => o.trim());
    if (!newQuestion.trim() || validOptions.length < 2) {
      toast.error("Need a question and at least 2 options");
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase
        .from("marketing_polls" as any)
        .insert({
          question: newQuestion.trim(),
          options: validOptions,
        });
      if (error) throw error;
      toast.success("Poll created!");
      setCreateOpen(false);
      setNewQuestion("");
      setNewOptions(["", ""]);
      fetchPolls();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const viewResults = async (poll: Poll) => {
    setViewingPoll(poll);
    const { data } = await supabase
      .from("marketing_poll_responses" as any)
      .select("*")
      .eq("poll_id", poll.id)
      .order("created_at", { ascending: false });
    if (data) {
      setResponses(data as any);
      const counts: Record<string, number> = {};
      (data as any).forEach((r: any) => {
        counts[r.selected_option] = (counts[r.selected_option] || 0) + 1;
      });
      setResponseCounts(counts);
    }
  };

  const togglePollActive = async (poll: Poll) => {
    await supabase
      .from("marketing_polls" as any)
      .update({ is_active: !poll.is_active })
      .eq("id", poll.id);
    toast.success(poll.is_active ? "Poll closed" : "Poll reopened");
    fetchPolls();
  };

  const deletePoll = async (pollId: string) => {
    if (!confirm("Delete this poll and all responses?")) return;
    await supabase.from("marketing_polls" as any).delete().eq("id", pollId);
    toast.success("Poll deleted");
    fetchPolls();
  };

  const getPollLink = (pollId: string) => `${window.location.origin}/poll/${pollId}`;

  const copyPollLink = (pollId: string) => {
    navigator.clipboard.writeText(getPollLink(pollId));
    toast.success("Poll link copied!");
  };

  const copyPollHtml = (poll: Poll) => {
    const baseUrl = `${window.location.origin}/poll/${poll.id}`;
    const buttonsHtml = poll.options.map(opt =>
      `<a href="${baseUrl}?option=${encodeURIComponent(opt)}" style="display:inline-block;padding:10px 20px;margin:4px;background:#292524;color:white;text-decoration:none;border-radius:8px;font-size:14px;">${opt}</a>`
    ).join("\n          ");
    
    const html = `<div style="background:#fafaf9;padding:20px;border-radius:12px;border:1px solid #e7e5e4;margin:16px 0;text-align:center;">
        <p style="font-weight:bold;font-size:16px;margin:0 0 4px;">${poll.question}</p>
        <p style="color:#78716c;font-size:12px;margin:0 0 16px;">Click an option to vote</p>
        <div>
          ${buttonsHtml}
        </div>
      </div>`;
    navigator.clipboard.writeText(html);
    toast.success("Poll HTML copied — paste it into your email body");
  };

  const totalResponses = (pollId: string) => {
    // We'd need response counts per poll; for now count from viewingPoll
    return 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-amber-500" /> Email Polls
        </h3>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> New Poll
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : polls.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No polls yet. Create one and paste the HTML into your campaign emails.</p>
      ) : (
        <div className="space-y-2">
          {polls.map(poll => (
            <div key={poll.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{poll.question}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(parseISO(poll.created_at), "dd MMM yyyy")} · {poll.options.length} options
                  </p>
                </div>
                <Badge variant={poll.is_active ? "default" : "secondary"} className={`text-[10px] shrink-0 ${poll.is_active ? "bg-emerald-600" : ""}`}>
                  {poll.is_active ? "Active" : "Closed"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {poll.options.map((opt, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-muted rounded-full">{opt}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => viewResults(poll)}>
                  <Eye className="h-3 w-3 mr-1" /> Results
                </Button>
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => copyPollHtml(poll)}>
                  <Copy className="h-3 w-3 mr-1" /> Copy HTML
                </Button>
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => copyPollLink(poll.id)}>
                  <Copy className="h-3 w-3 mr-1" /> Link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px] h-7 border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => {
                    navigator.clipboard.writeText(getPollLink(poll.id));
                    toast.success("Social link copied — visitors will be asked for name & email");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Social Link
                </Button>
                <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => togglePollActive(poll)}>
                  {poll.is_active ? "Close" : "Reopen"}
                </Button>
                <Button size="sm" variant="ghost" className="text-[10px] h-7 text-destructive" onClick={() => deletePoll(poll.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Poll Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Create Poll</DialogTitle>
            <DialogDescription>Create a poll and copy the HTML into your marketing email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Question</Label>
              <Input
                placeholder="e.g. Which service would you like to see next?"
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Options</Label>
              <div className="space-y-2 mt-1">
                {newOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={e => {
                        const updated = [...newOptions];
                        updated[i] = e.target.value;
                        setNewOptions(updated);
                      }}
                    />
                    {newOptions.length > 2 && (
                      <Button size="icon" variant="ghost" onClick={() => setNewOptions(prev => prev.filter((_, idx) => idx !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {newOptions.length < 6 && (
                  <Button variant="outline" size="sm" onClick={() => setNewOptions(prev => [...prev, ""])} className="text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Option
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createPoll} disabled={creating} className="bg-amber-600 hover:bg-amber-700">
              {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Create Poll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Poll Results Dialog */}
      <Dialog open={!!viewingPoll} onOpenChange={(open) => { if (!open) setViewingPoll(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Poll Results</DialogTitle>
            <DialogDescription>{viewingPoll?.question}</DialogDescription>
          </DialogHeader>
          {viewingPoll && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground font-medium">{responses.length} total response{responses.length !== 1 ? "s" : ""}</p>

              {/* Multi-question breakdown (if poll has structured questions) */}
              {Array.isArray(viewingPoll.questions) && viewingPoll.questions.length > 0 ? (
                <div className="space-y-5">
                  {viewingPoll.questions.map((q: any, qi: number) => {
                    const isText = q.type === "textarea" || q.type === "text";
                    if (isText) {
                      const textAnswers = responses
                        .map(r => ({ name: r.respondent_name, val: r.answers?.[q.id] }))
                        .filter(x => x.val && String(x.val).trim());
                      return (
                        <div key={qi} className="space-y-2 rounded-lg border p-3">
                          <p className="text-sm font-semibold">{qi + 1}. {q.label}</p>
                          {textAnswers.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No responses</p>
                          ) : (
                            <div className="space-y-1.5">
                              {textAnswers.map((t, ti) => (
                                <div key={ti} className="text-xs bg-muted rounded p-2">
                                  <span className="font-medium">{t.name || "Anonymous"}:</span>{" "}
                                  <span className="italic">"{String(t.val)}"</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // radio / checkbox: tally option counts
                    const counts: Record<string, number> = {};
                    let answered = 0;
                    responses.forEach(r => {
                      const v = r.answers?.[q.id];
                      if (v == null || v === "") return;
                      answered++;
                      if (Array.isArray(v)) v.forEach(opt => { counts[opt] = (counts[opt] || 0) + 1; });
                      else counts[String(v)] = (counts[String(v)] || 0) + 1;
                    });
                    const opts: string[] = Array.isArray(q.options) ? q.options : [];
                    return (
                      <div key={qi} className="space-y-2 rounded-lg border p-3">
                        <p className="text-sm font-semibold">{qi + 1}. {q.label}</p>
                        <p className="text-[10px] text-muted-foreground">{answered} answered</p>
                        <div className="space-y-2">
                          {opts.map((opt, oi) => {
                            const c = counts[opt] || 0;
                            const pct = answered > 0 ? Math.round((c / answered) * 100) : 0;
                            return (
                              <div key={oi} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>{opt}</span>
                                  <span className="text-muted-foreground">{pct}% ({c})</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Legacy single-question bar chart */
                <div className="space-y-3">
                  {viewingPoll.options.map((opt, i) => {
                    const count = responseCounts[opt] || 0;
                    const pct = responses.length > 0 ? Math.round((count / responses.length) * 100) : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{opt}</span>
                          <span className="text-muted-foreground">{pct}% ({count})</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Individual Responses */}
              {responses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Responses</p>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {responses.map(r => (
                      <div key={r.id} className="rounded-lg bg-muted p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{r.respondent_name || "Anonymous"}</span>
                          <Badge variant="outline" className="text-[10px]">{r.selected_option}</Badge>
                        </div>
                        {r.respondent_email && (
                          <p className="text-[10px] text-muted-foreground">{r.respondent_email}</p>
                        )}
                        {r.answers && Object.keys(r.answers).length > 0 && Array.isArray(viewingPoll?.questions) && (
                          <div className="mt-1 space-y-0.5 border-t border-border/50 pt-1.5">
                            {viewingPoll!.questions!.map((q: any, qi: number) => {
                              const v = r.answers?.[q.id];
                              if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return null;
                              return (
                                <p key={qi} className="text-[11px]">
                                  <span className="text-muted-foreground">{q.label}:</span>{" "}
                                  <span className="font-medium">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                                </p>
                              );
                            })}
                          </div>
                        )}
                        {r.comment && (
                          <p className="text-foreground italic">"{r.comment}"</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(r.created_at), "dd MMM yyyy HH:mm")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PollResultsPanel;
