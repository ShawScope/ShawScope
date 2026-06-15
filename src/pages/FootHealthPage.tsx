import { useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import PageMeta from "@/components/PageMeta";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Footprints, CalendarDays, Heart, Mail, Scissors, ShieldCheck,
  Stethoscope, Snowflake, Activity, Syringe, Hand, ChevronRight, CheckCircle,
  Home, GraduationCap, Sparkles, Info, X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import footDiagram from "@/assets/foot-diagram.png";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const sectionLinks = [
  { id: "explore", label: "Explore", icon: Footprints },
  { id: "about-fhp", label: "About FHP", icon: Info },
  { id: "treatments", label: "Treatments", icon: Scissors },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "register", label: "Register", icon: Mail },
];

const treatments = [
  { icon: Scissors, title: "Nail Care & Trimming", desc: "Professional nail cutting, thinning of thickened nails, and prevention of ingrown nails using specialist equipment including nail drills and nippers." },
  { icon: Footprints, title: "Corns & Calluses", desc: "Safe removal of painful corns and hard skin build-up using scalpel techniques, restoring comfort when walking." },
  { icon: Snowflake, title: "Verrucae & Warts", desc: "Treatment of verrucae on the feet using cryotherapy (freezing) and other proven clinical methods." },
  { icon: ShieldCheck, title: "Fungal Infections", desc: "Assessment and management of fungal nail and skin infections with appropriate plan for your visits and aftercare advice." },
  { icon: Activity, title: "Diabetic Foot Assessments", desc: "Specialist screening for diabetic patients including circulation checks, sensation testing, and ongoing monitoring to prevent complications." },
  { icon: Stethoscope, title: "Foot Health Screening", desc: "Comprehensive assessment of your foot health, identifying any concerns early and providing guidance on self-care between visits." },
  { icon: Hand, title: "Padding & Orthotics", desc: "Custom-made detachable padding to help treat and protect a variety of foot conditions, reducing pressure and discomfort." },
  { icon: Syringe, title: "Neuropathy Management", desc: "Assessment and care for patients with peripheral neuropathies, ensuring safe treatment with reduced sensation awareness." },
];

const trainingItems = [
  "Clinical foot assessment",
  "Scalpel techniques",
  "Padding techniques",
  "Use of surgical drills & spray jet",
  "Diagnosis of foot problems",
  "Diabetes mellitus care",
  "Neuropathy management",
  "Care of the elderly patient",
  "Skin allergies",
  "Septic conditions",
  "Disorders of the nail",
  "Treatment of verrucae",
  "Pulse & Doppler techniques",
  "Practice management & insurance",
  "Introduction to cryotherapy",
  "When & how to refer patients",
];

const footHotspots = [
  { id: "nails", label: "Nail Care", icon: Scissors, top: "8%", left: "35%", desc: "Trimming, thinning thickened nails, ingrown nail prevention" },
  { id: "corns", label: "Corns & Calluses", icon: Footprints, top: "30%", left: "18%", desc: "Scalpel removal of corns and hard skin build-up" },
  { id: "verrucae", label: "Verrucae", icon: Snowflake, top: "30%", left: "62%", desc: "Cryotherapy freezing treatment for verrucae & warts" },
  { id: "fungal", label: "Fungal Infections", icon: ShieldCheck, top: "12%", left: "65%", desc: "Assessment and treatment of fungal nail & skin infections" },
  { id: "diabetic", label: "Diabetic Assessment", icon: Activity, top: "55%", left: "20%", desc: "Circulation checks, sensation testing & monitoring" },
  { id: "screening", label: "Foot Screening", icon: Stethoscope, top: "75%", left: "50%", desc: "Comprehensive foot health assessment & early detection" },
  { id: "padding", label: "Padding & Orthotics", icon: Hand, top: "45%", left: "65%", desc: "Custom padding to reduce pressure and discomfort" },
  { id: "neuropathy", label: "Neuropathy Care", icon: Syringe, top: "55%", left: "75%", desc: "Assessment for patients with peripheral neuropathies" },
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const FootHealthPage = () => {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  return (
    <SiteLayout>
      <PageMeta
        title="Foot Health Home Visits Dorset — Coming Late September 2026"
        description="Professional foot health care home visits coming to Dorchester, Weymouth and Dorset in late September 2026. Nail care, corns, calluses, diabetic assessments and more. Register your interest with ShawScope."
        path="/foot-health"
      />

      {/* ── Hero ── */}
      <section className="relative py-12 sm:py-24 text-center text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-surface-dark" />
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full bg-secondary/8 blur-3xl"
            animate={{ scale: [1, 1.3, 1], x: [0, 30, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/5 blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], x: [0, -20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 container mx-auto px-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-secondary/30 bg-secondary/10 mb-4"
          >
            <Footprints className="h-7 w-7 text-secondary" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8, type: "spring", stiffness: 100 }}
            className="font-serif text-3xl sm:text-5xl lg:text-7xl uppercase tracking-wide mb-3"
          >
            Foot Health
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <Badge variant="outline" className="border-secondary/40 text-secondary text-sm tracking-wider px-5 py-1.5 mb-3">
              Coming Late September 2026
            </Badge>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mx-auto max-w-lg text-base sm:text-lg leading-relaxed text-primary-foreground/70 font-light"
          >
            Professional foot care, brought to your home
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/contact">
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-sm tracking-wider uppercase px-8">
                <Mail className="mr-2 h-4 w-4" /> Register Interest
              </Button>
            </Link>
            <Link to="/book">
              <Button size="lg" variant="outline" className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10 text-sm tracking-wider uppercase px-8">
                Browse Other Services <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Section Navigation ── */}
      <section className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto max-w-5xl px-4 py-2">
          <div className="flex justify-center">
            <div className="grid grid-cols-5 gap-0.5 sm:gap-1 w-full max-w-sm sm:max-w-none">
              {sectionLinks.map((s, i) => (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  onClick={() => scrollTo(s.id)}
                  whileHover={{ y: -4 }}
                  className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-all duration-300 group"
                >
                  <motion.div
                    className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-secondary/10 group-hover:bg-secondary/25 group-hover:shadow-md group-hover:shadow-secondary/25 transition-all duration-300 group-hover:scale-110"
                    whileHover={{ rotate: 6 }}
                  >
                    <s.icon className="h-4 w-4 sm:h-6 sm:w-6 text-secondary" />
                  </motion.div>
                  <span className="text-[9px] sm:text-[11px] font-medium text-foreground group-hover:text-secondary transition-colors duration-300 text-center leading-tight">{s.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Foot Diagram ── */}
      <section id="explore" className="py-10 sm:py-16 scroll-mt-24">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} className="text-center mb-6 sm:mb-8">
            <p className="text-xs tracking-[0.25em] text-secondary uppercase mb-3">Explore Our Services</p>
            <h2 className="font-serif text-3xl sm:text-4xl uppercase tracking-wide mb-3">Tap to Explore</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">Tap any icon on the foot to learn about the treatments we'll offer.</p>
          </motion.div>

          {/* Mobile: foot + compact info overlay side by side in a constrained height */}
          <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-12">
            {/* Foot with hotspots - smaller on mobile to leave room for info */}
            <motion.div
              {...fadeUp}
              className="relative w-[200px] sm:w-[260px] lg:w-[300px] shrink-0 mx-auto lg:mx-0"
            >
              <img
                src={footDiagram}
                alt="Foot diagram showing treatment areas"
                className="w-full h-auto opacity-60"
              />
              {footHotspots.map((spot, i) => {
                const Icon = spot.icon;
                const isActive = activeHotspot === spot.id;
                return (
                  <motion.button
                    key={spot.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 200 }}
                    onClick={() => setActiveHotspot(isActive ? null : spot.id)}
                    className={`absolute flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 rounded-full border-2 transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "bg-secondary border-secondary text-secondary-foreground scale-110 shadow-lg shadow-secondary/30"
                        : "bg-card/90 border-secondary/40 text-secondary hover:bg-secondary/20 hover:border-secondary hover:scale-110"
                    }`}
                    style={{ top: spot.top, left: spot.left }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Info panel - compact on mobile */}
            <div className="flex-1 min-h-[120px] sm:min-h-[200px] w-full">
              <AnimatePresence mode="wait">
                {activeHotspot ? (
                  (() => {
                    const spot = footHotspots.find(s => s.id === activeHotspot);
                    if (!spot) return null;
                    const Icon = spot.icon;
                    return (
                      <motion.div
                        key={spot.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="border-secondary/20 shadow-xl">
                          <CardContent className="p-4 sm:p-6 lg:p-8">
                            <div className="flex items-start justify-between mb-2 sm:mb-4">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0">
                                  <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-secondary" />
                                </div>
                                <div>
                                  <h3 className="font-serif text-base sm:text-xl">{spot.label}</h3>
                                  <Badge variant="outline" className="text-[9px] sm:text-[10px] border-secondary/30 text-secondary mt-0.5">Coming Sept 2026</Badge>
                                </div>
                              </div>
                              <button onClick={() => setActiveHotspot(null)} className="text-muted-foreground hover:text-foreground p-1">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{spot.desc}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })()
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center py-4 sm:py-8"
                  >
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center mb-3">
                      <Footprints className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-muted-foreground text-xs sm:text-sm">Tap an icon on the foot to see treatment details</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ── What is an FHP ── */}
      <section id="about-fhp" className="py-16 sm:py-20 bg-card scroll-mt-24">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div {...fadeUp}>
              <p className="text-xs tracking-[0.25em] text-secondary uppercase mb-3">About the Role</p>
              <h2 className="font-serif text-3xl sm:text-4xl uppercase tracking-wide mb-6">What Is a Foot Health Professional?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A Foot Health Professional (FHP) is a trained clinician who helps keep people's feet in a healthy condition. They assess, recognise and treat a wide range of common foot complaints — or refer on to other specialists when needed.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                With people living longer and more active lives, keeping feet healthy is more important than ever. Regular foot care can prevent painful conditions, improve mobility, and enhance quality of life.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Assessment", "Treatment", "Prevention", "Referral"].map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs tracking-wider">
                    {tag}
                  </Badge>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-0 shadow-2xl overflow-hidden">
                <CardContent className="p-8 bg-gradient-to-br from-card to-muted/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Stethoscope className="h-5 w-5 text-secondary" />
                    </div>
                    <h3 className="font-serif text-xl">What Does a Visit Involve?</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      "Thorough assessment of your feet including circulation and sensation checks",
                      "Treatment tailored to your needs — from routine nail care to specific concerns",
                      "Professional-grade, sterilised instruments used in your own home",
                      "Guidance on day-to-day foot care and self-management between visits",
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.4 }}
                        className="flex gap-3"
                      >
                        <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Treatments ── */}
      <section id="treatments" className="py-16 sm:py-20 scroll-mt-24">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="text-xs tracking-[0.25em] text-secondary uppercase mb-3">Services</p>
            <h2 className="font-serif text-3xl sm:text-4xl uppercase tracking-wide mb-4">Treatments Available</h2>
            <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Our foot health service will cover a wide range of common conditions — all delivered in the comfort of your home.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {treatments.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                <Card className="border-border/50 h-full hover:border-secondary/30 transition-all duration-300 group">
                  <CardContent className="p-5 flex gap-4">
                    <motion.div
                      className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-full border border-secondary/20 bg-secondary/10 group-hover:bg-secondary/20 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <item.icon className="h-5 w-5 text-secondary" />
                    </motion.div>
                    <div>
                      <h3 className="font-serif text-base font-medium mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Clinical Training ── */}
      <section id="training" className="py-16 sm:py-20 bg-card scroll-mt-24">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid gap-12 lg:grid-cols-2 items-start">
            <motion.div {...fadeUp}>
              <p className="text-xs tracking-[0.25em] text-secondary uppercase mb-3">Qualifications</p>
              <h2 className="font-serif text-3xl sm:text-4xl uppercase tracking-wide mb-6">Clinical Training & Standards</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Our practitioner is completing professional foot health training through the SMAE Institute — one of the UK's leading providers of foot health education.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The clinical curriculum is extensive and hands-on, ensuring the highest standard of patient care from day one.
              </p>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
                <GraduationCap className="h-6 w-6 text-secondary shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">SMAE Institute</span> — UK's leading foot health training provider
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-0 shadow-2xl">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="h-5 w-5 text-secondary" />
                    <h3 className="font-serif text-lg text-secondary">Clinical Training Includes</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {trainingItems.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.03, duration: 0.3 }}
                        className="flex items-start gap-2 py-1.5"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Why Choose ShawScope (moved near bottom) ── */}
      <section id="why" className="py-16 sm:py-20 scroll-mt-24">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="text-xs tracking-[0.25em] text-secondary uppercase mb-3">Why Choose ShawScope</p>
            <h2 className="font-serif text-3xl sm:text-4xl uppercase tracking-wide">The ShawScope Difference</h2>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Home, title: "Home Visits", desc: "Just like our earwax and cryotherapy services, we come to you — no need to travel to a clinic or wait in queues." },
              { icon: Heart, title: "Wellbeing Focused", desc: "Gentle, patient-centred care designed with your comfort and overall health in mind. We treat the whole person, not just the feet." },
              { icon: ShieldCheck, title: "Professional Standards", desc: "Fully trained, insured, and DBS-checked. Using professional-grade, sterilised instruments for every visit." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
              >
                <Card className="border-border/50 h-full text-center hover:border-secondary/30 transition-all duration-300 group">
                  <CardContent className="p-8">
                    <motion.div
                      className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-secondary/20 bg-secondary/10 mb-5 group-hover:bg-secondary/20 transition-colors"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <item.icon className="h-7 w-7 text-secondary" />
                    </motion.div>
                    <h3 className="font-serif text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="register" className="py-16 sm:py-20 bg-card scroll-mt-24">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div {...fadeUp}>
            <Card className="border-secondary/20 overflow-hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-secondary/5" />
                <CardContent className="relative p-8 sm:p-12 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-secondary/30 bg-secondary/10 mb-6"
                  >
                    <Mail className="h-7 w-7 text-secondary" />
                  </motion.div>
                  <h3 className="font-serif text-2xl sm:text-3xl uppercase tracking-wide mb-3">Want to Be Notified?</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                    Get in touch and let us know you're interested in our upcoming foot health service. We'll keep you updated on our launch date and availability.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/contact">
                      <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-sm tracking-wider uppercase px-8">
                        <Mail className="mr-2 h-4 w-4" /> Contact Us
                      </Button>
                    </Link>
                    <Link to="/book">
                      <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 text-sm tracking-wider uppercase px-8">
                        <CalendarDays className="mr-2 h-4 w-4" /> Browse Other Services
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    </SiteLayout>
  );
};

export default FootHealthPage;
