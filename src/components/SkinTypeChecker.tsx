import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle, AlertTriangle, RotateCcw, Snowflake } from "lucide-react";

const questions = [
  {
    label: "What is your eye colour?",
    options: [
      { text: "Light Colours", score: 0 },
      { text: "Blue, Grey or Green", score: 1 },
      { text: "Dark", score: 2 },
      { text: "Brown", score: 3 },
      { text: "Black", score: 4 },
    ],
  },
  {
    label: "What is your natural hair colour?",
    options: [
      { text: "Sandy Red", score: 0 },
      { text: "Blonde", score: 1 },
      { text: "Chestnut / Dark Blonde", score: 2 },
      { text: "Brown", score: 3 },
      { text: "Black", score: 4 },
    ],
  },
  {
    label: "Your skin colour?",
    options: [
      { text: "Reddish", score: 0 },
      { text: "Pale", score: 1 },
      { text: "Beige or Olive", score: 2 },
      { text: "Brown", score: 3 },
      { text: "Dark Brown", score: 4 },
    ],
  },
  {
    label: "Freckles (unexposed area)?",
    options: [
      { text: "Many", score: 0 },
      { text: "Several", score: 1 },
      { text: "Few", score: 2 },
      { text: "Rare", score: 3 },
      { text: "None", score: 4 },
    ],
  },
  {
    label: "Stay in the sun too long?",
    options: [
      { text: "Painful Blisters", score: 0 },
      { text: "Mild Blisters / Peeling", score: 1 },
      { text: "Burn / Mild Peeling", score: 2 },
      { text: "Rare", score: 3 },
      { text: "No burning", score: 4 },
    ],
  },
  {
    label: "Do you turn brown?",
    options: [
      { text: "Never", score: 0 },
      { text: "Seldom", score: 1 },
      { text: "Sometimes", score: 2 },
      { text: "Often", score: 3 },
      { text: "Always", score: 4 },
    ],
  },
  {
    label: "Face sensitive to the sun?",
    options: [
      { text: "Very Sensitive", score: 0 },
      { text: "Sensitive", score: 1 },
      { text: "Sometimes", score: 2 },
      { text: "Resistant", score: 3 },
      { text: "Never have a problem", score: 4 },
    ],
  },
  {
    label: "How often do you tan?",
    options: [
      { text: "Never", score: 0 },
      { text: "Seldom", score: 1 },
      { text: "Sometimes", score: 2 },
      { text: "Often", score: 3 },
      { text: "Always", score: 4 },
    ],
  },
  {
    label: "When was your last tan?",
    options: [
      { text: "+3 months ago", score: 0 },
      { text: "2-3 months ago", score: 1 },
      { text: "1-2 months ago", score: 2 },
      { text: "Weeks ago", score: 3 },
      { text: "Days", score: 4 },
    ],
  },
];

const getFitzpatrickType = (score: number) => {
  if (score <= 6) return { type: "Type I", description: "Very fair skin, always burns, never tans" };
  if (score <= 13) return { type: "Type II", description: "Fair skin, burns easily, tans minimally" };
  if (score <= 20) return { type: "Type III", description: "Medium skin, sometimes burns, tans gradually" };
  if (score <= 27) return { type: "Type IV", description: "Olive skin, rarely burns, tans easily" };
  if (score <= 33) return { type: "Type V", description: "Brown skin, very rarely burns, tans very easily" };
  return { type: "Type VI", description: "Dark brown/black skin, never burns, deeply pigmented" };
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const SkinTypeChecker = () => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const score = useMemo(() => {
    let total = 0;
    for (const [qi, text] of Object.entries(answers)) {
      const q = questions[Number(qi)];
      const opt = q.options.find(o => o.text === text);
      if (opt) total += opt.score;
    }
    return total;
  }, [answers]);

  const allAnswered = Object.keys(answers).length === questions.length;
  const fitzType = getFitzpatrickType(score);
  const isHighRisk = score >= 21;

  const handleSubmit = () => {
    setShowResult(true);
    // Scroll to result after render
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const reset = () => {
    setAnswers({});
    setShowResult(false);
  };

  return (
    <section id="skin-check" className="py-16 scroll-mt-24">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.div {...fadeUp} className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            <Activity className="h-8 w-8 text-secondary" />
          </motion.div>
          <h2 className="font-serif text-3xl uppercase tracking-wide">Check Your Skin Type</h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto text-sm">
            Use this quick assessment to find out your Fitzpatrick skin type before booking. This helps you understand if treatment adjustments may be needed.
          </p>
        </motion.div>

        <div className="space-y-4">
          {questions.map((q, qi) => (
            <motion.div
              key={qi}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: qi * 0.05, duration: 0.4 }}
            >
              <Card className={`border-0 shadow-sm transition-opacity ${showResult ? "opacity-60 pointer-events-none" : ""}`}>
                <CardContent className="p-5">
                  <p className="text-sm font-medium mb-3">
                    <span className="text-secondary font-mono mr-2">{qi + 1}.</span>
                    {q.label}
                  </p>
                  <RadioGroup
                    value={answers[qi] || ""}
                    onValueChange={(val) => setAnswers(prev => ({ ...prev, [qi]: val }))}
                    className="flex flex-col gap-1.5"
                  >
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value={opt.text} id={`sq-${qi}-${oi}`} />
                        <Label htmlFor={`sq-${qi}-${oi}`} className="font-normal text-sm flex-1 cursor-pointer">{opt.text}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {!showResult && (
            <motion.div {...fadeUp} className="text-center pt-4">
              <Button
                size="lg"
                disabled={!allAnswered}
                onClick={handleSubmit}
                className="min-w-[200px]"
              >
                <Snowflake className="mr-2 h-4 w-4" />
                See My Result
              </Button>
              {!allAnswered && (
                <p className="text-xs text-muted-foreground mt-2">
                  {Object.keys(answers).length} of {questions.length} answered
                </p>
              )}
            </motion.div>
          )}

          {showResult && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4 pt-4"
            >
              <Card className="border-2 border-secondary shadow-xl">
                <CardContent className="p-8 text-center">
                  <p className="text-xs tracking-widest uppercase text-secondary mb-1">Your Skin Type Score</p>
                  <p className="font-serif text-5xl text-secondary mb-1">{score}</p>
                  <p className="font-serif text-xl">{fitzType.type}</p>
                  <p className="text-sm text-muted-foreground">{fitzType.description}</p>
                </CardContent>
              </Card>

              {isHighRisk ? (
                <Card className="border-2 border-orange-500 bg-orange-500/10">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-6 w-6 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-orange-700 dark:text-orange-400">Treatment Adjustment Likely</p>
                        <ul className="mt-2 text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                          <li>Freezing time will be <strong className="text-foreground">reduced by half</strong> to minimise pigmentation risk</li>
                          <li>A <strong className="text-foreground">follow-up retreatment in approximately 2 weeks</strong> is likely required</li>
                          <li>There is a higher chance of post-inflammatory hyper- or hypo-pigmentation</li>
                        </ul>
                        <p className="mt-3 text-sm text-muted-foreground">
                          Don't worry — this is very common and our practitioner will discuss everything with you. You can still book your appointment as normal.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-2 border-success bg-success/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-success shrink-0" />
                      <div>
                        <p className="font-medium text-success">Standard Treatment Protocol</p>
                        <p className="text-sm text-muted-foreground">
                          Great news! No adjustments are needed for your skin type — standard freezing times will apply.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Try Again
                </Button>
                <Button asChild>
                  <a href="/book">Book Appointment</a>
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SkinTypeChecker;
