import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Shield, FileText, Clock, Ear, Snowflake, Footprints, ChevronRight, MapPin, Star, ExternalLink, Quote, Award, Trophy, Stethoscope, Truck, CheckCircle, PoundSterling, Navigation, Car, Eye, EyeOff, Lock, Radio, Home, Cat, Baby, ParkingCircle, ArrowUpRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import SiteLayout from "@/components/SiteLayout";
import PageMeta from "@/components/PageMeta";
import NoticeBanner from "@/components/NoticeBanner";
import TravelFeeCalculator from "@/components/TravelFeeCalculator";
import HowItWorks from "@/components/HowItWorks";
import PaymentMethodsBadge from "@/components/PaymentMethodsBadge";
// mattPortrait removed — no longer used in intro section
import awardTrophy from "@/assets/award-trophy.jpg";
import mattTreating from "@/assets/matt-treating.jpg";
import mattEquipment from "@/assets/matt-equipment.jpg";
import mattEvent from "@/assets/matt-event.png";
import shawscopeVan from "@/assets/shawscope-van.jpg";
import mattHomevisit from "@/assets/matt-homevisit.jpg";
import mattHomevisit2 from "@/assets/matt-homevisit2.jpg";
import mattShawscopeHome from "@/assets/matt-shawscope-portrait.png";
import cryoTreatment from "@/assets/cryo-treatment.png";
import heroVideo from "@/assets/hero-video.mp4";
import BloodTestingPromo from "@/components/BloodTestingPromo";
import FootCareWaitlist from "@/components/FootCareWaitlist";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
}

const serviceIcons: Record<string, any> = {
  "earwax": Ear,
  "cryo": Snowflake,
  "foot": Footprints,
  "wellness": Stethoscope
};

const getIcon = (name: string) => {
  const lower = name.toLowerCase();
  for (const [key, Icon] of Object.entries(serviceIcons)) {
    if (lower.includes(key)) return Icon;
  }
  return CalendarDays;
};

const GOOGLE_REVIEWS_URL = "https://www.google.com/search?sca_esv=467342054b4434cd&hl=en-GB&biw=1912&bih=948&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOXcMjxWu1wkof_5bCjiVrx2781h6Nu0zeA_VxTWxzpHBd-Kqq57DKyFG5PSXPiRx_xUqApEs1kwauygQCDl56pfsiOh5uXr6uWrTrmA-6b4Oi_ctQZG1eLrL95bD3TapCmGe43M%3D&q=ShawScope+Earwax+Removal+%26+Cryotherapy+Reviews&sa=X&ved=2ahUKEwiY-fL60eGSAxUYXUEAHa61ODQQ0bkNegQIHxAH";

const reviews = [
{
  name: "Sarah M.",
  text: "Matt was fantastic — professional, gentle, and made me feel completely at ease. My hearing improved immediately after the earwax removal. Highly recommend ShawScope!",
  rating: 5
},
{
  name: "David P.",
  text: "Brilliant home visit service. Matt arrived on time, explained everything clearly, and the whole process was quick and painless. Five stars all round!",
  rating: 5
},
{
  name: "Linda T.",
  text: "I was nervous about cryotherapy but Matt was so reassuring and professional. The skin tag was gone in seconds. Such a convenient service coming to your home.",
  rating: 5
}];


const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.12 } },
  viewport: { once: true }
};

const Index = () => {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    supabase.from("services").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      if (data) setServices(data as Service[]);
    });
  }, []);

  return (
    <SiteLayout>
      <PageMeta
        title="Earwax Removal & Cryotherapy Home Visits"
        description="Home-visit earwax removal, cryotherapy and hearing care across Dorchester, Weymouth and Dorset. Book online today."
        path="/" />
      
      {/* Hero */}
      <section className="relative py-16 sm:py-28 lg:py-36 text-center text-primary-foreground overflow-hidden">
        {/* Hero background video with edge-blur mask */}
        <video
          src={heroVideo}
          poster={mattHomevisit}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover max-sm:object-[55%_center]"
          style={{
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 80% at 50% 50%, #000 45%, rgba(0,0,0,0.6) 75%, transparent 100%)",
            maskImage:
              "radial-gradient(ellipse 75% 80% at 50% 50%, #000 45%, rgba(0,0,0,0.6) 75%, transparent 100%)",
          }}
        />
        <div className="absolute inset-0 bg-surface-dark/75 backdrop-blur-[2px]" />
        {/* Animated accent elements */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-secondary/8 blur-3xl"
            animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
          
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/5 blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], x: [0, -20, 0], y: [0, 30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
          
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 container mx-auto px-4">
          
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "4rem" }}
            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            className="h-px bg-secondary mx-auto mb-6" />
          
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.1em" }}
            animate={{ opacity: 1, letterSpacing: "0.3em" }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-4 text-xs text-secondary uppercase">
            
            Welcome to
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, type: "spring", stiffness: 100 }}
            className="mb-3 text-center text-4xl leading-tight sm:text-5xl lg:text-8xl tracking-[0.15em] uppercase"
            style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 300, letterSpacing: "0.15em" }}>
            
            <span className="text-primary-foreground font-bold">Shaw</span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-secondary font-bold">
              Scope
            </motion.span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="flex items-center justify-center gap-3 sm:gap-5 mb-3 sm:mb-4"
          >
            <span className="h-px w-10 sm:w-16 bg-secondary" />
            <span className="text-primary-foreground text-[11px] sm:text-sm md:text-base tracking-[0.35em] uppercase font-medium">
              Home Visiting Service
            </span>
            <span className="h-px w-10 sm:w-16 bg-secondary" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
            className="text-center text-[10px] sm:text-xs tracking-[0.5em] text-secondary uppercase mb-2 sm:mb-3"
          >
            Est. 2023
          </motion.p>

          <motion.svg
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.85, duration: 0.9, ease: "easeOut" }}
            viewBox="0 0 300 20"
            preserveAspectRatio="none"
            className="mx-auto mb-4 sm:mb-6 h-3 w-48 sm:w-72 origin-center"
            aria-hidden="true"
          >
            <path
              d="M2 4 Q150 22 298 4"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </motion.svg>

          <p className="sr-only">
            Earwax Removal, Cryotherapy &amp; Foot Care home visits — Dorchester &amp; Dorset
          </p>

          {/* Service links + tagline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.7 }}
            className="mx-auto mt-1 sm:mt-2 flex max-w-xs flex-col items-center gap-1.5 sm:gap-2"
          >
            <Link
              to="/earwax-removal"
              className="text-xs sm:text-sm font-semibold text-primary-foreground tracking-[0.18em] uppercase transition-colors hover:text-secondary"
            >
              Earwax Removal
            </Link>
            <span className="h-1 w-1 rounded-full bg-primary-foreground/25" />
            <Link
              to="/cryotherapy"
              className="text-xs sm:text-sm font-semibold text-primary-foreground tracking-[0.18em] uppercase transition-colors hover:text-secondary"
            >
              Cryotherapy
            </Link>
            <span className="h-1 w-1 rounded-full bg-primary-foreground/25" />
            <Link to="/foot-health" className="flex flex-col items-center group">
              <span className="text-xs sm:text-sm font-bold text-secondary tracking-[0.18em] uppercase transition-colors group-hover:text-secondary/80">
                Foot Care
              </span>
              <span className="mt-1 rounded border border-secondary/40 px-2 py-0.5 text-[9px] sm:text-[10px] font-normal uppercase tracking-[0.15em] text-primary-foreground/70">
                Starting Sep 26
              </span>
            </Link>

            <p className="mt-2 sm:mt-4 border-t border-primary-foreground/10 pt-2 sm:pt-3 text-[10px] font-normal tracking-[0.25em] text-secondary/70 uppercase text-center">
              Home visits across Dorchester, Weymouth &amp; surrounding areas
            </p>
          </motion.div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="mx-auto mt-4 sm:mt-6 max-w-lg"
          >
            <p className="text-lg sm:text-xl md:text-2xl leading-snug sm:leading-relaxed font-extralight tracking-wide text-primary-foreground/90">
              <span className="text-secondary font-light">Comfort</span> &amp;{" "}
              <span className="text-secondary font-light">Wellbeing</span>
              <span className="block mt-1 text-base sm:text-lg md:text-xl text-primary-foreground/60 tracking-[0.15em] uppercase font-normal">
                Brought to Your Home
              </span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link to="/book">
              <Button
                size="lg"
                className="subtle-pulse glass-btn-amber transition-all duration-300 text-sm tracking-wider uppercase px-6 sm:px-8 font-bold h-11 sm:h-12">
                <CalendarDays className="mr-2 h-4 w-4" /> Book Now
              </Button>
            </Link>
            <Link to="/about">
              <Button
                size="lg"
                variant="outline"
                className="glass-btn transition-all duration-300 text-sm tracking-wider uppercase px-6 sm:px-8 h-11 sm:h-12">
                About Us <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>


      {/* Introduction & Services Section */}
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div className="container mx-auto max-w-5xl px-4 relative z-10">
          {/* Introduction */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16">
            
            <p className="text-xs tracking-[0.25em] text-secondary uppercase mb-3 font-medium">Local &amp; Independent</p>
            <h2 className="font-serif text-3xl sm:text-4xl tracking-wide text-foreground mb-6">
              Built From the Ground Up
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "5rem" }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="h-px bg-secondary mx-auto mb-8" />
            
            <motion.img
              src={mattShawscopeHome}
              alt="Matt from ShawScope"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="mx-auto mb-8 w-full max-w-sm"
              style={{
                WebkitMaskImage:
                  "radial-gradient(ellipse 75% 80% at 50% 50%, #000 55%, rgba(0,0,0,0.7) 75%, transparent 100%)",
                maskImage:
                  "radial-gradient(ellipse 75% 80% at 50% 50%, #000 55%, rgba(0,0,0,0.7) 75%, transparent 100%)",
              }}
              loading="lazy" />
            
            <div className="max-w-3xl mx-auto space-y-4 text-muted-foreground leading-relaxed">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}>
                
                ShawScope isn't a franchise or a chain — it's a one-man local business, founded by Matt Shaw in Dorchester in 2023 and built entirely from scratch. Matt brings a strong focus on professionalism, safety, hygiene and clear communication to every visit — and it's always Matt who turns up at your door.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35, duration: 0.5 }}>
                
                What started with a simple mission — to make ear care more accessible, affordable and comfortable — has grown into a trusted local wellbeing service covering ear hygiene, cosmetic cryotherapy and soon foot care. Every step has been self-funded and driven by genuine care for the people of Dorset.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-foreground font-medium">
                
                When you book with ShawScope, you're not just choosing a service — you're supporting a local, independent practitioner who takes real pride in every visit.
              </motion.p>
            </div>
          </motion.div>

          {/* Service Pills */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-12">
            {[
            { icon: Ear, title: "Earwax Removal", link: "/earwax-removal" },
            { icon: Snowflake, title: "Cryotherapy", link: "/cryotherapy" },
            { icon: Footprints, title: "Foot Health", link: "/foot-health" },
            { icon: Stethoscope, title: "Ear Advice", link: "/ear-advice" }].
            map((item, i) =>
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.35 }}>
              
                <Link
                to={item.link}
                className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 hover:border-secondary/40 hover:bg-secondary/5 transition-all duration-300 shadow-sm hover:shadow-md">
                
                  <item.icon className="h-4 w-4 text-secondary" />
                  <span className="text-sm font-medium text-foreground group-hover:text-secondary transition-colors whitespace-nowrap">{item.title}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-secondary group-hover:translate-x-0.5 transition-all" />
                </Link>
              </motion.div>
            )}
          </div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 pt-6 border-t border-border/50">
            
            {[
            { icon: Shield, label: "Fully Insured" },
            { icon: Truck, label: "Home Visits" },
            { icon: Trophy, label: "Award Finalist" },
            { icon: CheckCircle, label: "DBS Checked" }].
            map((item, i) =>
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
              className="flex items-center gap-2 text-muted-foreground">
              
                <item.icon className="h-4 w-4 text-secondary" />
                <span className="text-sm font-medium">{item.label}</span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Award Banner */}
      <section className="relative py-12 bg-gradient-to-r from-secondary/10 via-secondary/5 to-secondary/10 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, type: "spring", stiffness: 150 }}
            className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
            
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
              className="relative">
              
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary/20 border-2 border-secondary/30">
                <Trophy className="h-12 w-12 text-secondary" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-bold"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, type: "spring", stiffness: 400 }}>
                
                28
              </motion.div>
            </motion.div>
            <div className="text-center md:text-left">
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-xs tracking-[0.2em] text-secondary uppercase mb-1">
                
                Nationally Recognised
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="font-serif text-2xl sm:text-3xl tracking-wide mb-2">
                
                28th in the UK Small Business Awards 2025
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-muted-foreground text-sm">
                
                Finalist for <span className="font-semibold text-foreground">Best Mobile Business</span> — proudly representing Dorset on a national stage
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="hidden md:block">
              
              <img src={awardTrophy} alt="UK Small Business Awards 2025 Trophy" loading="lazy" className="w-36 h-44 object-cover rounded-xl shadow-lg" />
            </motion.div>
          </motion.div>
        </div>
      </section>


      {/* Why Choose ShawScope */}
      <section className="bg-surface-dark py-16 text-primary-foreground">
        <div className="container mx-auto px-4">
          <motion.h2
            {...fadeUp}
            className="mb-6 text-center font-serif text-3xl uppercase tracking-wide text-white">
            
            Why Choose ShawScope?
          </motion.h2>
          <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.6 }} className="max-w-3xl mx-auto mb-10">
            <p className="text-center text-primary-foreground/70 leading-relaxed">
              At ShawScope, we provide wellbeing-focused ear cleaning and cosmetic cryotherapy for harmless, surface-level skin features that people choose to remove for comfort or appearance. Our service is designed to be gentle, reassuring, and convenient, bringing a high standard of personal care directly to your home.
            </p>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
            {[
            { icon: Truck, title: "Mobile Service", desc: "Professional care delivered in the comfort and convenience of your own home. Our mobile visits are ideal for those who value ease, flexibility, and a calm service." },
            { icon: Shield, title: "Safe & Professional", desc: "Led by Matt with a strong focus on safe practice, hygiene and infection prevention. Client comfort and safety are always prioritised." },
            { icon: FileText, title: "Simple Booking", desc: "Easy online scheduling with digital consent forms. Everything we offer is transparent, fairly priced, and focused on personal comfort." }].
            map((item, i) =>
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="flex flex-col items-center text-center group">
              
                <motion.div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-foreground/10 group-hover:bg-primary-foreground/20 transition-colors duration-300"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}>
                
                  <item.icon className="h-7 w-7 text-secondary" />
                </motion.div>
                <h3 className="mb-2 font-serif text-lg">{item.title}</h3>
                <p className="text-sm text-primary-foreground/60 leading-relaxed">{item.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Visit Tracking Feature Showcase */}
      <section className="bg-surface-dark py-20 text-primary-foreground overflow-hidden relative">
        {/* Subtle animated background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-secondary/5 blur-3xl"
            animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />
          
        </div>

        <div className="container mx-auto max-w-6xl px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}>
              
              <p className="text-xs tracking-[0.25em] text-secondary uppercase mb-3 font-medium">A ShawScope Exclusive</p>
              <h2 className="font-serif text-3xl sm:text-4xl tracking-wide mb-6">
                Live Visit Tracking
              </h2>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "4rem" }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="h-px bg-secondary mb-8" />
              
              <p className="text-primary-foreground/70 leading-relaxed mb-8">
                On the day of your appointment, you'll receive a personalised tracking link. See exactly where you are in the day's route, get a live ETA, and know when Matt is on his way — all from your phone, no app required.
              </p>

              <div className="space-y-5">
                {[
                {
                  icon: Radio,
                  title: "Live ETA Updates",
                  desc: "Real-time estimated arrival times that refresh automatically using live traffic data."
                },
                {
                  icon: Navigation,
                  title: "Route Progress",
                  desc: "See how many visits are ahead of yours and track the day's schedule as it unfolds."
                },
                {
                  icon: Lock,
                  title: "Privacy by Design",
                  desc: "Locations are deliberately offset and shown as approximate areas — never exact addresses. Other patients' details are completely hidden."
                },
                {
                  icon: EyeOff,
                  title: "Auto-Expires",
                  desc: "Once your visit is complete, the tracking page deactivates immediately. No lingering access to any data."
                }].
                map((item, i) =>
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                  className="flex gap-4 group">
                  
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-foreground/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors duration-300">
                      <item.icon className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-foreground mb-0.5">{item.title}</h3>
                      <p className="text-sm text-primary-foreground/50 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Right: Phone mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex justify-center">
              
              <div className="relative">
                {/* Phone frame */}
                <div className="w-[280px] sm:w-[300px] rounded-[2.5rem] border-[6px] border-primary-foreground/20 bg-stone-50 p-1 shadow-2xl shadow-black/30">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-primary-foreground/20 rounded-b-2xl z-20" />
                  
                  {/* Screen content */}
                  <div className="rounded-[2rem] overflow-hidden bg-stone-50">
                    {/* Header */}
                    <div className="bg-stone-800 text-white text-center py-4 px-4">
                      <p className="text-[9px] tracking-[3px] uppercase opacity-60 mb-0.5">ShawScope</p>
                      <p className="text-sm font-serif font-semibold">Visit Tracker</p>
                    </div>

                    <div className="px-4 py-4 space-y-3">
                      {/* Greeting */}
                      <div className="text-center">
                        <p className="text-[11px] text-stone-500">Hi <span className="text-stone-800 font-semibold">Sarah</span></p>
                        <p className="text-lg font-bold text-stone-800">You are visit 3 of 5</p>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between text-[9px] text-stone-400 mb-1">
                          <span>2 completed</span>
                          <span>3 remaining</span>
                        </div>
                        <div className="h-2.5 bg-stone-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-secondary rounded-full"
                            initial={{ width: "0%" }}
                            whileInView={{ width: "40%" }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }} />
                          
                        </div>
                      </div>

                      {/* ETA badge */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.2, duration: 0.5 }}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 text-green-700">
                        
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold">On schedule · ETA ~25 min</span>
                      </motion.div>

                      {/* Mini timeline */}
                      <div className="space-y-0 pt-1">
                        <p className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold mb-2">Today's Route</p>
                        {[
                        { num: 1, status: "done", area: "DT1" },
                        { num: 2, status: "done", area: "DT2" },
                        { num: 3, status: "you", area: "DT2 8DG" },
                        { num: 4, status: "pending", area: "DT3" },
                        { num: 5, status: "pending", area: "DT4" }].
                        map((visit, i) =>
                        <motion.div
                          key={visit.num}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 1.0 + i * 0.1, duration: 0.3 }}
                          className="flex items-center gap-2">
                          
                            <div className="flex flex-col items-center">
                              <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold border ${
                            visit.status === "done" ? "bg-green-100 border-green-400 text-green-700" :
                            visit.status === "you" ? "bg-amber-100 border-amber-400 text-amber-700" :
                            "bg-stone-100 border-stone-300 text-stone-400"}`
                            }>
                                {visit.status === "done" ? "✓" : visit.num}
                              </div>
                              {visit.num < 5 && <div className={`w-px h-3 ${visit.status === "done" ? "bg-green-300" : "bg-stone-200"}`} />}
                            </div>
                            <div className="flex items-center gap-1.5 pb-2">
                              <span className={`text-[10px] ${
                            visit.status === "done" ? "text-green-600 line-through" :
                            visit.status === "you" ? "text-amber-700 font-semibold" :
                            "text-stone-400"}`
                            }>
                                Visit {visit.num}{visit.status === "you" ? " — You!" : ""}
                              </span>
                              <span className="text-[8px] text-stone-400">{visit.area}{visit.status !== "you" ? " area" : ""}</span>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Privacy notice */}
                      <div className="flex items-center justify-center gap-1 pt-1 pb-2">
                        <Lock className="h-2.5 w-2.5 text-stone-300" />
                        <p className="text-[8px] text-stone-300">Locations approximate for privacy</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative glow */}
                <div className="absolute -inset-4 rounded-[3rem] bg-secondary/5 blur-2xl -z-10" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services */}
      {services.length > 0 &&
      <section className="py-16">
          <div className="container mx-auto px-4">
            <motion.h2
            {...fadeUp}
            className="mb-10 text-center font-serif text-3xl uppercase tracking-wide">
            
              Our Services
            </motion.h2>
            <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
              {services.map((service, i) => {
              const Icon = getIcon(service.name);
              const isComingSoon = service.name.toLowerCase().includes("foot");
              const Wrapper = isComingSoon ? "div" : Link;
              const wrapperProps = isComingSoon ? {} : { to: "/book" };
              return (
                <motion.div
                  className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                  key={service.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.6 }}>
                  
                    <Wrapper {...wrapperProps as any}>
                      <Card className={cn(
                      "group h-full border-0 shadow-lg transition-all duration-300 relative overflow-hidden",
                      isComingSoon ? "opacity-75 cursor-default" : "hover:shadow-xl cursor-pointer hover:-translate-y-1"
                    )}>
                        {isComingSoon &&
                      <div className="absolute top-3 right-3 z-10">
                            <Badge className="bg-secondary text-secondary-foreground text-xs font-semibold tracking-wider uppercase px-3 py-1 animate-pulse">
                              Coming Soon
                            </Badge>
                          </div>
                      }
                        <CardContent className="flex flex-col items-center pt-8 pb-6 text-center">
                          <motion.div
                          className={cn(
                            "mb-4 flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-300",
                            isComingSoon ? "bg-muted" : "bg-secondary/10 group-hover:bg-secondary/20"
                          )}
                          whileHover={isComingSoon ? {} : { scale: 1.1, rotate: -5 }}
                          transition={{ type: "spring", stiffness: 300 }}>
                          
                            <Icon className={cn("h-7 w-7", isComingSoon ? "text-muted-foreground" : "text-secondary")} />
                          </motion.div>
                          <h3 className="mb-2 font-serif text-lg">{service.name}</h3>
                          {service.description &&
                        <p className="mb-3 text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                        }
                          <div className="mt-auto flex items-center gap-3 text-sm text-muted-foreground">
                            {isComingSoon ?
                          <span className="text-xs italic">Available soon — stay tuned!</span> :

                          <>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" /> {service.duration_minutes} min
                                </span>
                                {service.name.toLowerCase().includes("cryotherapy") ?
                            <span className="font-semibold text-foreground">Price TBC</span> :
                            service.price ?
                            <span className="font-semibold text-foreground">£{Number(service.price).toFixed(2)}</span> :
                            null}
                              </>
                          }
                          </div>
                        </CardContent>
                      </Card>
                    </Wrapper>
                  </motion.div>);

            })}
            </div>
            <PaymentMethodsBadge className="mt-8 max-w-sm mx-auto" />
            <motion.div {...fadeUp} transition={{ delay: 0.3, duration: 0.5 }} className="mt-6 text-center">
              <Link to="/book">
                <Button size="lg" className="transition-all duration-300 hover:scale-105">
                  Book Now <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      }

      {/* Foot Care Waitlist */}
      <FootCareWaitlist />

      {/* Google Reviews with written testimonials */}
      <section className="bg-muted py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) =>
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 400 }}>
                
                  <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                </motion.div>
              )}
            </div>
            <h2 className="font-serif text-3xl mb-2 uppercase tracking-wide">What Our Clients Say</h2>
            <p className="text-muted-foreground">Real reviews from real ShawScope clients</p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3 mb-10">
            {reviews.map((review, i) =>
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}>
              
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="pt-6 pb-6">
                    <Quote className="h-6 w-6 text-secondary/40 mb-3" />
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
                      "{review.text}"
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[...Array(review.rating)].map((_, j) =>
                      <Star key={j} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      )}
                      </div>
                      <span className="text-sm font-medium text-foreground">— {review.name}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          <motion.div {...fadeUp} transition={{ delay: 0.4, duration: 0.5 }} className="text-center">
            <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="gap-2 transition-all duration-300 hover:scale-105">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                Read All Our Google Reviews
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Private Blood Tests */}
      <BloodTestingPromo variant="homepage" />


      {/* YouTube Video */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div {...fadeUp} className="text-center mb-8">
            <Ear className="mx-auto h-8 w-8 text-secondary mb-4" />
            <h2 className="font-serif text-3xl mb-2 uppercase tracking-wide">See ShawScope in Action</h2>
            <p className="text-muted-foreground">Watch an example of a home visit earwax removal appointment</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="aspect-video rounded-2xl overflow-hidden shadow-xl">
            
            <iframe
              src="https://www.youtube.com/embed/Dp5HIEqtsWw"
              title="ShawScope Home Visit - Earwax Removal"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full" />
            
          </motion.div>
        </div>
      </section>

      {/* Visit Types */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <MapPin className="mx-auto h-8 w-8 text-secondary mb-4" />
            <h2 className="font-serif text-3xl mb-3 uppercase tracking-wide">How We See You</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Choose the option that suits you best when booking</p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Home Visit */}
            <motion.div {...fadeUp}>
              <Card className="h-full border-2 border-secondary/30 bg-secondary/5 overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img src={shawscopeVan} alt="ShawScope mobile service vehicle" className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Car className="h-6 w-6 text-secondary" />
                    <h3 className="font-serif text-xl font-semibold">Home Visit</h3>
                    <Badge variant="secondary" className="ml-auto text-xs">Primary Service</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Our main service — Matt travels to your home with all professional ear care equipment. Comfortable, convenient, and no travel needed on your part.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-secondary flex-shrink-0" />
                      <span>Full professional ear care setup brought to your door</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-secondary flex-shrink-0" />
                      <span>Free within 10 miles of Dorchester</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-secondary flex-shrink-0" />
                      <span>Live ETA tracking on appointment day</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-secondary flex-shrink-0" />
                      <span>Ideal for elderly or less mobile patients</span>
                    </li>
                  </ul>
                  <Link to="/book">
                    <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" size="sm">
                      Book a Home Visit
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Come to Us */}
            <motion.div {...fadeUp}>
              <Card className="h-full border-2 border-border overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img src="/images/clinic-lounge.jpg" alt="ShawScope home clinic lounge in Broadmayne" className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Home className="h-6 w-6 text-secondary" />
                    <h3 className="font-serif text-xl font-semibold">Come to Us</h3>
                    <Badge variant="outline" className="ml-auto text-xs">No Travel Fee</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Visit our home clinic in Broadmayne, Dorchester. Available as a first or last appointment of the day — no travel fee applies.
                  </p>

                  <div className="rounded-lg bg-amber-950/20 border border-amber-800/40 p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Please note before booking
                    </p>
                    <ul className="space-y-1.5 text-xs text-amber-400/90">
                      <li className="flex items-start gap-2">
                        <Cat className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span><strong>Cat in residence</strong> — not suitable if you have severe cat allergies</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowUpRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span><strong>Steps to entrance</strong> — no disability access available</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ParkingCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span><strong>Limited parking</strong> — residential street with restricted spaces</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Baby className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span><strong>Baby at home</strong> — it may be noisy at times</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Home className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span><strong>Our own home</strong> — not a clinic-style environment; we are designed for home visiting</span>
                      </li>
                    </ul>
                  </div>

                  <Link to="/book" className="block mt-4">
                    <Button variant="outline" className="w-full" size="sm">
                      Book at Our Home
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Travel info */}
      <section className="bg-muted py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div {...fadeUp} className="text-center mb-8">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 10 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="inline-block">
              
              <MapPin className="mx-auto h-8 w-8 text-secondary mb-4" />
            </motion.div>
            <h2 className="font-serif text-2xl sm:text-3xl mb-4 uppercase tracking-wide">Where Do We Travel To?</h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
              We provide home visits across Dorchester and the surrounding areas. For locations <span className="font-semibold text-foreground">greater than 10 miles from central Dorchester</span>, a travel fee of <span className="font-semibold text-foreground">£2.50 per mile</span> applies.
            </p>
            <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto">
              Whether a travel fee applies is at our discretion — we'll always let you know before confirming your booking. If you're unsure, <Link to="/contact" className="text-secondary hover:underline font-medium">get in touch</Link> and we'll be happy to help.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl mx-auto">
            
            <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-background relative group">
              <div className="aspect-[4/3] sm:aspect-video">
                <iframe
                  src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBBlacfKdgt0NvSsjkMA12Iz8nMGQpJALg&q=Dorchester,Dorset,UK&zoom=10&maptype=roadmap"
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="ShawScope service area — Dorchester, Weymouth, Wool and surrounding areas" />
                
              </div>
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-dark/80 to-transparent p-4 pointer-events-none"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.5 }}>
                
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {["Dorchester", "Weymouth", "Wool", "Blandford", "Wareham", "Portland"].map((town, i) =>
                  <motion.span
                    key={town}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                    className="text-xs sm:text-sm text-primary-foreground/90 font-medium tracking-wide flex items-center gap-1">
                    
                      <MapPin className="h-3 w-3 text-secondary" />
                      {town}
                    </motion.span>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>

          <TravelFeeCalculator />
        </div>
      </section>

      {/* Want to learn more */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.h2 {...fadeUp} className="font-serif text-3xl mb-8 uppercase tracking-wide">Want to Learn More?</motion.h2>
          <motion.div {...fadeUp} transition={{ delay: 0.2, duration: 0.5 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/earwax-removal">
              <Button size="lg" variant="outline" className="min-w-[200px] transition-all duration-300 hover:scale-105">
                <Ear className="mr-2 h-4 w-4" /> Earwax Removal
              </Button>
            </Link>
            <Link to="/cryotherapy">
              <Button size="lg" variant="outline" className="min-w-[200px] transition-all duration-300 hover:scale-105">
                <Snowflake className="mr-2 h-4 w-4" /> Cryotherapy
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Photo Gallery Strip */}
      <section className="py-10 overflow-hidden bg-muted">
        <div className="container mx-auto px-4">
          <motion.h2 {...fadeUp} className="text-center font-serif text-2xl uppercase tracking-wide mb-6">ShawScope in Pictures</motion.h2>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {[
            { src: mattEvent, alt: "Matt at a ShawScope community event" },
            { src: shawscopeVan, alt: "ShawScope branded mobile service vehicle" },
            { src: mattHomevisit, alt: "Matt performing earwax removal at a home visit" },
            { src: mattHomevisit2, alt: "Matt treating a client at home" },
            { src: cryoTreatment, alt: "Cryotherapy skin sessions in progress" },
            { src: mattTreating, alt: "Matt providing treatment" },
            { src: mattEquipment, alt: "Professional earwax removal equipment" }].
            map((img, i) =>
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className="overflow-hidden rounded-xl aspect-square w-[calc(33.333%-0.5rem)] sm:w-[calc(25%-0.75rem)] lg:w-[calc(14.285%-0.75rem)]">
              
                <img src={img.src} alt={img.alt} loading="lazy" className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface-dark py-16 text-center text-primary-foreground">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp}>
            <h2 className="font-serif text-3xl uppercase tracking-wide mb-4">
              Ready to Book?
            </h2>
            <p className="text-primary-foreground/60 mb-2 text-lg">Friendly. Accessible. Wellbeing-focused.</p>
            <p className="text-primary-foreground/60 mb-8 max-w-md mx-auto">
              ShawScope is here to help you feel comfortable, refreshed, and confident in your day-to-day life.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
              <Link to="/book">
                <Button
                  size="lg"
                  className="bg-transparent border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-surface-dark transition-all duration-300">
                  
                  <CalendarDays className="mr-2 h-4 w-4" /> Book an Appointment
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
    </SiteLayout>);

};

export default Index;