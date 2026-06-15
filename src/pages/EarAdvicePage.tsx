import PageMeta from "@/components/PageMeta";
import SiteLayout from "@/components/SiteLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Ear, CalendarDays, Plane, Sun, Droplets, Volume2, AlertCircle, Info, Headphones, Baby, Shield, Waves, ThermometerSun, Pill } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const sectionLinks = [
  { id: "intro", label: "Overview", icon: Info },
  { id: "topics", label: "Topics", icon: Droplets },
  { id: "concerned", label: "Get Help", icon: Ear },
];

const topics = [
  {
    icon: Droplets,
    title: "What Is Earwax?",
    content: "Earwax (cerumen) is a natural substance produced by glands in the ear canal. It plays an important role in protecting your ears by trapping dust, debris, and bacteria before they can reach the eardrum. In most cases, earwax naturally works its way out of the ear — but sometimes it can build up, especially if you use earbuds, hearing aids, or cotton buds regularly.",
  },
  {
    icon: AlertCircle,
    title: "Signs of Earwax Build-Up",
    content: "Common signs include a feeling of fullness or pressure in the ear, muffled hearing, earache, tinnitus (ringing in the ears), dizziness, or itchiness. If you notice any of these, it may be worth having your ears checked by a professional.",
  },
  {
    icon: Plane,
    title: "Why Do My Ears Pop on a Plane?",
    content: "When a plane ascends or descends, the air pressure in the cabin changes faster than the pressure in your middle ear can equalise. This causes the eardrum to stretch slightly, creating that familiar 'popping' sensation. Swallowing, yawning, or gently pinching your nose and blowing can help equalise the pressure. Earwax build-up can sometimes make this feeling more noticeable.",
  },
  {
    icon: Sun,
    title: "Seasonal Ear Comfort",
    content: "During colder months, some people notice more wax build-up as the body produces extra cerumen to protect the ear canal. In warmer weather, swimming or water exposure can cause wax to swell and feel blocky. Being aware of these seasonal patterns can help you stay ahead of discomfort.",
  },
  {
    icon: Volume2,
    title: "Hearing & Everyday Life",
    content: "Even a small amount of excess earwax can affect how clearly you hear. If sounds seem muffled, you're turning the TV up louder than usual, or you're asking people to repeat themselves, it could be a simple wax issue rather than a hearing problem. A quick ear check can help clarify things.",
  },
  {
    icon: Ear,
    title: "Looking After Your Ears",
    content: "Avoid inserting cotton buds, hair grips, or other objects into your ears — these can push wax deeper and risk damage to the canal or eardrum. Instead, let your ears self-clean naturally. If you're prone to wax build-up, using olive oil drops once or twice a week can help keep things comfortable.",
  },
  {
    icon: Headphones,
    title: "Earbuds, AirPods & Hearing Aids",
    content: "Wearing in-ear devices regularly can push wax deeper into the canal and prevent it from migrating out naturally. If you use earbuds, AirPods, or hearing aids daily, you may be more prone to wax build-up. Wiping your devices clean after each use and giving your ears regular breaks can help. If you notice increased fullness or reduced sound quality, it may be time for a check-up.",
  },
  {
    icon: Waves,
    title: "Swimming & Water in the Ears",
    content: "Water trapped in the ear canal after swimming or bathing can cause a feeling of blockage, and may soften existing wax causing it to swell and block the canal. Tilting your head to the side and gently pulling the earlobe can help water drain out. If the feeling persists, avoid poking the ear — a professional check is the safest option.",
  },
  {
    icon: ThermometerSun,
    title: "Ear Infections — When to See a GP",
    content: "Ear infections can cause pain, discharge, reduced hearing, and sometimes fever. While earwax removal can help with blockages, infections require medical treatment. If you experience severe ear pain, discharge (especially if it's coloured or smelly), or sudden hearing changes, please see your GP promptly. ShawScope can help identify whether your symptoms may be wax-related or need medical referral.",
  },
  {
    icon: Baby,
    title: "Children & Ear Health",
    content: "Children's ear canals are smaller and more sensitive than adults'. While ShawScope's services are available for ages 16 and over, parents should watch for signs of ear discomfort in younger children — such as tugging at the ear, irritability, or difficulty hearing. A GP is the best first port of call for children's ear concerns.",
  },
  {
    icon: Shield,
    title: "Protecting Your Hearing",
    content: "Prolonged exposure to loud noise — whether from concerts, power tools, or even prolonged headphone use at high volume — can cause gradual hearing damage. Using ear protection in noisy environments and following the 60/60 rule (listening at no more than 60% volume for no more than 60 minutes at a time) are simple steps to protect your long-term hearing health.",
  },
  {
    icon: Pill,
    title: "Olive Oil Drops — Do They Work?",
    content: "Olive oil ear drops are a safe, natural way to soften earwax before professional removal. Using 2–3 drops of room-temperature olive oil in each ear for 3–5 days before your appointment can make the removal process quicker and more comfortable. Avoid using ear candles, hydrogen peroxide, or other home remedies that may irritate or damage the ear canal.",
  },
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const EarAdvicePage = () => (
  <SiteLayout>
    <PageMeta
      title="Ear Care Advice — Earwax, Hearing & Ear Health Tips"
      description="Expert ear care advice from ShawScope. Learn about earwax, blocked ears, flying tips, swimming guidance and when to book professional earwax removal in Dorset."
      path="/ear-advice"
    />
    {/* Hero */}
    <section className="bg-surface-dark py-12 sm:py-20 text-center text-primary-foreground">
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
          <Info className="h-10 w-10 text-secondary" />
        </motion.div>
        <h1 className="font-serif text-3xl sm:text-5xl uppercase tracking-wide">Ear Advice & Information</h1>
        <p className="mt-3 text-primary-foreground/60 max-w-xl mx-auto text-sm sm:text-base">
          Simple, general insights into common ear-related experiences
        </p>
      </motion.div>
    </section>

    {/* Section navigation */}
    <section className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b shadow-sm">
      <div className="container mx-auto max-w-5xl px-4 py-2">
        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1 w-full max-w-xs sm:max-w-sm">
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

    {/* Intro */}
    <section id="intro" className="py-12 sm:py-16 scroll-mt-24">
      <div className="container mx-auto max-w-3xl px-4 text-center">
        <motion.div {...fadeUp}>
          <p className="text-base leading-relaxed text-muted-foreground">
            At ShawScope, we know that feeling comfortable and confident about your ears can make everyday life easier. This section is designed to offer simple, general insights into common ear-related experiences that many people notice in day-to-day life. All information is shared to support general awareness and personal comfort only.
          </p>
          <p className="mt-4 text-sm text-muted-foreground italic">
            If you ever have concerns about symptoms, discomfort, or anything that feels unusual, we always recommend contacting a GP, pharmacist, or appropriate healthcare professional.
          </p>
        </motion.div>
      </div>
    </section>

    {/* Topics */}
    <section id="topics" className="bg-muted py-12 sm:py-16 scroll-mt-24">
      <div className="container mx-auto max-w-4xl px-4">
        <motion.h2 {...fadeUp} className="font-serif text-3xl text-center mb-10 uppercase tracking-wide">
          Common Topics
        </motion.h2>
        <div className="grid gap-6 md:grid-cols-2">
          {topics.map((topic, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <motion.div
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 mb-4"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <topic.icon className="h-6 w-6 text-secondary" />
                  </motion.div>
                  <h3 className="font-serif text-lg mb-3">{topic.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{topic.content}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section id="concerned" className="py-12 sm:py-16 text-center scroll-mt-24">
      <motion.div {...fadeUp} className="container mx-auto px-4">
        <Ear className="mx-auto h-8 w-8 text-secondary mb-4" />
        <h2 className="font-serif text-3xl mb-4 uppercase tracking-wide">Concerned About Your Ears?</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          If you're experiencing discomfort, fullness, or muffled hearing, a simple ear check could help.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/earwax-removal">
            <Button size="lg" variant="outline" className="min-w-[200px] transition-all duration-300 hover:scale-105">
              <Ear className="mr-2 h-4 w-4" /> Earwax Removal Services
            </Button>
          </Link>
          <Link to="/book">
            <Button size="lg" className="min-w-[200px] transition-all duration-300 hover:scale-105">
              <CalendarDays className="mr-2 h-4 w-4" /> Book an Appointment
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  </SiteLayout>
);

export default EarAdvicePage;
