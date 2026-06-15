import SiteLayout from "@/components/SiteLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CalendarDays, Heart, Snowflake, Shield, Trophy, Users, TrendingUp, Home, Lightbulb, GraduationCap, Stethoscope, Building2, Truck, FootprintsIcon, Image, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PageMeta from "@/components/PageMeta";
import mattPortrait from "@/assets/matt-headshot.jpg";
import awardTrophy from "@/assets/award-trophy.jpg";
import mattTreating from "@/assets/matt-treating.jpg";
import mattEvent from "@/assets/matt-event.png";
import shawscopeVan from "@/assets/shawscope-van.jpg";
import mattHomevisit from "@/assets/matt-homevisit.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const sectionLinks = [
  { id: "meet-matt", label: "Meet Matt", icon: Users },
  { id: "journey", label: "Our Journey", icon: TrendingUp },
  { id: "growing", label: "Growing", icon: Lightbulb },
  { id: "values", label: "Values", icon: Heart },
  { id: "awards", label: "Awards", icon: Trophy },
  { id: "visit-us", label: "Visit Us", icon: Home },
  { id: "gallery", label: "Gallery", icon: Image },
];

const milestones = [
  { year: "Sep 2017", text: "Began working in the NHS — building a strong foundation in patient care, communication and clinical safety.", icon: GraduationCap },
  { year: "Mar 2020", text: "Stepped into a Senior Role within private healthcare, developing leadership skills and a deeper understanding of professional standards and client-focused service.", icon: Building2 },
  { year: "Oct 2022", text: "Matt had his own ears cleaned after GPs stopped offering the service — and was shocked that a home visit cost £140. This sparked the idea for ShawScope.", icon: Lightbulb },
  { year: "Nov 2022 – Jan 2023", text: "Attended accredited earwax removal training with TympaHealth in London, accredited by ENT UK.", icon: GraduationCap },
  { year: "Jan 2023", text: "ShawScope saw its very first client after completing all training and assessments — home-visit ear care launches in Dorchester.", icon: Stethoscope },
  { year: "Mid 2023", text: "Joined F.I.T.T Chiropractic, offering earwax removal sessions in their clinic.", icon: Building2 },
  { year: "Aug 2023", text: "Completed an Advanced Cryotherapy Course with Cryostetics in Brighton to expand the range of wellbeing services offered.", icon: Snowflake },
  { year: "Late 2023", text: "ShawScope became fully mobile, bringing care directly to clients across Dorset.", icon: Truck },
  { year: "Dec 2025", text: "Achieved 28th place in the UK Small Business Awards for Best Mobile Business — proudly representing Dorset.", icon: Trophy },
  { year: "Apr 2026", text: "Passed Foot Health Practitioner theory with a Merit — the practical training follows in September 2026.", icon: FootprintsIcon },
  { year: "Sep 2026", text: "Completing the practical Foot Health Practitioner training — professional foot care will be available from your own home.", icon: FootprintsIcon },
];

const values = [
  { icon: Heart, title: "Comfort First", desc: "Every visit is designed to be calm, friendly, and centred around your wellbeing." },
  { icon: Shield, title: "Safety Always", desc: "Strict hygiene standards and responsible boundaries — anything beyond our scope is referred to the right professional." },
  { icon: Home, title: "At Your Door", desc: "No waiting rooms, no travel stress. We bring professional care directly to your home." },
  { icon: Users, title: "Personal Touch", desc: "One-to-one appointments with Matt, tailored to your comfort and individual needs." },
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const AboutPage = () => (
  <SiteLayout>
    <PageMeta
      title="About ShawScope — Mobile Earwax Removal & Cryotherapy Dorset"
      description="Meet Matt Shaw, founder of ShawScope. Award-winning mobile earwax removal and cryotherapy home visits across Dorchester, Weymouth and Dorset since 2023."
      path="/about"
    />
    {/* Hero */}
    <section className="bg-surface-dark py-12 sm:py-20 text-center text-primary-foreground overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="container mx-auto px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-block mb-4"
        >
          <Users className="h-10 w-10 text-secondary" />
        </motion.div>
        <h1 className="font-serif text-4xl sm:text-5xl uppercase tracking-wide">About Us</h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-4 text-primary-foreground/60 max-w-xl mx-auto"
        >
          The story behind ShawScope — and the person behind the service
        </motion.p>
      </motion.div>
    </section>

    {/* Section navigation */}
    <section className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b shadow-sm">
      <div className="container mx-auto max-w-5xl px-4 py-2">
        <div className="flex justify-center">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-0.5 sm:gap-1 w-full max-w-sm sm:max-w-none">
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

    {/* Meet Matt */}
    <section id="meet-matt" className="py-16 scroll-mt-24">
      <div className="container mx-auto max-w-5xl px-4">
        <motion.div {...fadeUp} className="grid gap-10 md:grid-cols-2 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex justify-center"
          >
            <div className="relative w-72 sm:w-80 max-w-full">
              {/* Outer frame */}
              <div className="relative rounded-2xl p-2 bg-gradient-to-br from-secondary/40 via-secondary/15 to-secondary/40 shadow-2xl shadow-black/40">
                {/* Inner mat */}
                <div className="rounded-xl overflow-hidden bg-surface-dark ring-1 ring-secondary/30">
                  <img
                    src={mattPortrait}
                    alt="Matt Shaw, founder of ShawScope — professional headshot"
                    loading="lazy"
                    className="w-full aspect-[4/5] object-cover object-top"
                  />
                </div>
              </div>
              {/* Caption plate */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-[10px] tracking-[0.25em] uppercase font-semibold shadow-lg whitespace-nowrap">
                Matt Shaw · Founder
              </div>
            </div>
          </motion.div>
          <motion.div {...fadeUp} transition={{ delay: 0.2, duration: 0.6 }}>
            <h2 className="font-serif text-2xl mb-4 uppercase tracking-wide">Meet Matt</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Matt Shaw founded ShawScope in 2023 to bring convenient, professional home-visit ear care and cosmetic wellbeing services to the local community. The idea came from a personal experience that highlighted how difficult and costly it had become to access simple earwax removal for everyday comfort and wellbeing. After noticing the gap left when many GP surgeries stopped offering this service, Matt completed recognised training in safe earwax removal through TympaHealth in London.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Matt's healthcare background underpins everything ShawScope does — supporting high standards of professionalism, clear communication, hygiene, safeguarding awareness and infection prevention on every visit. The ShawScope name reflects both the founder's surname and the broad scope of wellbeing-focused services offered.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Our Journey Timeline */}
    <section id="journey" className="bg-muted py-16 scroll-mt-24">
      <div className="container mx-auto max-w-4xl px-4">
        <motion.div {...fadeUp} className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            <TrendingUp className="h-8 w-8 text-secondary" />
          </motion.div>
          <h2 className="font-serif text-3xl uppercase tracking-wide">Our Journey</h2>
          <p className="text-muted-foreground mt-2">From a personal experience to a nationally recognised business</p>
        </motion.div>
        <div className="relative">
          <div className="absolute left-6 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-secondary/30 via-secondary to-secondary/30" />
          {milestones.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative pl-16 md:pl-0 pb-8 last:pb-0 md:w-1/2 ${i % 2 === 0 ? "md:pr-10 md:text-right md:ml-0" : "md:pl-10 md:ml-auto"}`}
            >
              <motion.div
                className={`absolute left-2 md:left-auto ${i % 2 === 0 ? "md:right-[-20px]" : "md:left-[-20px]"} top-1 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg`}
                whileHover={{ scale: 1.2, rotate: 10 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <m.icon className="h-5 w-5" />
              </motion.div>
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-5">
                  <p className="text-xs tracking-widest text-secondary uppercase mb-1 font-bold">{m.year}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Growing with Purpose */}
    <section id="growing" className="py-16 scroll-mt-24">
      <div className="container mx-auto max-w-5xl px-4">
        <motion.div {...fadeUp} className="grid gap-10 md:grid-cols-2 items-center">
          <div className="order-2 md:order-1">
            <h2 className="font-serif text-2xl mb-4 uppercase tracking-wide">Growing with Purpose</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              The aim from the very beginning was to make personal ear cleaning more accessible by providing relaxed, home-based visits for people who appreciate convenience or find travel difficult.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              As ShawScope developed, Matt expanded into cosmetic cryotherapy, offering a simple freezing option for small skin features such as cosmetic skin tags and age-related pigmentation marks that individuals may wish to remove for appearance or personal comfort.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              In 2026, Matt passed the Foot Health Practitioner theory with a Merit. The practical training follows in September 2026, after which professional foot care — including toenail care, callus reduction and corn management — will be available in the comfort of your own home.
            </p>
          </div>
          <motion.div
            className="order-1 md:order-2"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <img src={mattTreating} alt="Matt providing treatment" loading="lazy" className="rounded-2xl shadow-xl w-full h-72 object-cover" />
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Values */}
    <section id="values" className="bg-muted py-16 scroll-mt-24">
      <div className="container mx-auto max-w-4xl px-4">
        <motion.h2 {...fadeUp} className="font-serif text-3xl text-center mb-10 uppercase tracking-wide">
          Our Values
        </motion.h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {values.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 flex gap-4">
                  <motion.div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary/10"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <item.icon className="h-6 w-6 text-secondary" />
                  </motion.div>
                  <div>
                    <h3 className="font-serif text-lg mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Award Banner */}
    <section id="awards" className="relative py-12 bg-gradient-to-r from-secondary/10 via-secondary/5 to-secondary/10 overflow-hidden scroll-mt-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, type: "spring", stiffness: 150 }}
          className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10"
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
          >
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-secondary/20 border-2 border-secondary/30">
              <Trophy className="h-12 w-12 text-secondary" />
              <motion.div
                className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-bold"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, type: "spring", stiffness: 400 }}
              >
                28
              </motion.div>
            </div>
          </motion.div>
          <div className="text-center md:text-left">
            <p className="text-xs tracking-[0.2em] text-secondary uppercase mb-1">Nationally Recognised</p>
            <h2 className="font-serif text-2xl sm:text-3xl tracking-wide mb-2">28th in the UK Small Business Awards 2025</h2>
            <p className="text-muted-foreground text-sm">
              Finalist for <span className="font-semibold text-foreground">Best Mobile Business</span> — proudly representing Dorset
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="hidden md:block"
          >
            <img src={awardTrophy} alt="UK Small Business Awards 2025 Trophy" loading="lazy" className="w-36 h-44 object-cover rounded-xl shadow-lg" />
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Visit Us at Home */}
    <section id="visit-us" className="py-16 scroll-mt-24">
      <div className="container mx-auto max-w-5xl px-4">
        <motion.div {...fadeUp} className="grid gap-10 md:grid-cols-2 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <img
              src="/images/clinic-setup.jpg"
              alt="ShawScope treatment area set up at home"
              loading="lazy"
              className="rounded-2xl shadow-xl w-full h-72 object-cover"
            />
            <img
              src="/images/clinic-lounge.jpg"
              alt="Comfortable waiting area at ShawScope's home location"
              loading="lazy"
              className="rounded-2xl shadow-xl w-full h-48 object-cover mt-3"
            />
          </motion.div>
          <motion.div {...fadeUp} transition={{ delay: 0.2, duration: 0.6 }}>
            <h2 className="font-serif text-2xl mb-4 uppercase tracking-wide">Prefer to Come to Us?</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              On rare occasions, we understand you may prefer not to have a visit in your own home. If you'd rather come to us, we can offer appointments at our home in Broadmayne — available as the <strong>first or last appointment of the day</strong>.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              You'll be welcomed into a quiet, comfortable, and clean space set up for your treatment. Please feel welcome to bring a friend or family member along.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              As we are primarily a home visiting service, this option is available <strong>by request only</strong> — please get in touch by phone or email. Please bear in mind there is usually <strong>at least a one-week wait</strong> to fit you in this way.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/contact">
                <Button variant="outline" className="gap-2">
                  <Phone className="h-4 w-4" /> Get in Touch
                </Button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Photo strip */}
    <section id="gallery" className="py-8 scroll-mt-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {[
            { src: mattEvent, alt: "ShawScope community event" },
            { src: shawscopeVan, alt: "ShawScope mobile service vehicle" },
            { src: mattHomevisit, alt: "Home visit treatment" },
            { src: mattTreating, alt: "Professional care" },
          ].map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="overflow-hidden rounded-xl aspect-square"
            >
              <img src={img.src} alt={img.alt} loading="lazy" className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="bg-surface-dark py-16 text-center text-primary-foreground">
      <motion.div {...fadeUp} className="container mx-auto px-4">
        <h2 className="font-serif text-3xl uppercase tracking-wide mb-4">Ready to Experience ShawScope?</h2>
        <p className="text-primary-foreground/60 mb-8 max-w-md mx-auto">
          As ShawScope evolves, the commitment remains the same: straightforward, accessible, and wellbeing-focused services.
        </p>
        <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
          <Link to="/book">
            <Button
              size="lg"
              className="bg-transparent border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-surface-dark transition-all duration-300"
            >
              <CalendarDays className="mr-2 h-4 w-4" /> Book an Appointment
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  </SiteLayout>
);

export default AboutPage;
