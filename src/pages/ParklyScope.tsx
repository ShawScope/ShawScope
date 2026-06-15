import { useState } from "react";
import { motion } from "framer-motion";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, ClipboardCheck, Users, Stethoscope, BarChart3, Mail,
  MessageSquare, Brain, Headphones, MapPin, FileText, Shield,
  ChevronRight, Sparkles, ArrowRight, Check, Send, Phone
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Calendar,
    title: "Smart Booking System",
    desc: "Patients self-book online with real-time availability, travel-fee estimation, postcode validation, and 15-minute slot holds. Multi-attendee group bookings included."
  },
  {
    icon: ClipboardCheck,
    title: "Digital Consent Forms",
    desc: "Drag-and-drop form builder with conditional logic, e-signatures, and automatic patient reminders. Forms are sent pre-appointment and reviewed in-clinic."
  },
  {
    icon: Stethoscope,
    title: "Consultation Notes",
    desc: "Structured clinical documentation with auto-save, AI dictation, NEWS scoring, and practitioner/patient signature capture — all in one streamlined view."
  },
  {
    icon: Users,
    title: "Patient Records",
    desc: "Complete patient profiles with appointment history, consent responses, clinical files, activity logs, and alert notes. GDPR-compliant data export on demand."
  },
  {
    icon: Headphones,
    title: "Hearing Screening",
    desc: "Built-in pure-tone audiometry screening with audiogram generation, clinical interpretation, and branded PDF reports — ready for GP referral letters."
  },
  {
    icon: Mail,
    title: "Automated Communications",
    desc: "Email and SMS confirmations, reminders, consent nudges, review requests, and aftercare follow-ups — all sent automatically on your schedule."
  },
  {
    icon: BarChart3,
    title: "Marketing Campaigns",
    desc: "Build and send branded email/SMS campaigns with batch scheduling, AI copywriting, delivery tracking, and one-click retry for failed sends."
  },
  {
    icon: Brain,
    title: "AI-Powered Tools",
    desc: "AI consultation dictation, consent form summarisation, clinical letter generation, and a patient-facing chatbot — all built in with no extra cost."
  },
  {
    icon: MapPin,
    title: "Mobile Clinic Optimisation",
    desc: "Route caching, drive-time estimation, travel-fee calculation, and a catchment area map. Designed ground-up for practitioners who travel to patients."
  },
  {
    icon: FileText,
    title: "Referral Management",
    desc: "Draft, preview, and send GP/specialist referral letters with AI assistance. Track referral status and store letter PDFs against patient records."
  },
  {
    icon: Phone,
    title: "AI Phone Receptionist",
    desc: "An AI voice agent answers calls, collects patient details, and creates bookings — so you never miss an enquiry while treating a patient."
  },
  {
    icon: Shield,
    title: "Healthcare-Grade Security",
    desc: "SMS OTP admin login, Row-Level Security on all data, signed-URL file access, encrypted PDF exports, and full patient activity audit logging."
  },
];

const ParklyScope = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [clinic, setClinic] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-form-email", {
        body: {
          to: "matt@shawscope.co.uk",
          subject: `ParklyScope Interest: ${name} — ${clinic || "No clinic name"}`,
          html: `
            <h2>New ParklyScope Registration of Interest</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Clinic/Practice:</strong> ${clinic || "Not provided"}</p>
            <p><strong>Message:</strong></p>
            <p>${message || "No message provided"}</p>
          `,
        },
      });
      if (error) throw error;
      toast.success("Thanks! We'll be in touch soon.");
      setName(""); setEmail(""); setClinic(""); setMessage("");
    } catch {
      toast.error("Something went wrong. Please email matt@shawscope.co.uk directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PageMeta
        title="ParklyScope — Mobile Clinic Management System"
        description="The all-in-one clinic management platform built for mobile healthcare practitioners. Bookings, consent forms, patient records, AI tools and more."
        path="/parklyscope"
      />

      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <span className="text-lg tracking-widest uppercase font-light">
              Parkly<span className="text-amber-400">Scope</span>
            </span>
            <span className="hidden sm:inline text-[10px] text-slate-500 ml-2 tracking-widest uppercase">Mobile Clinic System</span>
          </div>
          <a href="#register" className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
            Register Interest <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-xs tracking-wider uppercase mb-6 border border-amber-400/20">
              <Sparkles className="h-3.5 w-3.5" /> Coming Soon
            </div>
            <h1 className="text-4xl sm:text-6xl font-light tracking-tight mb-6 leading-[1.1]">
              Your clinic.{" "}
              <span className="text-amber-400">Everywhere.</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
              ParklyScope is the all-in-one management platform built from the ground up for mobile healthcare practitioners. Bookings, consent, records, AI — one system, zero faff.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="#register">
                <Button size="lg" className="bg-amber-400 text-slate-950 hover:bg-amber-300 font-medium px-8 gap-2">
                  Register Your Interest <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="#features">
                <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8">
                  See Features
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-12 border-y border-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "12+", label: "Core Modules" },
              { value: "100%", label: "Mobile-First" },
              { value: "AI", label: "Built-In Intelligence" },
              { value: "NHS", label: "Grade Security" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl sm:text-3xl font-light text-amber-400">{stat.value}</div>
                <div className="text-xs text-slate-500 tracking-wider uppercase mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-light mb-3">
              Everything you need.{" "}
              <span className="text-amber-400">Nothing you don't.</span>
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Built by a mobile clinician, for mobile clinicians. Every feature exists because it solved a real problem.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
                className="group p-5 rounded-xl border border-slate-800/60 bg-slate-900/40 hover:border-amber-400/30 hover:bg-slate-900/80 transition-all duration-300"
              >
                <f.icon className="h-5 w-5 text-amber-400 mb-3" />
                <h3 className="font-medium text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-slate-900/30 border-y border-slate-800/50">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-light text-center mb-12">
            How it <span className="text-amber-400">works</span>
          </h2>
          <div className="space-y-8">
            {[
              { step: "1", title: "Sign up", desc: "Register your clinic. We'll configure your branded portal with your services, availability, and catchment area." },
              { step: "2", title: "Go live", desc: "Embed your booking link on your website or share it directly. Patients book, consent forms send automatically, and your calendar fills." },
              { step: "3", title: "Treat & document", desc: "Complete consultations with structured notes, AI dictation, and e-signatures — all from your phone or tablet." },
              { step: "4", title: "Grow", desc: "Use built-in marketing campaigns, review requests, patient recalls, and referral management to scale your practice." },
            ].map((s) => (
              <div key={s.step} className="flex gap-5 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-medium text-sm">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-medium mb-1">{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live proof */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-light mb-4">
            See it in <span className="text-amber-400">action</span>
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            ParklyScope already powers ShawScope — a real mobile ear care and cryotherapy clinic in Dorset. Every feature you see above is battle-tested with real patients, every day.
          </p>
          <a href={import.meta.env.VITE_APP_URL || "https://shawscope.lovable.app"} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2">
              Visit ShawScope <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* Register Interest */}
      <section id="register" className="py-20 px-4 bg-slate-900/30 border-t border-slate-800/50">
        <div className="container mx-auto max-w-lg">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-light mb-3">
              Register your <span className="text-amber-400">interest</span>
            </h2>
            <p className="text-slate-400 text-sm">
              Be among the first to get access. No commitment — just a conversation.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Your Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-amber-400/50"
                  placeholder="Dr. Jane Smith"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Email *</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-amber-400/50"
                  placeholder="jane@clinic.co.uk"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Clinic / Practice Name</label>
              <Input
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-amber-400/50"
                placeholder="e.g. Dorset Mobile Ear Care"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Message (optional)</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-amber-400/50 resize-none"
                placeholder="Tell us about your practice..."
              />
            </div>
            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300 font-medium gap-2"
            >
              {sending ? "Sending..." : <>Send <Send className="h-4 w-4" /></>}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-4 text-[11px] text-slate-600">
            {["No payment required", "No commitment", "Early access priority"].map((t) => (
              <span key={t} className="flex items-center gap-1"><Check className="h-3 w-3 text-amber-400/60" />{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800/50 text-center text-xs text-slate-600">
        <span className="tracking-widest uppercase font-light">
          Parkly<span className="text-amber-400/60">Scope</span>
        </span>
        <span className="mx-2">·</span>
        <span>© {new Date().getFullYear()}</span>
        <span className="mx-2">·</span>
        <a href="mailto:matt@shawscope.co.uk" className="hover:text-slate-400 transition-colors">
          matt@shawscope.co.uk
        </a>
      </footer>
    </div>
  );
};

export default ParklyScope;
