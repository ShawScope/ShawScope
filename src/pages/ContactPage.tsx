import SiteLayout from "@/components/SiteLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CalendarDays, Phone, Mail, Clock, MessageCircle, Zap, Heart, MapPin, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PageMeta from "@/components/PageMeta";
import mattPortrait from "@/assets/matt-portrait.jpg";
import shawscopeVan from "@/assets/shawscope-van.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const sectionLinks = [
  { id: "help", label: "We're Here", icon: Heart },
  { id: "reach-us", label: "Reach Us", icon: Mail },
  { id: "expect", label: "What to Expect", icon: Clock },
  { id: "area", label: "Service Area", icon: MapPin },
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const ContactPage = () => (
  <SiteLayout>
    <PageMeta
      title="Contact ShawScope — Earwax Removal & Cryotherapy Dorset"
      description="Get in touch with ShawScope. Call 01305 340194 or email matt@shawscope.co.uk. Mobile earwax removal and cryotherapy home visits across Dorchester, Weymouth and Dorset."
      path="/contact"
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
          <MessageCircle className="h-10 w-10 text-secondary" />
        </motion.div>
        <h1 className="font-serif text-4xl sm:text-5xl uppercase tracking-wide">Get in Touch</h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-4 text-primary-foreground/60 max-w-xl mx-auto"
        >
          We'd love to hear from you — whether it's a question, a booking enquiry, or just to say hello
        </motion.p>
      </motion.div>
    </section>

    {/* Section navigation */}
    <section className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b shadow-sm">
      <div className="container mx-auto max-w-5xl px-4 py-2">
        <div className="flex justify-center">
          <div className="grid grid-cols-4 gap-0.5 sm:gap-1 w-full max-w-xs sm:max-w-md">
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

    {/* Intro with photo */}
    <section id="help" className="py-16 scroll-mt-24">
      <div className="container mx-auto max-w-5xl px-4">
        <motion.div {...fadeUp} className="grid gap-10 md:grid-cols-2 items-center">
          <div>
            <h2 className="font-serif text-2xl mb-4 uppercase tracking-wide">We're Here to Help</h2>
            <p className="text-base leading-relaxed text-muted-foreground mb-4">
              ShawScope is a part-time business, but that doesn't mean we're slow to respond. We take pride in being accessible and getting back to you as quickly as possible.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              Whether you'd like to ask about a treatment, send us a photo of a skin concern, or simply find out more about what we offer — don't hesitate to reach out.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl overflow-hidden shadow-xl"
          >
            <img src={mattPortrait} alt="Matt, ShawScope founder" loading="lazy" className="w-full h-72 object-cover object-top" />
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Contact Methods */}
    <section id="reach-us" className="bg-muted py-16 scroll-mt-24">
      <div className="container mx-auto max-w-4xl px-4">
        <motion.div {...fadeUp} className="text-center mb-10">
          <h2 className="font-serif text-3xl uppercase tracking-wide">How to Reach Us</h2>
          <p className="text-muted-foreground mt-2">Choose whichever method suits you best</p>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Email */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Mail className="h-6 w-6" />
                  </motion.div>
                  <div>
                    <h3 className="font-serif text-lg">Email</h3>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-secondary" />
                      <p className="text-xs text-secondary font-medium">Quickest way to reach us</p>
                    </div>
                  </div>
                </div>
                <a href="mailto:matt@shawscope.co.uk" className="text-lg font-serif hover:text-secondary transition-colors block mb-3">
                  matt@shawscope.co.uk
                </a>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Email is the quickest way to contact us. We typically respond <span className="font-semibold text-foreground">within 6 hours</span>. Perfect for sending photos, asking questions, or booking enquiries.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Phone className="h-6 w-6" />
                  </motion.div>
                  <div>
                    <h3 className="font-serif text-lg">Telephone Voicemail Line</h3>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">We return calls same day</p>
                    </div>
                  </div>
                </div>
                <a href="tel:01305340194" className="text-lg font-serif hover:text-secondary transition-colors block mb-3">
                  01305 340194
                </a>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  As a part-time business — Matt continues to work full-time — we take voicemails rather than live calls due to the nature of home visits. Please leave a message and we'll aim to call you back <span className="font-semibold text-foreground">the same day, before 8pm</span>. If we can't reach you, we'll try again the next day.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        {/* WhatsApp */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-6"
        >
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <MessageSquare className="h-6 w-6" />
                </motion.div>
                <div>
                  <h3 className="font-serif text-lg">WhatsApp</h3>
                  <p className="text-xs text-muted-foreground">Message Matt directly</p>
                </div>
              </div>
              <a
                href="https://wa.me/447444653593"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-serif hover:text-secondary transition-colors block mb-3"
              >
                Chat on WhatsApp →
              </a>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Prefer to message? Send Matt a WhatsApp message and we'll reply as soon as we can — great for quick questions or sharing photos.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>

    {/* Response expectations */}
    <section id="expect" className="py-16 scroll-mt-24">
      <div className="container mx-auto max-w-4xl px-4">
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
          <h2 className="font-serif text-3xl uppercase tracking-wide">What to Expect</h2>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Heart,
              title: "Part-Time, Full Commitment",
              desc: "ShawScope is a part-time business, but our commitment to every client is full-time. We respond as soon as we can and always aim to be helpful.",
            },
            {
              icon: Mail,
              title: "Email: Within 6 Hours",
              desc: "Email is our fastest channel. You'll typically hear back within 6 hours — often much sooner. Great for photos, questions, and booking requests.",
            },
            {
              icon: Phone,
              title: "Voicemail: Before 8pm",
              desc: "As a part-time business alongside full-time work, we take voicemails due to the nature of home visits. We aim to return your call the same day, before 8pm.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                <CardContent className="p-6 text-center">
                  <motion.div
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 mx-auto mb-3"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <item.icon className="h-6 w-6 text-secondary" />
                  </motion.div>
                  <h3 className="font-serif text-base font-medium mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Service area with van photo */}
    <section id="area" className="bg-muted py-16 scroll-mt-24">
      <div className="container mx-auto max-w-5xl px-4">
        <motion.div {...fadeUp} className="grid gap-10 md:grid-cols-2 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl overflow-hidden shadow-xl"
          >
            <img src={shawscopeVan} alt="ShawScope mobile service vehicle" loading="lazy" className="w-full h-72 object-cover" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-6 w-6 text-secondary" />
              <h2 className="font-serif text-2xl uppercase tracking-wide">Our Service Area</h2>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground mb-4">
              We provide home visits across Dorset, covering Dorchester and the surrounding areas. Our fully mobile service means we come to you — no need to travel.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              If you're unsure whether we cover your area, just get in touch and we'll be happy to let you know.
            </p>
          </div>
        </motion.div>
      </div>
    </section>

    {/* CTA */}
    <section className="bg-surface-dark py-16 text-center text-primary-foreground">
      <motion.div {...fadeUp} className="container mx-auto px-4">
        <h2 className="font-serif text-3xl uppercase tracking-wide mb-4">Ready to Book?</h2>
        <p className="text-primary-foreground/60 mb-8 max-w-md mx-auto">
          Skip the phone and book your appointment directly online
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

export default ContactPage;