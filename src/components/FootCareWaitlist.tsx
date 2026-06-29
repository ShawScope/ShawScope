import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Footprints, CheckCircle, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const pollQuestions = [
  {
    id: "first_assessment",
    question: "How much would you expect to pay for your first full foot health assessment?",
    description: "Includes full examination, treatment plan, and initial nail care or skin treatment.",
    options: ["£30–£40", "£40–£50", "£50–£60", "£60+"],
  },
  {
    id: "nails_only",
    question: "How much would you pay for a toe nail cutting appointment only?",
    description: "Simple nail trim and tidy — no additional treatments.",
    options: ["£20–£25", "£25–£30", "£30–£35", "£35+"],
  },
  {
    id: "routine_treatment",
    question: "What would you expect to pay for a routine treatment visit?",
    description: "e.g. corn removal, callus reduction, or follow-up nail care.",
    options: ["£30–£35", "£35–£40", "£40–£50", "£50+"],
  },
  {
    id: "home_visit_value",
    question: "How important is it that foot care is delivered at home?",
    description: "ShawScope is a home visiting service — we come to you.",
    options: ["Essential — I can't travel", "Very important — much more convenient", "Nice to have", "Not important"],
  },
];

const FootCareWaitlist = () => {
  const [phase, setPhase] = useState<"intro" | "poll" | "details" | "done">("intro");
  const [pollStep, setPollStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentQ = pollQuestions[pollStep];
  const allAnswered = pollQuestions.every(q => answers[q.id]);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("foot_care_waitlist")
        .insert({
          client_name: name.trim(),
          client_email: email.trim().toLowerCase(),
          client_phone: phone.trim() || null,
          poll_responses: answers,
        });
      if (error) throw error;
      setPhase("done");
      toast.success("You're on the waitlist!");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-16 sm:py-20 bg-card">
      <div className="container mx-auto max-w-2xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <Badge className="bg-secondary/10 text-secondary border-secondary/20 mb-4 text-xs tracking-wider uppercase px-3 py-1">
            Coming Soon
          </Badge>
          <h2 className="font-serif text-3xl sm:text-4xl mb-3 tracking-wide uppercase">
            Foot Health <span className="text-secondary">Home Visits</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            We're launching professional foot care home visits in Dorset. More details will be shared here soon.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="py-8 text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                    <Footprints className="h-8 w-8 text-secondary" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    We’ll share availability, pricing, and booking details here as we prepare to launch.
                  </p>
                  <div className="mx-auto mt-4 max-w-sm">
                    <Button asChild variant="secondary" size="lg" className="w-full">
                      <a
                        href="mailto:matt@shawscope.co.uk?subject=Join%20the%20Foot%20Health%20Waitlist&body=Hi%20Matt%2C%0A%0AI%27d%20like%20to%20join%20the%20Foot%20Health%20Home%20Visits%20waitlist.%20Please%20contact%20me%20when%20availability%20opens.%0A%0AName%3A%20%0APhone%3A%20%0AEmail%3A%20%0A%0AThanks!"
                        aria-label="Join our waitlist"
                      >
                        Join our waitlist
                      </a>
                    </Button>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Your email client will open with a pre-filled note. Please include your name, phone number and email address so we can contact you.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === "poll" && currentQ && (
            <motion.div key={`poll-${pollStep}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="py-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Question {pollStep + 1} of {pollQuestions.length}</p>
                    <div className="flex gap-1">
                      {pollQuestions.map((_, i) => (
                        <div key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i <= pollStep ? "bg-secondary" : "bg-muted"}`} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base mb-1">{currentQ.question}</h3>
                    <p className="text-xs text-muted-foreground">{currentQ.description}</p>
                  </div>

                  <RadioGroup
                    value={answers[currentQ.id] || ""}
                    onValueChange={(val) => setAnswers(prev => ({ ...prev, [currentQ.id]: val }))}
                    className="space-y-2"
                  >
                    {currentQ.options.map((opt) => (
                      <Label
                        key={opt}
                        htmlFor={`${currentQ.id}-${opt}`}
                        className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer transition-all ${
                          answers[currentQ.id] === opt
                            ? "border-secondary bg-secondary/5"
                            : "border-border hover:border-secondary/40"
                        }`}
                      >
                        <RadioGroupItem value={opt} id={`${currentQ.id}-${opt}`} />
                        <span className="text-sm">{opt}</span>
                      </Label>
                    ))}
                  </RadioGroup>

                  <div className="flex gap-2">
                    {pollStep > 0 && (
                      <Button variant="outline" onClick={() => setPollStep(s => s - 1)} className="flex-1">
                        <ArrowLeft className="mr-1 h-4 w-4" /> Back
                      </Button>
                    )}
                    <Button
                      className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      disabled={!answers[currentQ.id]}
                      onClick={() => {
                        if (pollStep < pollQuestions.length - 1) {
                          setPollStep(s => s + 1);
                        } else {
                          setPhase("details");
                        }
                      }}
                    >
                      {pollStep < pollQuestions.length - 1 ? "Next" : "Almost done!"} <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === "details" && (
            <motion.div key="details" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="py-6 space-y-5">
                  <div className="text-center">
                    <h3 className="font-serif text-xl mb-1">Nearly There!</h3>
                    <p className="text-xs text-muted-foreground">Leave your details and we'll notify you when foot care launches.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="wl-name" className="text-xs">Full Name *</Label>
                      <Input id="wl-name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="wl-email" className="text-xs">Email *</Label>
                      <Input id="wl-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="wl-phone" className="text-xs">Phone (optional)</Label>
                      <Input id="wl-phone" type="tel" placeholder="07xxx xxx xxx" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10" />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setPhase("poll"); setPollStep(pollQuestions.length - 1); }} className="flex-1">
                      <ArrowLeft className="mr-1 h-4 w-4" /> Back
                    </Button>
                    <Button
                      className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      disabled={submitting || !name.trim() || !email.trim()}
                      onClick={handleSubmit}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {submitting ? "Joining..." : "Join the Waitlist"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="py-10 text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
                  <h3 className="font-serif text-2xl">You're on the List!</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Thank you for your interest in our foot health service. We'll be in touch when bookings open — you'll be among the first to know.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default FootCareWaitlist;
