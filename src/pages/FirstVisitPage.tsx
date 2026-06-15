import PageMeta from "@/components/PageMeta";
import SiteLayout from "@/components/SiteLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Armchair, Lightbulb, Droplets, Clock, CheckCircle, FileText, CreditCard, ShieldCheck, Smile, Plug, MapPin } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const prepSteps = [
  {
    icon: Armchair,
    title: "Comfortable Seating",
    description: "Have a sturdy chair ready — ideally an upright dining chair rather than a sofa. This helps Matt access your ears safely and comfortably.",
  },
  {
    icon: Lightbulb,
    title: "Good Lighting",
    description: "Choose a well-lit room, ideally near a window or with a bright overhead light. This helps during the examination.",
  },
  {
    icon: Plug,
    title: "Power Socket Nearby",
    description: "Matt's equipment needs a standard power socket. Please ensure there's one accessible near where you'll be seated.",
  },
  {
    icon: Droplets,
    title: "Use Olive Oil Drops",
    description: "For earwax removal: apply 2–3 drops of olive oil in each ear for 3–5 days before your appointment. This softens the wax for easier removal.",
  },
  {
    icon: MapPin,
    title: "Clear Parking Access",
    description: "If possible, keep a parking spot available near your front door. Matt travels with professional ear care equipment and appreciates easy access.",
  },
];

const dayOfSteps = [
  {
    icon: Clock,
    title: "Be Ready on Time",
    description: "Matt will arrive at your booked time. You'll receive a notification when he's on his way with a live ETA so you know exactly when to expect him.",
  },
  {
    icon: FileText,
    title: "Consent Form",
    description: "You'll be sent a digital consent form before your appointment. Please complete it ahead of time — it covers your medical history and consent for the visit.",
  },
  {
    icon: CheckCircle,
    title: "The Examination",
    description: "Matt will begin with a thorough visual ear check using an otoscope. He'll explain everything before any care begins.",
  },
  {
    icon: Smile,
    title: "The Appointment",
    description: "The session is gentle and typically takes 20–30 minutes. Matt will talk you through each step. Most clients feel immediate relief — especially with earwax removal.",
  },
  {
    icon: CreditCard,
    title: "Payment",
    description: "Payment is taken at the end of your appointment. We accept contactless card, chip & pin, bank transfer, and cash.",
  },
  {
    icon: ShieldCheck,
    title: "Aftercare Advice",
    description: "You'll receive personalised aftercare instructions. For cryotherapy, we'll follow up with you at regular intervals to check healing progress.",
  },
];

const FirstVisitPage = () => (
  <SiteLayout>
    <PageMeta
      title="Your First Visit — What to Expect | ShawScope Home Visits"
      description="Everything you need to know before your first ShawScope home visit. How to prepare, what happens during your appointment, and aftercare advice."
      path="/first-visit"
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
          <CalendarDays className="h-10 w-10 text-secondary" />
        </motion.div>
        <h1 className="font-serif text-3xl sm:text-5xl uppercase tracking-wide">
          Your First Visit
        </h1>
        <p className="mt-3 text-primary-foreground/60 max-w-xl mx-auto text-sm sm:text-base">
          Everything you need to know to prepare for your home appointment
        </p>
      </motion.div>
    </section>

    {/* Preparation */}
    <section className="py-12 sm:py-16">
      <div className="container mx-auto max-w-4xl px-4">
        <motion.h2 {...fadeUp} className="font-serif text-3xl text-center mb-3 uppercase tracking-wide">
          Before Your Appointment
        </motion.h2>
        <motion.p {...fadeUp} className="text-center text-muted-foreground mb-10 max-w-lg mx-auto">
          A few simple things you can do to make sure your visit goes smoothly
        </motion.p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {prepSteps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <motion.div
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 mb-4"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <step.icon className="h-6 w-6 text-secondary" />
                  </motion.div>
                  <h3 className="font-serif text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* On the Day */}
    <section className="bg-muted py-12 sm:py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.h2 {...fadeUp} className="font-serif text-3xl text-center mb-3 uppercase tracking-wide">
          On the Day
        </motion.h2>
        <motion.p {...fadeUp} className="text-center text-muted-foreground mb-10 max-w-lg mx-auto">
          Here's what to expect when Matt arrives at your door
        </motion.p>

        <div className="space-y-6">
          {dayOfSteps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="flex gap-4 items-start"
            >
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/15 text-secondary font-bold text-sm">
                  {i + 1}
                </div>
              </div>
              <div>
                <h3 className="font-serif text-lg mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-12 sm:py-16 text-center">
      <motion.div {...fadeUp} className="container mx-auto px-4">
        <Smile className="mx-auto h-8 w-8 text-secondary mb-4" />
        <h2 className="font-serif text-3xl mb-4 uppercase tracking-wide">Ready to Book?</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Your first visit is easier than you think. Book your home appointment today.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/faqs">
            <Button size="lg" variant="outline" className="min-w-[200px] transition-all duration-300 hover:scale-105">
              View FAQs
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

export default FirstVisitPage;
