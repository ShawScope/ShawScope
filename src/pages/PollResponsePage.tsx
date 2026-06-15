import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, BarChart3 } from "lucide-react";
import PageMeta from "@/components/PageMeta";

type PollQuestion =
  | { id: string; type: "radio"; label: string; options: string[]; required?: boolean }
  | { id: string; type: "checkbox"; label: string; options: string[]; required?: boolean }
  | { id: string; type: "textarea"; label: string; placeholder?: string; required?: boolean };

const PollResponsePage = () => {
  const { pollId } = useParams<{ pollId: string }>();
  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState("");
  const [comment, setComment] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  // Track whether name/email were pre-filled via the email link.
  // If not, we show input fields (used for social-media / public sharing).
  const [prefilledFromLink, setPrefilledFromLink] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);
  // Multi-question state: { [questionId]: string | string[] }
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  useEffect(() => {
    const fetchPoll = async () => {
      if (!pollId) return;
      const { data } = await supabase
        .from("marketing_polls" as any)
        .select("*")
        .eq("id", pollId)
        .eq("is_active", true)
        .maybeSingle();
      setPoll(data);
      // Pre-fill name/email from query string for marketing emails
      const params = new URLSearchParams(window.location.search);
      const n = params.get("name");
      const e = params.get("email");
      if (n) setRespondentName(n);
      if (e) setRespondentEmail(e);
      if (n || e) setPrefilledFromLink(true);
      setLoading(false);
    };
    fetchPoll();
  }, [pollId]);

  // Pre-select option from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const opt = params.get("option");
    if (opt) setSelectedOption(opt);
  }, []);

  const fetchResults = async () => {
    if (!pollId) return;
    const { data } = await supabase.rpc("get_poll_result_counts" as any, { p_poll_id: pollId });
    if (data) {
      const counts: Record<string, number> = {};
      let total = 0;
      (data as any[]).forEach((r: any) => {
        counts[r.selected_option] = Number(r.vote_count) || 0;
        total += Number(r.vote_count) || 0;
      });
      setResults(counts);
      setTotalVotes(total);
    }
  };

  const handleSubmit = async () => {
    if (!pollId) return;
    const isMulti = Array.isArray(poll?.questions) && poll.questions.length > 0;
    if (!isMulti && !selectedOption) return;

    // For public/social shares (no prefill), require name + valid email
    if (!prefilledFromLink) {
      if (!respondentName.trim()) {
        alert("Please enter your name");
        return;
      }
      if (!respondentEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(respondentEmail.trim())) {
        alert("Please enter a valid email address");
        return;
      }
    }

    // Validate required multi-question answers
    if (isMulti) {
      const questions: PollQuestion[] = poll.questions;
      for (const q of questions) {
        if (!q.required) continue;
        const a = answers[q.id];
        if (q.type === "checkbox") {
          if (!Array.isArray(a) || a.length === 0) {
            alert(`Please answer: ${q.label}`);
            return;
          }
        } else {
          if (!a || (typeof a === "string" && !a.trim())) {
            alert(`Please answer: ${q.label}`);
            return;
          }
        }
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        poll_id: pollId,
        comment: comment.trim() || null,
        respondent_name: respondentName.trim() || null,
        respondent_email: respondentEmail.trim() || null,
      };
      if (isMulti) {
        payload.answers = answers;
        // Use the first radio answer as selected_option for back-compat with results panel
        const firstRadio = (poll.questions as PollQuestion[]).find(q => q.type === "radio");
        payload.selected_option = firstRadio ? String(answers[firstRadio.id] || "") : "multi-question";
      } else {
        payload.selected_option = selectedOption;
      }

      const { error } = await supabase
        .from("marketing_poll_responses" as any)
        .insert(payload);
      if (error) throw error;
      setSubmitted(true);
      // Fire-and-forget admin notification
      try {
        await supabase.functions.invoke("notify-poll-response", {
          body: { poll_id: pollId, answers: isMulti ? answers : { single: selectedOption }, comment, respondent_name: respondentName, respondent_email: respondentEmail },
        });
      } catch (_) { /* non-blocking */ }
      await fetchResults();
    } catch (err: any) {
      console.error("Poll submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-stone-800">Poll Not Found</p>
          <p className="text-sm text-stone-500">This poll may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  const options = (poll.options as any[]) || [];
  const questions: PollQuestion[] = Array.isArray(poll.questions) ? poll.questions : [];
  const isMulti = questions.length > 0;

  const setRadio = (qid: string, val: string) =>
    setAnswers(prev => ({ ...prev, [qid]: val }));
  const toggleCheckbox = (qid: string, val: string) =>
    setAnswers(prev => {
      const cur = Array.isArray(prev[qid]) ? (prev[qid] as string[]) : [];
      return { ...prev, [qid]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
    });
  const setText = (qid: string, val: string) =>
    setAnswers(prev => ({ ...prev, [qid]: val }));

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 [color-scheme:light]">
      <PageMeta title="ShawScope Poll" description="Share your opinion" />
      
      {/* Header */}
      <div className="bg-[#292524] text-white py-6 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-xl font-bold tracking-wide">
            <span className="text-white">SHAW</span>
            <span className="text-[#D4912A]">SCOPE</span>
          </h1>
          <p className="text-xs text-white/60 mt-1">A Home Visiting Service</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 py-8">
        {submitted ? (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-stone-800">Thank You!</h2>
              <p className="text-sm text-stone-600">Your response has been recorded.</p>
              
              {/* Show results */}
              {!isMulti && totalVotes > 0 && (
                <div className="mt-6 text-left space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-stone-500" />
                    <p className="text-sm font-semibold text-stone-700">Results ({totalVotes} vote{totalVotes !== 1 ? "s" : ""})</p>
                  </div>
                  {options.map((opt: string, i: number) => {
                    const count = results[opt] || 0;
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-700 font-medium">{opt}</span>
                          <span className="text-stone-500">{pct}% ({count})</span>
                        </div>
                        <div className="h-2.5 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#D4912A] rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {isMulti && (
                <p className="text-xs text-stone-500 mt-2">Matt will be in touch if you'd like to hear more about the new service.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border-stone-200 shadow-sm">
            <CardContent className="p-6 space-y-6 text-stone-800">
              <div>
                <h2 className="text-lg font-bold text-stone-800">{poll.title || poll.question}</h2>
                <p className="text-xs text-stone-500 mt-1">
                  {poll.description || (isMulti ? "Just a few quick questions — takes 2 minutes." : "Select an option and submit your response")}
                </p>
              </div>

              {isMulti ? (
                <div className="space-y-6">
                  {questions.map((q, qi) => (
                    <div key={q.id} className="space-y-2">
                      <Label className="text-sm font-semibold text-stone-800">
                        {qi + 1}. {q.label}
                        {q.required && <span className="text-rose-500 ml-1">*</span>}
                      </Label>
                      {q.type === "radio" && (
                        <RadioGroup
                          value={(answers[q.id] as string) || ""}
                          onValueChange={(v) => setRadio(q.id, v)}
                          className="space-y-2"
                        >
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center space-x-3 rounded-lg border p-2.5 hover:bg-stone-50 cursor-pointer transition-colors">
                              <RadioGroupItem value={opt} id={`${q.id}-${oi}`} />
                              <Label htmlFor={`${q.id}-${oi}`} className="flex-1 cursor-pointer text-sm text-stone-700">
                                {opt}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                      {q.type === "checkbox" && (
                        <div className="space-y-2">
                          {q.options.map((opt, oi) => {
                            const cur = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
                            const checked = cur.includes(opt);
                            return (
                              <label key={oi} className="flex items-center space-x-3 rounded-lg border p-2.5 hover:bg-stone-50 cursor-pointer transition-colors">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleCheckbox(q.id, opt)}
                                  id={`${q.id}-${oi}`}
                                />
                                <span className="flex-1 text-sm text-stone-700">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      {q.type === "textarea" && (
                        <Textarea
                          placeholder={q.placeholder || ""}
                          value={(answers[q.id] as string) || ""}
                          onChange={(e) => setText(q.id, e.target.value)}
                          className="min-h-[80px] bg-white text-stone-900 placeholder:text-stone-400 border-stone-300"
                          maxLength={1000}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="space-y-3">
                  {options.map((opt: string, i: number) => (
                    <div key={i} className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-stone-50 cursor-pointer transition-colors">
                      <RadioGroupItem value={opt} id={`opt-${i}`} />
                      <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer text-sm font-medium text-stone-700">
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {/* Show name/email inputs only for public/social shares (when not pre-filled from email link) */}
              {!prefilledFromLink && (
                <div className="space-y-3 rounded-lg bg-stone-50 border border-stone-200 p-3">
                  <div>
                    <Label className="text-xs text-stone-600">Your name <span className="text-rose-500">*</span></Label>
                    <Input
                      placeholder="Full name"
                      value={respondentName}
                      onChange={e => setRespondentName(e.target.value)}
                      className="mt-1 bg-white text-stone-900 placeholder:text-stone-400 border-stone-300"
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-stone-600">Your email <span className="text-rose-500">*</span></Label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={respondentEmail}
                      onChange={e => setRespondentEmail(e.target.value)}
                      className="mt-1 bg-white text-stone-900 placeholder:text-stone-400 border-stone-300"
                      maxLength={200}
                    />
                  </div>
                  <p className="text-[11px] text-stone-500">We'll only use this to follow up about this service.</p>
                </div>
              )}

              {!isMulti && (
                <div>
                  <Label className="text-xs text-stone-600">Add a comment (optional)</Label>
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    className="mt-1 min-h-[80px] bg-white text-stone-900 placeholder:text-stone-400 border-stone-300"
                    maxLength={500}
                  />
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={(!isMulti && !selectedOption) || submitting}
                className="w-full bg-[#292524] hover:bg-[#1c1917] text-white"
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit Response
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PollResponsePage;
