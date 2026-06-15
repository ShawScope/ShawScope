import { useEffect } from "react";
import { useServicePricing } from "@/hooks/useServicePricing";
import SiteLayout from "@/components/SiteLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  CalendarDays, Ear, Droplets, HeadphonesIcon, CheckCircle, ShieldCheck,
  Clock, HelpCircle, PoundSterling, Heart, Stethoscope, ListChecks, Activity, MapPin, Info,
} from "lucide-react";
import TravelFeeCalculator from "@/components/TravelFeeCalculator";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import PageMeta from "@/components/PageMeta";
import PaymentMethodsBadge from "@/components/PaymentMethodsBadge";
import mattHomevisit from "@/assets/matt-homevisit.jpg";
import mattHomevisit2 from "@/assets/matt-homevisit2.jpg";
import mattEquipment from "@/assets/matt-equipment.jpg";
import mattEvent from "@/assets/matt-event.png";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const sectionLinks = [
  { id: "about", label: "About", icon: Ear },
  { id: "what-is-earwax", label: "What Is Earwax?", icon: Info },
  { id: "methods", label: "Methods", icon: Stethoscope },
  { id: "wellness", label: "Ear Wellness", icon: Activity },
  { id: "hearing-screening", label: "Hearing Test", icon: HeadphonesIcon },
  { id: "pricing", label: "Pricing", icon: PoundSterling },
  { id: "duration", label: "Duration", icon: Clock },
  { id: "travel", label: "Travel Fee", icon: MapPin },
  { id: "gallery", label: "Gallery", icon: Heart },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

const faqs = [
  {
    q: "Does earwax removal hurt?",
    a: "No — both microsuction and irrigation are gentle and well-tolerated. You may feel a slight sensation of suction or water pressure, but the process is designed to be comfortable and quick.",
  },
  {
    q: "How long does the appointment take?",
    a: "Most earwax removal appointments take up to 50 minutes, depending on the method used and the amount of wax present. Every effort will be made to remove the wax in this time.",
  },
  {
    q: "What happens if the wax can't be fully removed?",
    a: "In some cases, due to the amount, consistency, or position of the wax, it may not be possible to remove all earwax in one session. If a follow-up appointment is needed and booked within 4 weeks, there is a charge of £35 for the follow-up visit.",
  },
  {
    q: "Do I need to use ear drops before my appointment?",
    a: "We recommend using olive oil ear drops for 3–5 days before your appointment to soften the wax. This makes removal easier and more comfortable. However, if you haven't used drops, we can still assess and often proceed.",
  },
  {
    q: "Is earwax removal safe?",
    a: "Yes. Both microsuction and irrigation are recognised, safe methods when performed by a trained professional. Matt uses proper magnification, lighting, and sterile equipment throughout every appointment.",
  },
  {
    q: "What if no wax is found?",
    a: "If no significant wax is present, we'll let you know and your appointment converts to a Wellness Check at £30. A hearing screen may be included if ear fit allows — this isn't always possible.",
  },
  {
    q: "Can children have earwax removal?",
    a: "Our services are available for individuals aged 16 and over. For younger children, we recommend speaking with your GP.",
  },
  {
    q: "How often should I have earwax removed?",
    a: "This varies from person to person. Some people produce more wax than others. If you notice a feeling of fullness, reduced hearing, or discomfort, it's a good time to book an appointment. Many clients return every 6–12 months.",
  },
  {
    q: "What's the difference between microsuction and irrigation?",
    a: "Microsuction uses gentle suction to remove wax under direct vision — it's dry and precise. Irrigation uses warm water to flush out softer wax. Matt will advise which method is best for you based on the type and position of wax.",
  },
];

const EarwaxRemovalPage = () => {
  const { formatPrice, getServiceOffers, getServicePrice, loading: pricingLoading } = useServicePricing();
  const earwaxPrice = getServicePrice("earwax");
  const earwaxPriceText = earwaxPrice != null ? `£${earwaxPrice}` : "£60";
  const earwaxOffers = getServiceOffers("earwax");

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <SiteLayout>
      <PageMeta
        title="Earwax Removal Dorchester, Weymouth & Dorset — Home Visits"
        description={`Professional earwax removal by microsuction and irrigation at your home. Covering Dorchester, Weymouth, Portland and surrounding Dorset villages. From ${earwaxPriceText} per person. Book online.`}
        path="/earwax-removal"
        breadcrumbs={[{ name: "Earwax Removal", path: "/earwax-removal" }]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Earwax Removal Home Visits — Dorchester, Weymouth & Dorset",
            "description": "Professional microsuction and irrigation earwax removal delivered to your home across Dorchester, Weymouth, Portland and surrounding Dorset villages.",
            "provider": {
              "@type": "MedicalBusiness",
              "name": "ShawScope",
              "url": "https://shawscope.co.uk",
              "telephone": "+441305340194",
              "address": { "@type": "PostalAddress", "addressLocality": "Dorchester", "addressRegion": "Dorset", "addressCountry": "GB" }
            },
            "areaServed": [
              { "@type": "City", "name": "Dorchester" },
              { "@type": "City", "name": "Weymouth" },
              { "@type": "City", "name": "Portland" },
              { "@type": "City", "name": "Chickerell" },
              { "@type": "City", "name": "Puddletown" },
              { "@type": "City", "name": "Cerne Abbas" },
              { "@type": "City", "name": "Crossways" },
              { "@type": "City", "name": "Broadmayne" },
              { "@type": "City", "name": "Charminster" },
              { "@type": "AdministrativeArea", "name": "Dorset" }
            ],
            "serviceType": "Earwax Removal",
            "offers": {
              "@type": "Offer",
              "price": earwaxPrice != null ? earwaxPrice.toFixed(2) : "60.00",
              "priceCurrency": "GBP",
              "description": "Earwax removal for one person (both ears)"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(f => ({
              "@type": "Question",
              "name": f.q,
              "acceptedAnswer": { "@type": "Answer", "text": f.a }
            }))
          }
        ]}
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
            <Ear className="h-10 w-10 text-secondary" />
          </motion.div>
          <h1 className="font-serif text-4xl sm:text-5xl uppercase tracking-wide">Earwax Removal Home Visits</h1>
          <p className="mt-4 text-primary-foreground/60 max-w-xl mx-auto">
            Safe, gentle microsuction &amp; irrigation across Dorchester, Weymouth &amp; Dorset — a non-diagnostic ear care &amp; wellness service.
          </p>
        </motion.div>
      </section>

      {/* Non-diagnostic disclaimer */}
      <section className="bg-muted/40 border-y border-border/60 py-5">
        <div className="container mx-auto max-w-3xl px-4">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed text-center">
            ShawScope is a non-diagnostic ear care and wellness service focused on the safe removal of visible excess earwax where appropriate. We do not diagnose or treat medical conditions and do not replace assessment by a GP, audiologist or ENT specialist. If you have ear pain, discharge, sudden hearing change, dizziness, bleeding or any concerning symptom, please contact your GP, NHS 111 or a pharmacist before booking. Appointments may be paused or referred onward if concerns outside our service scope are identified.
          </p>
        </div>
      </section>

      {/* Section navigation */}
      <section className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto max-w-5xl px-4 py-2">
          <div className="flex justify-center">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-0.5 sm:gap-1 w-full max-w-xl sm:max-w-none">
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

      {/* About / Intro */}
      <section id="about" className="py-16 scroll-mt-24 pb-8">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} className="grid gap-10 md:grid-cols-2 items-center">
            <div>
              <p className="text-base leading-relaxed text-muted-foreground mb-4">
                At ShawScope, we offer safe, gentle, and wellbeing-focused ear cleaning using recognised methods designed to support everyday comfort. Our mobile service brings this simple personal hygiene procedure directly to your home, making the experience calm, convenient, and stress-free.
              </p>
              <p className="text-sm text-muted-foreground mb-4">Services are available for individuals aged 16 and over.</p>
              <div className="flex flex-wrap gap-4 mt-6">
                {[
                  { icon: ShieldCheck, text: "Safe & Professional" },
                  { icon: Clock, text: "Up to 50 Minutes" },
                  { icon: CheckCircle, text: "Home Visits" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 300 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10">
                      <item.icon className="h-4 w-4 text-secondary" />
                    </div>
                    {item.text}
                  </motion.div>
                ))}
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl overflow-hidden shadow-xl"
            >
              <img src={mattHomevisit} alt="Matt performing earwax removal home visit in Dorchester, Dorset" loading="lazy" className="w-full h-72 object-cover" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* What Is Earwax? */}
      <section id="what-is-earwax" className="pb-16 scroll-mt-24">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-block mb-4"
            >
              <Info className="h-8 w-8 text-secondary" />
            </motion.div>
            <h2 className="font-serif text-3xl uppercase tracking-wide">What Is Earwax?</h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            <motion.div {...fadeUp}>
              <Card className="border-0 shadow-lg h-full">
                <CardContent className="p-8">
                  <h3 className="font-serif text-xl mb-3">A Natural & Protective Substance</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Earwax — known medically as <strong>cerumen</strong> — is a natural substance produced by glands in the ear canal. It plays an important role in keeping your ears healthy by trapping dust, dirt, and small particles before they can reach your eardrum.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Earwax also has antibacterial and antifungal properties, helping to protect the delicate skin inside your ear canal from infections. In most cases, earwax naturally works its way out of the ear on its own.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    It comes in two types: <strong>wet earwax</strong> (golden-brown and sticky) and <strong>dry earwax</strong> (grey and flaky). Both are completely normal and vary from person to person.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeUp}>
              <Card className="border-0 shadow-lg h-full">
                <CardContent className="p-8">
                  <h3 className="font-serif text-xl mb-3">Why Does Earwax Need Removing?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    While earwax is beneficial, sometimes the body produces too much, or it doesn't clear properly. When wax builds up and becomes impacted, it can cause a range of uncomfortable symptoms:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      "A feeling of fullness or pressure in the ear",
                      "Reduced or muffled hearing",
                      "Tinnitus — ringing, buzzing, or humming sounds",
                      "Earache or discomfort",
                      "Dizziness or balance issues",
                      "Itchiness inside the ear canal",
                      "Difficulty wearing hearing aids properly",
                    ].map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + i * 0.05 }}
                        className="flex items-start gap-2"
                      >
                        <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div {...fadeUp} className="mt-6">
            <Card className="border-secondary/20 bg-secondary/5 shadow-sm">
              <CardContent className="p-6">
                <div className="grid gap-6 md:grid-cols-3">
                  {[
                    { title: "Cotton Buds — Avoid!", text: "Using cotton buds pushes wax deeper and can damage the ear canal or eardrum. They are one of the most common causes of impacted earwax." },
                    { title: "Ear Candles — Not Recommended", text: "Ear candles have no proven benefit and carry risks of burns, blocked canals, and even eardrum perforation. They are not recommended by any healthcare body." },
                    { title: "Professional Removal — The Safe Choice", text: "If you're experiencing symptoms, professional microsuction or irrigation is the safest and most effective way to remove excess earwax comfortably." },
                  ].map((item, i) => (
                    <div key={i}>
                      <h4 className="font-serif text-sm font-semibold mb-1">{item.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Methods */}
      <section id="methods" className="bg-muted py-16 scroll-mt-24">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-block mb-4"
            >
              <Stethoscope className="h-8 w-8 text-secondary" />
            </motion.div>
            <h2 className="font-serif text-3xl uppercase tracking-wide">Our Methods</h2>
          </motion.div>

          <div className="space-y-8">
            {/* Microsuction */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="grid md:grid-cols-5">
                  <div className="md:col-span-3">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <motion.div
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Ear className="h-6 w-6 text-secondary" />
                        </motion.div>
                        <h3 className="font-serif text-2xl">Microsuction</h3>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-4">A Clean and Controlled Ear Cleaning Method</p>
                      <p className="text-base leading-relaxed text-muted-foreground mb-4">
                        Microsuction is a dry, carefully controlled technique used for removing excess earwax that may feel uncomfortable or cause a sense of fullness. It involves using a small suction device while viewing the ear canal through magnification and a bright light.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {[
                          "Clear and precise, with continuous visual guidance throughout",
                          "Clean and dry, with no water introduced into the ear canal",
                          "Suitable for most people, including those who prefer a non-water method",
                          "Quick and comfortable, usually completed in minutes",
                        ].map((item, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + i * 0.08 }}
                            className="flex items-start gap-2"
                          >
                            <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                            {item}
                          </motion.li>
                        ))}
                      </ul>
                    </CardContent>
                  </div>
                  <div className="md:col-span-2 hidden md:block">
                    <img src={mattEquipment} alt="Professional microsuction earwax removal equipment used in Dorset home visits" loading="lazy" className="w-full h-full object-cover" />
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Irrigation */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="grid md:grid-cols-5">
                  <div className="md:col-span-2 hidden md:block">
                    <img src={mattHomevisit2} alt="Earwax removal patient treatment at home in Weymouth, Dorset" loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <div className="md:col-span-3">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <motion.div
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10"
                          whileHover={{ scale: 1.1, rotate: -5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Droplets className="h-6 w-6 text-secondary" />
                        </motion.div>
                        <h3 className="font-serif text-2xl">Irrigation</h3>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-4">A Gentle Water-Based Option</p>
                      <p className="text-base leading-relaxed text-muted-foreground mb-4">
                        When appropriate, a low-pressure water method may be used to help flush out softer or loose wax. Warm, steam-distilled water is gently introduced into the ear canal using a modern, controlled irrigation system.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {[
                          "Mild and comfortable, when used after wax-softening drops",
                          "Useful for softer wax, particularly when suction is less suitable",
                          "Non-intrusive, avoiding instruments placed deep into the canal",
                        ].map((item, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + i * 0.08 }}
                            className="flex items-start gap-2"
                          >
                            <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                            {item}
                          </motion.li>
                        ))}
                      </ul>
                    </CardContent>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Ear Wellness */}
      <section id="wellness" className="py-16 scroll-mt-24">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-block mb-4"
            >
              <Activity className="h-8 w-8 text-secondary" />
            </motion.div>
            <h2 className="font-serif text-3xl uppercase tracking-wide">Ear Wellness</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">
              Proactive ear care and hearing awareness services for your peace of mind
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Ear Wellness Check */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-0 shadow-lg h-full">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Ear className="h-6 w-6 text-secondary" />
                    </motion.div>
                    <h3 className="font-serif text-xl">Ear Examination</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    A thorough visual inspection of your ear canals using professional-grade otoscopy equipment. Matt will check for wax build-up, signs of irritation, and general ear canal health — giving you a clear picture of what's going on inside your ears.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      "Identify wax build-up before it becomes a problem",
                      "Check for signs of irritation or infection",
                      "Professional advice on ear care and maintenance",
                    ].map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.08 }}
                        className="flex items-start gap-2"
                      >
                        <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Hearing Check */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="border-0 shadow-lg h-full">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <HeadphonesIcon className="h-6 w-6 text-secondary" />
                    </motion.div>
                    <h3 className="font-serif text-xl">Wellbeing Hearing Check</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    A simple digital hearing screening tool designed to give you a basic overview of how sounds are perceived. This is not a diagnostic test, but it can offer a helpful indication of whether further assessment might be beneficial.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      "Free if no wax is found during your appointment (subject to ear fit suitability)",
                      "Optional (£10) as an add-on to earwax removal",
                      "Included as part of the Ear Wellness Check service",
                    ].map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.08 }}
                        className="flex items-start gap-2"
                      >
                        <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs text-muted-foreground italic">
                    This screening does not replace a full audiology examination.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>


      {/* Hearing Screening - ShawScope Digital Test */}
      <section id="hearing-screening" className="bg-muted py-16 scroll-mt-24">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-block mb-4"
            >
              <HeadphonesIcon className="h-8 w-8 text-secondary" />
            </motion.div>
            <h2 className="font-serif text-3xl uppercase tracking-wide">Digital Hearing Screening</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-2xl mx-auto">
              Clinician-led screening using professional Sennheiser HD 300 Pro studio headphones for accurate, defensible results
            </p>
          </motion.div>

          {/* Hero benefit card */}
          <motion.div {...fadeUp} className="mb-8">
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-2">
                  <div className="p-8 md:p-10 flex flex-col justify-center">
                    <h3 className="font-serif text-2xl mb-4">How Well Are You Hearing?</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      Many people live with gradual hearing changes without realising it. Difficulty following conversations in noisy places, turning the TV up louder than others, or missing the doorbell — these small signs can point to changes worth understanding.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      Our <strong>ShawScope Digital Screening</strong> uses professional <strong>Sennheiser HD 300 Pro closed-back studio headphones</strong> — the same circumaural reference headphones used in clinical research settings. Wired directly to the device for an uncompressed signal, with calibrated tones delivered one ear at a time.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      Matt performs the screening manually in your home, with full clinician control over frequency, level and ear. You'll leave with a clear audiogram, a plain-English summary, and a recommendation for next steps if needed.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { icon: Clock, text: "Takes just 10 minutes" },
                        { icon: ShieldCheck, text: "Clinician-led & safe" },
                        { icon: ListChecks, text: "Instant results report" },
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 300 }}
                          className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/10 rounded-full px-3 py-1.5"
                        >
                          <item.icon className="h-3.5 w-3.5 text-secondary" />
                          {item.text}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent p-8 md:p-10 flex flex-col justify-center">
                    <div className="space-y-4">
                      <h4 className="font-serif text-lg mb-2">What You'll Receive</h4>
                      {[
                        { title: "Personal Audiogram", desc: "A visual graph showing your hearing levels across key frequencies — from low rumbles to high-pitched sounds" },
                        { title: "Plain-English Summary", desc: "No medical jargon. We explain what your results mean in everyday terms you can understand" },
                       { title: "Practical Advice", desc: "Tailored guidance on what to do next — whether that's reassurance, monitoring, a private audiologist referral, or help accessing NHS services" },
                       { title: "PDF Report", desc: "A professional report you can keep, share with your GP, or use for future reference" },
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 + i * 0.08 }}
                          className="flex items-start gap-3"
                        >
                          <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold">{item.title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Screening features */}
          <motion.div {...fadeUp} className="mb-8">
            <h3 className="font-serif text-xl text-center mb-6">Why ShawScope Screening Is Different</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-0 shadow-lg ring-2 ring-secondary/30 relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                      <HeadphonesIcon className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-serif text-base font-semibold">Sennheiser HD 300 Pro</h4>
                      <p className="text-[10px] text-muted-foreground">Professional closed-back studio headphones</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-secondary mt-0.5 flex-shrink-0" /> <span>Circumaural design — fully covers the ear for excellent passive noise isolation</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-secondary mt-0.5 flex-shrink-0" /> <span><strong>Wired connection</strong> — no Bluetooth compression, true uncompressed signal</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-secondary mt-0.5 flex-shrink-0" /> <span>Flat frequency response across 250 Hz – 8 kHz hearing-screen range</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-secondary mt-0.5 flex-shrink-0" /> <span>Calibrated tone delivery at each test frequency</span></li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Stethoscope className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-serif text-base font-semibold">Clinician-Led</h4>
                      <p className="text-[10px] text-muted-foreground">Performed by Matt in your home</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" /> <span>Adaptive staircase method with full manual frequency, level and ear control</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" /> <span>Up to 10 frequencies per ear for thorough coverage</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" /> <span>Otoscopy first — ears confirmed clear before screening</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" /> <span>Professional PDF audiogram with plain-English advice</span></li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* How it works */}
          <motion.div {...fadeUp} className="mb-8">
            <h3 className="font-serif text-xl text-center mb-6">How It Works</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { step: "1", title: "Ear Check First", desc: "Matt examines your ears with an otoscope to ensure they're clear and healthy before screening" },
                { step: "2", title: "HD 300 Pro Headphones", desc: "Professional Sennheiser HD 300 Pro studio headphones, wired directly to the device for uncompressed audio" },
                { step: "3", title: "Listen & Respond", desc: "You simply respond each time you hear a tone. Matt tests different pitches and volumes for each ear" },
                { step: "4", title: "Instant Results", desc: "Your audiogram and personalised report are generated immediately and explained face-to-face" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <Card className="border-0 shadow-md h-full hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-5 text-center">
                      <motion.div
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-bold text-lg mx-auto mb-3"
                        whileHover={{ scale: 1.15, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {item.step}
                      </motion.div>
                      <h4 className="font-serif text-sm font-semibold mb-1.5">{item.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Who benefits */}
          <motion.div {...fadeUp} className="mb-8">
            <Card className="border-secondary/20 bg-secondary/5 shadow-lg">
              <CardContent className="p-8">
                <h3 className="font-serif text-xl mb-4 text-center">Who Should Consider a Hearing Screening?</h3>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {[
                    "You find yourself asking people to repeat things",
                    "The TV volume keeps creeping up",
                    "You struggle to follow conversations in busy places",
                    "You've noticed a change in hearing after wax removal",
                    "You work or have worked in noisy environments",
                    "You just want reassurance that your hearing is healthy",
                  ].map((text, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.06 }}
                      className="flex items-start gap-2"
                    >
                      <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">{text}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Hearing Aid Support */}
          <motion.div {...fadeUp} className="mb-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Ear className="h-5 w-5 text-secondary" />
                  </motion.div>
                  <h3 className="font-serif text-xl">Hearing Aid Support</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  If you wear hearing aids, feel free to ask Matt to take a look during your appointment. We're happy to help with day-to-day maintenance — changing <strong>filters</strong>, <strong>batteries</strong>, <strong>tubing</strong>, and giving your aids a listen to check they're working as they should. We can also give them a <strong>light clean</strong> if needed, so they're nice and hygienic before going back in your ears.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  If we feel your hearing aids may need professional attention, we can recommend that you book a review with your audiologist.
                </p>
                <Card className="border-secondary/20 bg-secondary/5">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong>Please note:</strong> ShawScope does not supply new batteries, filters, or hearing aid tubing. These should be requested from your provider — whether that's <strong>NHS Audiology</strong> or your <strong>private hearing aid provider</strong>. We're here to help with fitting and maintenance checks during your visit.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pricing + CTA */}
          <motion.div {...fadeUp}>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { title: "With Earwax Removal", price: "+£10", note: "Add to any earwax appointment (ear fit dependent)", highlight: false },
                { title: "No Wax Found?", price: "FREE", note: "With or without hearing screen, dependent on ear fit suitability", highlight: true },
                { title: "Standalone Wellness", price: "£30", note: "Full ear exam — hearing screen if ear fit allows", highlight: false },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className={`border-0 shadow-md h-full text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${item.highlight ? "ring-2 ring-secondary/30" : ""}`}>
                    <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                      <h4 className="font-serif text-sm font-semibold mb-2">{item.title}</h4>
                      <p className="text-2xl font-bold text-foreground mb-1">{item.price}</p>
                      <p className="text-xs text-muted-foreground">{item.note}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link to="/book">
                <Button size="lg" className="px-8">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Book Your Hearing Screening
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-3 max-w-md mx-auto italic">
                This is a wellbeing screening and does not replace a formal diagnostic audiology examination. If results suggest further assessment is needed, Matt can refer you to a private audiologist or advise you on accessing NHS hearing services.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-muted py-16 scroll-mt-24">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div {...fadeUp} className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-block mb-4"
            >
              <PoundSterling className="h-8 w-8 text-secondary" />
            </motion.div>
            <h2 className="font-serif text-3xl uppercase tracking-wide">Pricing</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">
              Simple, transparent pricing with no hidden fees. All appointments are carried out in your home.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Earwax Removal",
                desc: "One or both ears — single price to keep things simple. Microsuction or irrigation.",
                price: earwaxPriceText,
                note: "Up to 50 minutes",
                highlight: true,
              },
              {
                name: "Follow-Up Visit",
                desc: "If wax couldn't be fully removed in the first session",
                price: "£35",
                note: "Within 4 weeks of initial visit",
              },
              {
                name: "No Wax Found",
                desc: "If no significant wax is present, your appointment converts to an Ear Wellness Check — with or without a hearing screen, dependent on ear fit suitability",
                price: "£30",
                note: "Hearing screen not always possible",
              },
              {
                name: "Hearing Check Add-On",
                desc: "Optional digital hearing screening added to your earwax removal appointment",
                price: "+£10",
                note: `Total: £${(earwaxPrice ?? 60) + 10} with earwax removal`,
              },
              // DB-driven special offers
              ...earwaxOffers.map(offer => ({
                name: offer.offer_name,
                desc: offer.description || "",
                price: offer.price_text,
                note: offer.price_note || "",
                highlight: false,
                isOffer: true,
                validUntil: offer.valid_until,
              })),
            ].map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                <Card className={`border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full ${item.highlight ? "ring-2 ring-secondary/30" : ""} ${'isOffer' in item && item.isOffer ? "border-l-4 border-l-secondary" : ""}`}>
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-3">
                      <motion.div
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <PoundSterling className="h-5 w-5 text-secondary" />
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="font-serif text-base font-medium">{item.name}</h3>
                        {'validUntil' in item && item.validUntil && (
                          <span className="text-[10px] text-secondary font-medium">Limited offer — ends {new Date(item.validUntil as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{item.desc}</p>
                    <div className="mt-auto">
                      <p className="text-xl font-bold text-foreground">{item.price}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{item.note}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <PaymentMethodsBadge className="mt-8 max-w-sm mx-auto" />
        </div>
      </section>

      {/* Duration & Follow-Up */}
      <section id="duration" className="py-12 scroll-mt-24">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div {...fadeUp}>
            <Card className="border-secondary/20 bg-secondary/5 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 flex-shrink-0">
                    <Clock className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl mb-2">Appointment Duration & Follow-Ups</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Your earwax removal appointment lasts <strong>up to 50 minutes</strong>. Every effort will be made to remove the wax during this time. However, due to the amount, consistency, or position of the wax, it may not always be possible to complete removal in one session.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      If a follow-up appointment is required and booked within <strong>4 weeks</strong> of your initial visit, there is a <strong>reduced charge of £35</strong> for the follow-up session.
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      If removal is unsuccessful or cannot be safely completed, you may be referred to your GP or another healthcare professional.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Photo strip */}
      <section id="gallery" className="py-8 scroll-mt-24">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-6">
            <h2 className="font-serif text-2xl uppercase tracking-wide">Gallery</h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {[
              { src: mattHomevisit, alt: "Earwax removal home visit in Dorchester, Dorset" },
              { src: mattEquipment, alt: "Professional microsuction equipment for earwax removal" },
              { src: mattHomevisit2, alt: "Earwax removal patient treatment in Dorset" },
              { src: mattEvent, alt: "ShawScope earwax removal at a Dorset community event" },
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

      {/* FAQ */}
      <section id="faq" className="bg-muted py-16 scroll-mt-24">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-block mb-4"
            >
              <HelpCircle className="h-8 w-8 text-secondary" />
            </motion.div>
            <h2 className="font-serif text-3xl uppercase tracking-wide">Frequently Asked Questions</h2>
          </motion.div>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                <AccordionItem value={`faq-${i}`} className="bg-card rounded-lg border-0 shadow-sm px-6">
                  <AccordionTrigger className="text-left font-medium text-sm py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Travel Fee */}
      <section id="travel" className="py-16 scroll-mt-24">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div {...fadeUp} className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-block mb-4"
            >
              <MapPin className="h-8 w-8 text-secondary" />
            </motion.div>
            <h2 className="font-serif text-3xl uppercase tracking-wide">Travel Fee</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">
              We come to you! Appointments within 10 miles of our base in Dorchester are free of travel charges. Beyond that, a small fee of £2.50 per mile applies.
            </p>
          </motion.div>
          <TravelFeeCalculator />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface-dark py-16 text-center text-primary-foreground">
        <motion.div {...fadeUp} className="container mx-auto px-4">
          <h2 className="font-serif text-3xl uppercase tracking-wide mb-4">Ready to Feel the Difference?</h2>
          <p className="text-primary-foreground/60 mb-8 max-w-md mx-auto">
            Book your home visit earwax removal appointment today
          </p>
          <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
            <Link to="/book">
              <Button
                size="lg"
                className="bg-transparent border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-surface-dark transition-all duration-300"
              >
                <CalendarDays className="mr-2 h-4 w-4" /> Book Earwax Removal
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Areas We Cover */}
      <section className="bg-muted py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div {...fadeUp} className="text-center mb-6">
            <h2 className="font-serif text-2xl uppercase tracking-wide">Earwax Removal Home Visits Across Dorset</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">
              We travel across Dorset to remove earwax at your home. Click a town to see local information, pricing, and FAQs.
            </p>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-3">
            {["dorchester", "weymouth", "portland", "chickerell", "crossways", "puddletown", "cerne_abbas", "maiden_newton", "broadmayne", "charminster", "martinstown", "upwey", "tolpuddle"].map(slug => {
              const names: Record<string, string> = { dorchester: "Dorchester", weymouth: "Weymouth", portland: "Portland", chickerell: "Chickerell", crossways: "Crossways", puddletown: "Puddletown", cerne_abbas: "Cerne Abbas", maiden_newton: "Maiden Newton", broadmayne: "Broadmayne", charminster: "Charminster", martinstown: "Martinstown", upwey: "Upwey", tolpuddle: "Tolpuddle" };
              return (
                <Link key={slug} to={`/locations/${slug}`} className="px-4 py-2 bg-card rounded-lg shadow-sm text-sm hover:bg-secondary hover:text-secondary-foreground transition-colors">
                  {names[slug]}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

export default EarwaxRemovalPage;
