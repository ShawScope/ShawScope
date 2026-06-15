import SiteLayout from "@/components/SiteLayout";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CalendarDays, Users, Heart, Ear, Building2, Info, ArrowRight } from "lucide-react";
import eventStall from "@/assets/event-stall.jpg";
import eventEarcheck from "@/assets/event-earcheck.jpg";

const EventsPage = () => {
  return (
    <SiteLayout>
      <PageMeta
        title="Community & Workplace Events | ShawScope Clinical Services"
        description="We come to your workplace, community centre or event! Free ear checks and health screenings. Book ShawScope for your next event."
      />

      {/* Hero */}
      <section className="relative bg-muted py-16 overflow-hidden">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <p className="text-xs tracking-[0.3em] text-secondary uppercase mb-3">Community & Events</p>
            <h1 className="font-serif text-4xl md:text-5xl uppercase tracking-wide text-foreground mb-4">
              We Come to <span className="text-secondary">You</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Workplace, community centre or local event — we'll bring our clinic to your door. Completely free ear checks for everyone!
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 max-w-4xl mx-auto"
          >
            <img
              src={eventStall}
              alt="ShawScope event stall set up at a community centre"
              className="w-full aspect-[16/9] object-cover object-center"
              loading="eager"
            />
          </motion.div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="py-16 sm:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs tracking-[0.3em] text-secondary uppercase mb-2">Our Services</p>
            <h2 className="font-serif text-3xl sm:text-4xl uppercase tracking-wide">What We Offer</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {[
              {
                icon: Ear,
                title: "Free Ear Checks",
                description: "Quick, professional visual ear checks to check for wax build-up and overall ear health — completely free."
              },
              {
                icon: Heart,
                title: "No Charge for Time",
                description: "We don't charge for attending events. Our time is on us — we love raising awareness in the community!"
              },
              {
                icon: CalendarDays,
                title: "Flexible Booking",
                description: "Tell us your event details and we'll schedule a date and time that works perfectly for your attendees."
              }
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="flex flex-col items-center text-center"
              >
                <motion.div
                  className="relative flex h-24 w-24 items-center justify-center rounded-full bg-secondary/10 mb-6"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <item.icon className="h-10 w-10 text-secondary" />
                </motion.div>
                <h3 className="font-serif text-xl mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ear Check Photo & Text */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl overflow-hidden shadow-xl border border-border/50"
            >
              <img
                src={eventEarcheck}
                alt="Matt performing a free ear health check"
                className="w-full h-auto"
                loading="lazy"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-serif text-3xl uppercase tracking-wide mb-6">Expert Care,<br/>Anywhere</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We love getting out into the community! Whether it's a workplace wellness day, a community centre open event, or a local health fair — we bring our full clinical setup to you.
                </p>
                <p>
                  There's no obligation and no charge for our time. It's a great way to add value to your event while promoting better health and wellbeing.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Perfect For */}
      <section className="py-16 sm:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs tracking-[0.3em] text-secondary uppercase mb-2">Ideal Venues</p>
            <h2 className="font-serif text-3xl sm:text-4xl uppercase tracking-wide">Perfect For</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: Building2, text: "Workplaces & Offices", desc: "Corporate wellness days" },
              { icon: Users, text: "Community Centres", desc: "Local group gatherings" },
              { icon: Heart, text: "Charity Events", desc: "Fundraisers and wellbeing days" },
              { icon: Info, text: "Health Fairs", desc: "Open days and public events" },
            ].map((item, i) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="group relative overflow-hidden flex items-start gap-4 bg-muted/50 p-6 rounded-2xl border border-border/50 hover:bg-secondary/5 hover:border-secondary/20 transition-colors"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm text-secondary group-hover:scale-110 group-hover:bg-secondary group-hover:text-secondary-foreground transition-all">
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-serif text-lg mb-1">{item.text}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-secondary text-secondary-foreground text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-3xl sm:text-4xl uppercase tracking-wide mb-4">
              Want Us at Your Event?
            </h2>
            <p className="text-secondary-foreground/80 mb-8 text-lg">
              Reach out and we'll arrange everything. Just tell us the date, time and location — we'll be there!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="default" className="bg-background text-foreground hover:bg-background/90 gap-2 h-14 px-8 text-base">
                <Link to="/contact">
                  Contact Us Now
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </SiteLayout>
  );
};

export default EventsPage;