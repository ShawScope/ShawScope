import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import SiteLayout from "@/components/SiteLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CalendarDays, Snowflake, Camera, ClipboardCheck, CalendarCheck, Sparkles, ShieldCheck, HelpCircle, Heart, CheckCircle, Mail, Clock, Sun, AlertTriangle, Pill, Baby, Syringe, ShieldOff, Droplets, Bone, Skull, CircleSlash, Thermometer, Activity, Ban, Stethoscope, ListChecks, PoundSterling, MapPin } from "lucide-react";
import TravelFeeCalculator from "@/components/TravelFeeCalculator";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import cryoTreatment from "@/assets/cryo-treatment.png";
import CryoRequestForm from "@/components/CryoRequestForm";
import PaymentMethodsBadge from "@/components/PaymentMethodsBadge";
import SkinTypeChecker from "@/components/SkinTypeChecker";
import PageMeta from "@/components/PageMeta";
import lesionSkinTag from "@/assets/lesion-skin-tag.jpg";
import lesionAgeSpot from "@/assets/lesion-age-spot.jpg";
import lesionWart from "@/assets/lesion-wart.jpg";
import lesionVerruca from "@/assets/lesion-verruca.jpg";
import lesionCherryAngioma from "@/assets/lesion-cherry-angioma.jpg";
import lesionSebKeratosis from "@/assets/lesion-seb-keratosis.jpg";
import lesionMilia from "@/assets/lesion-milia.jpg";
import lesionPigmentation from "@/assets/lesion-pigmentation.jpg";
import lesionMole from "@/assets/lesion-mole.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const steps = [
  {
    icon: Camera,
    title: "Send Us an Image",
    content: "Before we begin, please send us a clear photo of your skin lesion via email, WhatsApp, or Messenger to matt@shawscope.co.uk. We always recommend that you have a quick consultation with your GP first, just to make sure they're happy for you to go ahead with cryotherapy.",
  },
  {
    icon: ClipboardCheck,
    title: "Receive Your Price & Book",
    content: "Once we've reviewed your image, we'll send you a price for your treatment. Once you're happy to proceed, book an appointment through our website and choose a date and time that suits you. You'll also complete a consent form so we can gather important details about your skin type, medical history, and treatment preferences.",
  },
  {
    icon: Sparkles,
    title: "Your Appointment Day",
    content: "The big day! You're welcome to have a friend or family member with you for comfort. Please wear suitable clothing for the treatment area, and choose a space you feel relaxed in. Using our ShawScope Cryotherapy Pen, we deliver a controlled, targeted jet of nitrous oxide at extremely low temperatures directly to the surface of the skin.",
  },
];

const treatable = [
  { name: "Skin Tags", desc: "Small, soft growths that hang off the skin, commonly found on the neck, armpits, and body folds.", img: lesionSkinTag },
  { name: "Age Spots", desc: "Flat, darkened patches of skin caused by sun exposure and natural ageing.", img: lesionAgeSpot },
  { name: "Warts", desc: "Small, rough lumps caused by the human papillomavirus (HPV), often on hands and fingers.", img: lesionWart },
  { name: "Verrucae", desc: "Warts on the soles of the feet that can be painful when walking or standing.", img: lesionVerruca },
  { name: "Cherry Angioma", desc: "Small, bright red spots caused by clusters of blood vessels near the skin's surface.", img: lesionCherryAngioma },
  { name: "Seborrheic Keratosis", desc: "Raised, waxy, brown or black growths that appear with age — harmless but sometimes bothersome.", img: lesionSebKeratosis },
  { name: "Milia", desc: "Tiny white bumps caused by trapped keratin beneath the skin, often around the eyes.", img: lesionMilia },
  { name: "Pigmentation Marks", desc: "Areas of uneven skin colour caused by excess melanin production.", img: lesionPigmentation },
  { name: "Benign Moles", desc: "Non-cancerous moles that can be treated cosmetically — GP approval is required before starting.", img: lesionMole },
];

const postTreatmentTimeline = [
  {
    time: "Immediately",
    title: "Redness, Inflammation & Discomfort",
    desc: "This is completely normal. The discomfort should settle within the first hour. It may also feel itchy. Avoid touching the area as much as possible.",
    color: "from-green-400 to-emerald-500",
  },
  {
    time: "1 – 12 Hours",
    title: "Blistering & Crusting",
    desc: "Blisters can happen to anyone and may last a few hours or even a few days. DO NOT POP the blister. Should it burst, clean the area with an alcohol wipe and apply antiseptic cream. Any scabs or crusting — DO NOT PICK, allow to come away naturally.",
    color: "from-cyan-400 to-blue-500",
  },
  {
    time: "1 – 14 Days",
    title: "Darkening, Scabs & Crusts Form",
    desc: "You will expect to see the treated area turn dark, dry and form a scab or crust. Please DO NOT PICK. You must allow the skin to remove this naturally and slowly to avoid scarring.",
    color: "from-blue-400 to-indigo-500",
  },
  {
    time: "14 – 28 Days",
    title: "Improvements to Be Seen",
    desc: "It takes on average 4 weeks for your body to create new skin. Slowly over the next two weeks you will see new healthy skin form. Once 28 days have passed, you are able to have retreatment if needed. REMEMBER: new skin can be a noticeably different colour. ALWAYS USE SPF 50 on your treated area.",
    color: "from-purple-400 to-violet-500",
  },
];

const faqs = [
  {
    q: "Is Cryotherapy Suitable for Me?",
    a: "Cryotherapy is a safe and well-tolerated treatment suitable for most people of all ages, skin types, and ethnic backgrounds. However, certain medical conditions may make it unsuitable — for example, if you have poor circulation, uncontrolled diabetes, very sensitive skin, or an impaired healing response. If you're unsure, we always recommend checking with your GP first.",
  },
  {
    q: "Does Cryotherapy Hurt?",
    a: "During treatment, you'll feel an intense cold sensation — often described as a sharp freeze or mild stinging. This usually lasts only a few seconds. Afterwards, the area may tingle, throb, or feel slightly sore for an hour or so. Discomfort is generally short-lived and very manageable.",
  },
  {
    q: "What Does the Treated Area Look Like Afterwards?",
    a: "Immediately after your session, the area may appear red or slightly raised, similar to a mild blister or insect bite. Over the following days, it can darken or form a small scab or crust as part of the normal healing process.",
  },
  {
    q: "When Will I See Results?",
    a: "Most patients start to notice visible improvement once the scab has fallen away. Complete healing usually takes 4–6 weeks, depending on the type and size of lesion treated. Smaller lesions may heal within two to four weeks.",
  },
  {
    q: "Will I Need More Than One Session?",
    a: "In some cases, yes. Larger or thicker lesions — such as skin tags, warts, or verrucae — often require multiple cryotherapy sessions for full removal. During your follow-up, we'll review your progress and advise if another session would be beneficial.",
  },
  {
    q: "Can I Return to Normal Activities Afterwards?",
    a: "Yes. You can resume normal daily activities straight away, including showering and gentle exercise. We simply advise avoiding swimming, saunas, or heavy sweating for 24 hours after your visit.",
  },
  {
    q: "Can Cryotherapy Leave a Scar?",
    a: "When aftercare is followed correctly, the risk of scarring is very low. However, everyone's skin heals differently, and occasionally mild discolouration can remain temporarily.",
  },
  {
    q: "Is Cryotherapy Safe During Pregnancy or Breastfeeding?",
    a: "Cryotherapy is not routinely recommended during pregnancy or breastfeeding unless approved by your GP.",
  },
  {
    q: "How Should I Care for My Skin After Treatment?",
    a: "Keep the area clean and dry, and avoid applying makeup, fake tan, or fragranced products for at least 48 hours. Always allow any scab or crust to fall away naturally — picking can lead to infection or scarring.",
  },
];

const sectionLinks = [
  { id: "what-is", label: "What Is It?", icon: Snowflake },
  { id: "how-it-works", label: "How It Works", icon: Stethoscope },
  { id: "treatable", label: "What We Treat", icon: CheckCircle },
  { id: "pricing", label: "Pricing", icon: PoundSterling },
  { id: "skin-check", label: "Skin Type", icon: Activity },
  { id: "process", label: "The Process", icon: ListChecks },
  { id: "post-treatment", label: "Post Treatment", icon: Clock },
  { id: "aftercare", label: "Aftercare", icon: Mail },
  { id: "contraindications", label: "Contraindications", icon: AlertTriangle },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

const CryotherapyPage = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [location.hash]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
  <SiteLayout>
    <PageMeta
      title="Cryotherapy Cosmetic Cryotherapy Dorchester & Dorset — Home Visits"
      description="Cosmetic cryotherapy for skin tags, warts, verrucae, age spots and more. Safe home visits across Dorchester, Weymouth, Portland and Dorset. Submit photos for a free assessment."
      path="/cryotherapy"
      breadcrumbs={[{ name: "Cryotherapy", path: "/cryotherapy" }]}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Cryotherapy Cosmetic Cryotherapy Home Visits — Dorchester & Dorset",
          "description": "Cosmetic cryotherapy for skin tags, warts, verrucae, age spots and more — delivered to your home across Dorchester, Weymouth, Portland and Dorset.",
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
            { "@type": "City", "name": "Poole" },
            { "@type": "City", "name": "Bridport" },
            { "@type": "City", "name": "Wareham" },
            { "@type": "AdministrativeArea", "name": "Dorset" }
          ],
          "serviceType": "Cryotherapy"
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
          <Snowflake className="h-10 w-10 text-secondary" />
        </motion.div>
        <h1 className="font-serif text-4xl sm:text-5xl uppercase tracking-wide">Cryotherapy Home Visits</h1>
        <p className="mt-4 text-primary-foreground/60 max-w-xl mx-auto">
          Cosmetic cryotherapy across Dorchester, Weymouth &amp; Dorset
        </p>
      </motion.div>
    </section>

    {/* Warning banner */}
    <section className="bg-destructive/10 border-b border-destructive/20">
      <div className="container mx-auto max-w-4xl px-4 py-3 flex items-center justify-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
        <p className="text-sm text-foreground font-medium">
          <strong>Important:</strong> Please read our{" "}
          <button onClick={() => scrollTo("contraindications")} className="underline text-destructive hover:text-destructive/80 font-bold transition-colors">
            contraindications
          </button>{" "}
          section before booking an appointment.
        </p>
      </div>
    </section>

    {/* Section navigation */}
    <section className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b shadow-sm">
      <div className="container mx-auto max-w-5xl px-4 py-2">
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
          {sectionLinks.map((s, i) => {
            const isContra = s.id === "contraindications";
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                onClick={() => scrollTo(s.id)}
                whileHover={{ y: -4 }}
                className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all duration-300 group"
              >
                <motion.div
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${isContra ? "bg-destructive/10 group-hover:bg-destructive/25 group-hover:shadow-destructive/25" : "bg-secondary/10 group-hover:bg-secondary/25 group-hover:shadow-secondary/25"}`}
                  whileHover={{ rotate: 6 }}
                >
                  <s.icon className={`h-6 w-6 ${isContra ? "text-destructive" : "text-secondary"}`} />
                </motion.div>
                <span className={`text-[10px] sm:text-[11px] font-medium text-foreground transition-colors duration-300 text-center leading-tight ${isContra ? "group-hover:text-destructive" : "group-hover:text-secondary"}`}>{s.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>

    {/* Intro with photo */}
    <section id="what-is" className="py-16 scroll-mt-24">
      <div className="container mx-auto max-w-5xl px-4">
        <motion.div {...fadeUp} className="grid gap-10 md:grid-cols-2 items-center">
          <div>
            <h2 className="font-serif text-2xl mb-4 uppercase tracking-wide">What Is Cryotherapy?</h2>
            <p className="text-base leading-relaxed text-muted-foreground mb-4">
              Cryotherapy is a quick, effective care that uses extreme cold to remove unwanted skin lesions. Using the ShawScope Cryotherapy Pen, a controlled jet of nitrous oxide is applied directly to the surface of the skin, freezing and destroying the targeted cells while leaving surrounding healthy skin largely unaffected.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              {[
                { icon: ShieldCheck, text: "GP Approved" },
                { icon: Snowflake, text: "Quick Treatment" },
                { icon: Heart, text: "Minimal Discomfort" },
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
            <img src={cryoTreatment} alt="Cryotherapy cosmetic cryotherapy home visit in Dorset" loading="lazy" className="w-full h-72 object-cover" />
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* How it works - text only, no photo */}
    <section id="how-it-works" className="bg-muted py-16 scroll-mt-24">
      <div className="container mx-auto max-w-4xl px-4">
        <motion.div {...fadeUp} className="text-center mb-8">
          <Snowflake className="mx-auto h-8 w-8 text-secondary mb-4" />
          <h2 className="font-serif text-3xl uppercase tracking-wide">How It Works</h2>
        </motion.div>
        <motion.div {...fadeUp} className="grid gap-6 md:grid-cols-2">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-serif text-lg mb-2">The Freezing Process</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The gas rapidly freezes the affected cells, causing the water within them to crystallise and expand. This process disrupts the cell membrane, effectively destroying the unwanted tissue while leaving the surrounding healthy skin largely unaffected.
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-serif text-lg mb-2">Natural Healing</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                As the frozen cells thaw, your body's natural healing response begins. Over the following days and weeks, the damaged tissue dries, forms a small scab or crust, and eventually sheds — allowing new, healthy skin cells to regenerate in its place.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>

    {/* What We Can Treat */}
    <section id="treatable" className="py-16 scroll-mt-24">
      <div className="container mx-auto max-w-4xl px-4 text-center">
        <motion.div {...fadeUp}>
          <Snowflake className="mx-auto h-8 w-8 text-secondary mb-4" />
          <h2 className="font-serif text-3xl mb-6 uppercase tracking-wide">What Can We Treat?</h2>
          <p className="text-muted-foreground mb-8">Common cosmetic skin features suitable for cryotherapy:</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {treatable.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <motion.div
                    className="w-16 h-16 rounded-full overflow-hidden mb-3 border-2 border-secondary/20"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <img src={item.img} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                  </motion.div>
                  <h3 className="font-serif text-base font-medium mb-1">{item.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Pricing Examples */}
    <section id="pricing" className="bg-muted py-16 scroll-mt-24">
      <div className="container mx-auto max-w-4xl px-4">
        <motion.div {...fadeUp} className="text-center mb-8">
          <Snowflake className="mx-auto h-8 w-8 text-secondary mb-4" />
          <h2 className="font-serif text-3xl uppercase tracking-wide">Pricing Guide</h2>
          <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">
            Every lesion is unique — we provide an individual quote after reviewing your photo. Below are examples to give you an idea of typical costs.
          </p>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: "Single Skin Tag or Cherry Angioma", example: "One small skin tag or cherry angioma", price: "From £50", note: "1 session" },
            { name: "Multiple Skin Tags or Cherry Angiomas", example: "2–5 lesions in the same area", price: "From £60–£80", note: "1 session" },
            { name: "Verruca", example: "Single verruca on the foot", price: "From £120", note: "May require 2–3 sessions" },
            { name: "Wart", example: "Single wart", price: "From £80", note: "May require 2–3 sessions" },
            { name: "Age Spot", example: "Single age spot (hands, face)", price: "From £50", note: "1–2 sessions" },
            { name: "Seborrheic Keratosis", example: "Raised brown/black growth", price: "From £50", note: "1–2 sessions" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-5">
                  <h3 className="font-serif text-base font-semibold mb-1">{item.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{item.example}</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold text-secondary">{item.price}</span>
                    <span className="text-xs text-muted-foreground">{item.note}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <motion.p {...fadeUp} className="text-center text-xs text-muted-foreground mt-6">
          Prices are indicative and may vary based on size, location, and number of lesions. A personalised quote will be provided after we review your photo.
        </motion.p>
        <PaymentMethodsBadge className="mt-6 max-w-sm mx-auto" />
      </div>
    </section>

    {/* Skin Type Checker */}
    <SkinTypeChecker />

    {/* Process Steps */}
    <section id="process" className="py-16 scroll-mt-24">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.h2 {...fadeUp} className="font-serif text-3xl text-center mb-10 uppercase tracking-wide">
          The Cryotherapy Process
        </motion.h2>
        <div className="space-y-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <motion.div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <step.icon className="h-5 w-5" />
                    </motion.div>
                    <div>
                      <h3 className="font-serif text-lg mb-2">Step {i + 1} — {step.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{step.content}</p>
                      {i === 0 && <CryoRequestForm />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Post Treatment Timeline */}
    <section id="post-treatment" className="py-16 scroll-mt-24">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.div {...fadeUp} className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            <Clock className="h-8 w-8 text-secondary" />
          </motion.div>
          <h2 className="font-serif text-3xl uppercase tracking-wide">Post Treatment Expectations</h2>
          <p className="text-muted-foreground mt-2">What you will likely see during the healing process</p>
        </motion.div>
        <div className="relative">
          <div className="absolute left-6 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-400 via-cyan-400 via-blue-400 to-purple-400" />
          {postTreatmentTimeline.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className={`relative pl-16 md:pl-0 pb-10 last:pb-0 md:w-1/2 ${i % 2 === 0 ? "md:pr-10 md:text-right md:ml-0" : "md:pl-10 md:ml-auto"}`}
            >
              <div className={`absolute left-3 md:left-auto ${i % 2 === 0 ? "md:right-[-18px]" : "md:left-[-18px]"} top-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${item.color} text-white shadow-lg`}>
                <Snowflake className="h-4 w-4" />
              </div>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-5">
                  <p className={`text-xs tracking-widest uppercase mb-1 font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>{item.time}</p>
                  <h3 className="font-serif text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <motion.div {...fadeUp} className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 bg-secondary/10 rounded-full px-5 py-2">
            <Sun className="h-4 w-4 text-secondary" />
            <p className="text-sm font-medium">Always apply <span className="font-bold">SPF 50</span> to the treated area when outdoors</p>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Aftercare */}
    <section id="aftercare" className="bg-muted py-16 scroll-mt-24">
      <div className="container mx-auto max-w-4xl px-4">
        <motion.div {...fadeUp} className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            <Mail className="h-8 w-8 text-secondary" />
          </motion.div>
          <h2 className="font-serif text-3xl uppercase tracking-wide">Aftercare & Follow-Up</h2>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl mx-auto">
            Aftercare for the areas treated is important for you to achieve the best possible outcome. Here's what to expect and how to care for your skin.
          </p>
        </motion.div>

        {/* Expectations */}
        <motion.div {...fadeUp} className="mb-8">
          <h3 className="font-serif text-xl mb-4 text-center">What to Expect After Treatment</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Redness & Inflammation", text: "Initial redness is normal and part of the healing process. The area may also be slightly raised." },
              { title: "Dry Scab", text: "A small dry scab may form — do not pick or pull it. Allow it to come away naturally." },
              { title: "Itching", text: "May occur within a few minutes of treatment and usually lasts up to half an hour. This is due to histamine release and is totally normal." },
              { title: "Blistering", text: "Blisters may form and can last a few hours to a few days. DO NOT pop the blister — it will go down on its own. If it bursts, clean with an alcohol-free wipe and apply antiseptic cream." },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}>
                <Card className="h-full border-0 shadow-lg">
                  <CardContent className="p-5">
                    <h4 className="font-serif text-base font-medium mb-2">{item.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Do NOT */}
        <motion.div {...fadeUp} className="mb-8">
          <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" /> Following Treatment — Do NOT:
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><span className="text-destructive font-bold">✕</span> Scratch or pick the treated area — this will cause the area to take longer to heal and may damage the skin.</li>
                <li className="flex items-start gap-2"><span className="text-destructive font-bold">✕</span> Use scrubs on the area, as this will damage the surface of the skin.</li>
                <li className="flex items-start gap-2"><span className="text-destructive font-bold">✕</span> Pop any blisters — allow them to go down naturally.</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* General Healing */}
        <motion.div {...fadeUp} className="mb-8">
          <h3 className="font-serif text-xl mb-4 text-center">General Healing Expectations</h3>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <li>• Most healing takes place in <strong>4 to 6 weeks</strong>, though it may sometimes take longer as all skin varies.</li>
                <li>• Treatments taking longer than 6 weeks to heal may need to be reviewed by your GP or clinic nurse.</li>
                <li>• If your immune system is compromised, healing may take longer and further treatment may be required.</li>
                <li>• If the treated area is tanned, cryotherapy will remove the tanning. The skin will need to repigment.</li>
                <li>• You may shower/wash as normal and use your usual cosmetics, including makeup, deodorants and moisturising creams.</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Individual Lesion Aftercare */}
        <motion.div {...fadeUp}>
          <h3 className="font-serif text-xl mb-4 text-center">Lesion-Specific Aftercare</h3>
          <Accordion type="single" collapsible className="space-y-2">
            {[
              { name: "Skin Tags", advice: "These will turn darker from the base and dry up, falling off over 1–6 weeks as the skin heals beneath. Larger tags may need a second treatment. If the tag becomes sore or rubs against clothing, it may be covered with a dressing or plaster." },
              { name: "Milia", advice: "Generally small superficial cysts filled with keratin. They usually flatten and vanish with a single treatment and require no aftercare. Follow the advice for blisters should one form." },
              { name: "Pigmentation", advice: "The area will often become red and raised, going down after a few hours. The pigment will then become darker and a dry crust will form. When the crust falls away, the new skin beneath is pink and shiny — this is NOT scarring. Use sun block minimum factor 50 to prevent the pigmentation returning." },
              { name: "Cherry Angioma / Campbell de Morgan", advice: "The area will often become red and raised, going down after a few hours. The lesion will shrink away and slowly vanish over 2–6 weeks." },
              { name: "Warts & Verrucae", advice: "As these are viral infections, they may need more than one treatment. The second treatment can be completed 4 weeks after the first. If you see black spots in the wart or verruca, it is dying away. Follow the advice for blisters should one form." },
              { name: "Pigmented Moles", advice: "Must be diagnosed as benign by a medically qualified practitioner. The mole will darken and crust over. As the fine crust slowly comes away, the tissue will shrink and be paler than surrounding skin. Use sun block (factor 50) to prevent re-pigmentation." },
              { name: "Keratosis", advice: "Must be diagnosed as benign by a medically qualified practitioner. Following treatment, they will crust and darken. As they heal, the crusting may come away in patches. The new tissue will come through paler and requires sun block (factor 50)." },
            ].map((item, i) => (
              <AccordionItem key={i} value={`lesion-${i}`} className="bg-background rounded-lg border-0 shadow-sm">
                <AccordionTrigger className="px-5 py-4 font-serif text-base hover:no-underline">{item.name}</AccordionTrigger>
                <AccordionContent className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{item.advice}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Important Info */}
        <motion.div {...fadeUp} className="mt-8">
          <Card className="border-secondary/20 bg-secondary/5 shadow-sm">
            <CardContent className="p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sun className="h-5 w-5 text-secondary" />
                <h4 className="font-serif text-base font-medium">Important</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Always use <strong>sun block (factor 50)</strong> following treatment of any pigmented lesions to prevent re-pigmentation. You may continue to wash, bathe and shower as normal — pat the area dry, do not rub. If the treated area is weeping 2 weeks after your visit, please contact us for advice.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* We Stay In Touch */}
        <motion.div {...fadeUp} className="mt-6">
          <Card className="h-full border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <h3 className="font-serif text-lg mb-2">We Stay in Touch</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">We'll send you weekly follow-up emails for four weeks to check in on your progress. You can reply with updates — we're here to support your healing.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>

    {/* Contraindications */}
    <section id="contraindications" className="py-16 scroll-mt-24">
      <div className="container mx-auto max-w-4xl px-4">
        <motion.div {...fadeUp} className="text-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </motion.div>
          <h2 className="font-serif text-3xl uppercase tracking-wide">Contraindications</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto text-sm">
            Before your session, it's crucial to review the following. These include health conditions and medications that could negatively impact your treatment. By confirming your appointment, you acknowledge that you've read and understood these contraindications.
          </p>
        </motion.div>

        {/* Oral Medications */}
        <motion.div {...fadeUp} className="mt-10 mb-4">
          <h3 className="font-serif text-xl uppercase tracking-wide flex items-center gap-2">
            <Pill className="h-5 w-5 text-destructive" /> Oral Medications
          </h3>
          <p className="text-sm text-muted-foreground mt-1">You should <strong>NOT</strong> have cryotherapy if you are taking any of the following medications.</p>
        </motion.div>

        {/* Antihistamines callout */}
        <motion.div {...fadeUp}>
          <Card className="border-destructive/20 bg-destructive/5 shadow-sm mb-4">
            <CardContent className="p-5 flex gap-4 items-start">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <Ban className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h4 className="font-serif text-base font-medium">Antihistamines</h4>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">The natural histamine produced by the body forms part of the healing response and should not be suppressed. Do not take any antihistamines for <strong>two weeks before and two weeks after</strong> cryotherapy session, as long as agreed with your GP.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Droplets, name: "Anticoagulants", drugs: "Warfarin, Heparin, Coumarin, Apixaban", action: "Prevents platelets sticking and clots forming", effect: "May cause extensive bruising" },
            { icon: Activity, name: "NSAIDs", drugs: "Aspirin, Ibuprofen, Brufen (ok in low daily dose)", action: "Reduces inflammatory response, slows healing", effect: "Extends healing time" },
            { icon: ShieldOff, name: "Immunosuppressants (Oral Steroids)", drugs: "Prednisolone, Methylprednisolone, Medrol, Cyclosporin, Azathioprine", action: "Reduces healing by preventing white blood cell activity", effect: "Prevents healing activity" },
            { icon: Thermometer, name: "Cyclooxygenase Inhibitors", drugs: "DF118, Voltarol", action: "Pain relief, reduces inflammatory response", effect: "Slows healing" },
            { icon: Skull, name: "Chemotherapy (Oral)", drugs: "Methotrexate", action: "Causes cell destruction, reduces white blood cells", effect: "Prevents healing" },
            { icon: CircleSlash, name: "Appetite Suppressants", drugs: "E.g. XLS Medical", action: "Reduces hormonal response, reduces absorption of fats & carbs", effect: "Slows the inflammatory response needed for skin healing" },
          ].map((med, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                      <med.icon className="h-4 w-4 text-destructive" />
                    </div>
                    <h4 className="font-serif text-sm font-semibold">{med.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground"><strong>Drugs:</strong> {med.drugs}</p>
                  <p className="text-xs text-muted-foreground mt-1"><strong>Action:</strong> {med.action}</p>
                  <p className="text-xs text-destructive mt-1 font-medium"><strong>Effect:</strong> {med.effect}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Health Conditions */}
        <motion.div {...fadeUp} className="mt-12 mb-4">
          <h3 className="font-serif text-xl uppercase tracking-wide flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-destructive" /> Health Conditions
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Cryotherapy is <strong>NOT</strong> suitable if you have any of the following conditions.</p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Activity, name: "Hepatitis", desc: "Including Hepatitis C, which is associated with cryoglobulinemia and compromised immune response." },
            { icon: Thermometer, name: "Diabetes", desc: "Well-controlled Type 1 diabetics with a good HbA1c and knowledge of good wound healing may optionally accept the risk of possible slow and poor healing." },
            { icon: Baby, name: "Pregnancy & Breastfeeding", desc: "Cryotherapy is not recommended during pregnancy or breastfeeding unless approved by your GP." },
            { icon: Syringe, name: "Dermal Fillers", desc: "Avoid treating any area previously treated with dermal fillers as pitting may result if the filler was not placed correctly." },
            { icon: Droplets, name: "Raynaud's Phenomenon", desc: "Affects blood supply to fingertips and toes. Narrowing of small blood vessels on exposure to cold, temperature changes, or stress." },
            { icon: ShieldOff, name: "Scleroderma", desc: "Also known as Cranial/Giant Cell Arteritis. Localised or systemic thickened skin affecting face, scalp, limbs. Can appear as oval skin patches." },
            { icon: Ban, name: "Immunosuppression", desc: "Immunodeficiency disorders where part of the immune system is missing or defective, resulting in frequent and severe infections." },
            { icon: Skull, name: "Cryoglobulinemia", desc: "Cold antibodies in the blood. Cryoglobulins precipitate unexpectedly under cold conditions. Drug use is a prime risk factor." },
            { icon: Bone, name: "Multiple Myeloma", desc: "Cancer of bone marrow plasma cells producing abnormal proteins that stop antibody production, preventing the healing process." },
            { icon: CircleSlash, name: "Pyoderma Gangrenosum", desc: "Necrotic condition causing deep ulcers, usually on the legs, leading to chronic wounds." },
            { icon: Droplets, name: "Platelet Deficiency Disease", desc: "Without enough platelets, the body cannot form clots. Can be caused by certain drugs, leukaemia, or bone marrow disorders." },
            { icon: ShieldOff, name: "Compromised Auto-Immune System", desc: "Including HTLV III, LAV, TSE, CJD, vCJD, nvCJD, or any syndrome of a similar kind." },
          ].map((cond, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                      <cond.icon className="h-4 w-4 text-destructive" />
                    </div>
                    <h4 className="font-serif text-sm font-semibold">{cond.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{cond.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp} className="mt-8">
          <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>Please note:</strong> If your immune system is in any way compromised — even by an undiagnosed condition, the flu, or a common cold — it may result in unpredictable healing. Always inform us of any health changes before starting.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>

    {/* FAQ */}
    <section id="faq" className="py-16 scroll-mt-24">
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
    <section className="py-16 scroll-mt-24">
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

    {/* Areas We Cover */}
    <section className="bg-muted py-16">
      <div className="container mx-auto max-w-4xl px-4">
        <motion.div {...fadeUp} className="text-center mb-8">
          <h2 className="font-serif text-2xl uppercase tracking-wide">Cryotherapy Home Visits Across Dorset</h2>
          <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">
            We bring cryotherapy session directly to your home. Click a town to see local details.
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

    {/* CTA */}
    <section className="bg-surface-dark py-16 text-center text-primary-foreground">
      <motion.div {...fadeUp} className="container mx-auto px-4">
        <h2 className="font-serif text-3xl uppercase tracking-wide mb-4">Interested in Cryotherapy?</h2>
        <p className="text-primary-foreground/60 mb-8 max-w-md mx-auto">
          Get in touch to discuss your skin concern and book your home visit
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
            <Link to="/contact">
              <Button
                size="lg"
                className="bg-transparent border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-surface-dark transition-all duration-300"
              >
                Contact Us to Get Started
              </Button>
            </Link>
          </motion.div>
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
        </div>
      </motion.div>
    </section>
  </SiteLayout>
  );
};

export default CryotherapyPage;
