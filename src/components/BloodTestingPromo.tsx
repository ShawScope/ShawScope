import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Droplets, Heart, ShieldCheck, TestTube, ClipboardList, Package, FlaskConical, FileCheck, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import bloodTestResultsImg from "@/assets/blood-test-results.jpg";
import medichecksKitImg from "@/assets/medichecks-kit.webp";
import medichecksResultsImg from "@/assets/medichecks-results.webp";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const CORE_HEALTH_URL = "https://www.medichecks.com/products/core-health-blood-test?ref=SHAWSCOPE";
const HEALTH_LIFESTYLE_URL = "https://www.medichecks.com/products/health-and-lifestyle-check-blood-test?ref=SHAWSCOPE";

const bloodTests = [
  {
    title: "Core Health Blood Test — Diabetes & Cholesterol",
    description: "This blood test helps screen for diabetes and cholesterol levels and provides a quick overview of key markers linked to metabolic health.",
    markers: null,
    url: CORE_HEALTH_URL,
    icon: Heart,
  },
  {
    title: "Health & Lifestyle Blood Test",
    description: "Do you want to know whether you are at risk of common lifestyle-related conditions? Perhaps you're already taking steps to improve your diet or exercise levels and want to monitor the impact on your health. This test can help you understand your current health status and identify areas where improvements may benefit your wellbeing.",
    markers: ["Cholesterol status", "Inflammation", "Iron status", "Kidney health", "Liver health", "Proteins", "Vitamins"],
    url: HEALTH_LIFESTYLE_URL,
    icon: TestTube,
  },
];

const howItWorksSteps = [
  { icon: ClipboardList, title: "Choose a Blood Test", desc: "Browse the featured tests on the ShawScope website and select the one that's right for you." },
  { icon: ExternalLink, title: "Order Through MediChecks", desc: "Click the link to be taken to the MediChecks website to place your order." },
  { icon: Droplets, title: "Use Code SHAWSCOPE", desc: "Enter coupon code SHAWSCOPE at checkout to receive 10% off your order." },
  { icon: Package, title: "Receive Your Kit or Attend", desc: "Depending on the test, you'll either receive a home sample collection kit or attend a blood draw appointment if required." },
  { icon: FlaskConical, title: "Sample Sent to Lab", desc: "Your sample is sent to the MediChecks laboratory for professional analysis." },
  { icon: FileCheck, title: "Results Delivered", desc: "Results are delivered securely through MediChecks — clear, detailed, and easy to understand." },
];

const faqs = [
  { q: "How do I get the 10% discount?", a: "Simply click one of the blood test links on the ShawScope website and enter the coupon code SHAWSCOPE at checkout on the MediChecks website." },
  { q: "Do I need to use the ShawScope link?", a: "Yes — please use the links provided on the ShawScope website and enter the coupon code SHAWSCOPE at checkout to ensure your discount is applied." },
  { q: "Are results provided by ShawScope?", a: "No. ShawScope promotes the service through our partnership with MediChecks. All tests are processed and results are delivered directly by MediChecks." },
  { q: "Can I complete the test at home?", a: "Many MediChecks tests include a home sample collection kit. Some tests may require a blood draw appointment — full details are provided on the MediChecks product page." },
  { q: "What blood tests are available?", a: "We currently feature the Core Health Blood Test (diabetes & cholesterol screening) and the Health & Lifestyle Blood Test (comprehensive wellness check). More tests may be added in the future." },
];

interface BloodTestingPromoProps {
  variant?: "homepage" | "full";
}

const BloodTestingPromo = ({ variant = "homepage" }: BloodTestingPromoProps) => {
  const isHomepage = variant === "homepage";

  /* ── HOMEPAGE: compact single-test teaser ── */
  if (isHomepage) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <p className="text-xs tracking-[0.25em] text-secondary uppercase mb-3 font-medium">
              In Partnership with MediChecks
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl tracking-wide text-foreground mb-4">
              Private Blood Tests — 10% Off
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "5rem" }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="h-px bg-secondary mx-auto mb-6"
            />
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Order a private blood test through our partnership with MediChecks and receive{" "}
              <span className="font-semibold text-foreground">10% off</span> with code{" "}
              <span className="font-mono font-bold text-secondary">SHAWSCOPE</span>.
            </p>
          </motion.div>

          {/* Featured: Health & Lifestyle test + images */}
          <div className="grid md:grid-cols-2 gap-8 items-center mb-10">
            {/* Left – test card */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <TestTube className="h-6 w-6 text-secondary" />
                    </div>
                    <h3 className="font-serif text-lg leading-tight pt-1">Health & Lifestyle Blood Test</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    A comprehensive wellness check covering cholesterol, inflammation, iron, kidney &amp; liver health, proteins and vitamins.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {bloodTests[1].markers!.map((m) => (
                      <span key={m} className="text-xs bg-secondary/10 text-secondary rounded-full px-3 py-1 font-medium">{m}</span>
                    ))}
                  </div>
                  <a href={HEALTH_LIFESTYLE_URL} target="_blank" rel="noopener noreferrer" className="mt-auto">
                    <Button className="w-full gap-2 transition-all duration-300 hover:scale-[1.02]">
                      View This Test <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </motion.div>

            {/* Right – marketing images */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="rounded-2xl overflow-hidden shadow-md">
                <img
                  src={medichecksKitImg}
                  alt="MediChecks sample collection kit — convenient home blood testing"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-md">
                <img
                  src={bloodTestResultsImg}
                  alt="Blood test results on a smartphone — track your health from home"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </motion.div>
          </div>

          {/* Single CTA */}
          <motion.div {...fadeUp} className="text-center">
            <a href={HEALTH_LIFESTYLE_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="min-w-[260px] gap-2 transition-all duration-300 hover:scale-105">
                See All Blood Tests & Get 10% Off <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </motion.div>
        </div>

        {/* Disclaimer */}
        <div className="container mx-auto max-w-3xl px-4 mt-12">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            <span className="font-semibold text-foreground">Disclaimer:</span> ShawScope promotes this service through our partnership with MediChecks. All blood tests are processed, and results are delivered, by MediChecks.
          </p>
        </div>
      </section>
    );
  }

  /* ── FULL variant (News & Offers page) ── */
  return (
    <div className="space-y-0">
      {/* Main Promo Section */}
      <section id="blood-tests" className="py-16 scroll-mt-20">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="text-xs tracking-[0.25em] text-secondary uppercase mb-3 font-medium">
              In Partnership with MediChecks
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl tracking-wide text-foreground mb-4">
              Private Blood Tests — 10% Off for ShawScope Customers
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "5rem" }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="h-px bg-secondary mx-auto mb-6"
            />
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              ShawScope has partnered with MediChecks to give our customers access to convenient, high-quality private blood testing. Whether you're monitoring your health, checking cholesterol levels, or screening for diabetes — you can order a blood test and receive <span className="font-semibold text-foreground">10% off</span> with our exclusive coupon code.
            </p>
          </motion.div>

          {/* Coupon Code Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-12"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-secondary/10 via-secondary/5 to-secondary/10 border border-secondary/20 p-6 sm:p-8 text-center">
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="relative z-10">
                <ShieldCheck className="mx-auto h-8 w-8 text-secondary mb-3" />
                <p className="text-sm text-muted-foreground mb-2">Use coupon code at checkout</p>
                <div className="inline-block bg-background border-2 border-secondary/30 rounded-xl px-8 py-3 shadow-sm">
                  <span className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.15em] text-secondary">SHAWSCOPE</span>
                </div>
                <p className="text-sm text-muted-foreground mt-3">to receive <span className="font-semibold text-foreground">10% off</span> your blood test</p>
              </div>
            </div>
          </motion.div>

          {/* Marketing Images Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img src={medichecksKitImg} alt="MediChecks sample collection kit" className="w-full h-64 object-cover" loading="lazy" />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img src={bloodTestResultsImg} alt="Blood test results on smartphone" className="w-full h-64 object-cover" loading="lazy" />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img src={medichecksResultsImg} alt="Doctor review of blood test results with personalised feedback" className="w-full h-64 object-cover" loading="lazy" />
            </div>
          </motion.div>

          {/* Featured Blood Tests */}
          <div className="grid gap-6 md:grid-cols-2 mb-12">
            {bloodTests.map((test, i) => (
              <motion.div
                key={test.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                        <test.icon className="h-6 w-6 text-secondary" />
                      </div>
                      <h3 className="font-serif text-lg leading-tight pt-1">{test.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{test.description}</p>
                    {test.markers && (
                      <div className="mb-5">
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">This test includes:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {test.markers.map((m) => (
                            <span key={m} className="text-xs bg-secondary/10 text-secondary rounded-full px-3 py-1 font-medium">{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-auto pt-2">
                      <a href={test.url} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full gap-2 transition-all duration-300 hover:scale-[1.02]">
                          View This Test <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* CTA Buttons */}
          <motion.div {...fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={CORE_HEALTH_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="min-w-[220px] gap-2 transition-all duration-300 hover:scale-105">
                <Droplets className="h-4 w-4" /> View Blood Tests
              </Button>
            </a>
            <a href={HEALTH_LIFESTYLE_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="min-w-[220px] gap-2 transition-all duration-300 hover:scale-105">
                Get 10% Off Blood Tests <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-muted scroll-mt-20">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-serif text-3xl tracking-wide text-foreground mb-2 uppercase">
              How Private Blood Testing Works
            </h2>
            <p className="text-muted-foreground">Simple, convenient, and delivered to your door</p>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {howItWorksSteps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className="h-full border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-5 flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                          <step.icon className="h-5 w-5 text-secondary" />
                        </div>
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold">
                          {i + 1}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-serif text-sm font-semibold mb-1">{step.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="blood-test-faqs" className="py-16 bg-background scroll-mt-20">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <HelpCircle className="mx-auto h-8 w-8 text-secondary mb-3" />
            <h2 className="font-serif text-3xl tracking-wide text-foreground mb-2 uppercase">
              Blood Testing FAQs
            </h2>
          </motion.div>
          <motion.div {...fadeUp}>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-4 shadow-sm bg-card">
                  <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 bg-muted">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div {...fadeUp}>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              <span className="font-semibold text-foreground">Disclaimer:</span> ShawScope promotes this service through our partnership with MediChecks. All blood tests are processed, and results are delivered, by MediChecks. Customers should review all test information on the MediChecks website before purchasing. ShawScope does not provide medical testing or results.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default BloodTestingPromo;
