import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Ear, Snowflake, Footprints, Clock, MapPin, CreditCard, Tag, Loader2, ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import SiteLayout from "@/components/SiteLayout";
import PageMeta from "@/components/PageMeta";
import PaymentMethodsBadge from "@/components/PaymentMethodsBadge";
import { useServicePricing } from "@/hooks/useServicePricing";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  ear: Ear,
  cryo: Snowflake,
  foot: Footprints,
};

const getIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("ear") || lower.includes("hearing") || lower.includes("wellness")) return Ear;
  if (lower.includes("cryo") || lower.includes("skin") || lower.includes("lesion")) return Snowflake;
  if (lower.includes("foot") || lower.includes("podiat")) return Footprints;
  return Ear;
};

const PricingPage = () => {
  const { services, offers, loading } = useServicePricing();

  return (
    <SiteLayout>
      <PageMeta
        title="Pricing | ShawScope Earwax Removal & Cryotherapy"
        description="Transparent pricing for ShawScope home visit earwax removal, cryotherapy, and foot health services across Dorset. No hidden fees."
        path="/pricing"
      />

      {/* Hero */}
      <section className="bg-background py-16 md:py-24">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <motion.div {...fadeUp}>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No hidden fees, no surprises. See our full pricing below — what you see is what you pay.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services Pricing */}
      <section className="bg-muted py-16">
        <div className="container mx-auto max-w-5xl px-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((svc, idx) => {
                const Icon = getIcon(svc.name);
                const svcOffers = offers.filter(o => o.service_id === svc.id);
                return (
                  <motion.div
                    key={svc.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08, duration: 0.5 }}
                    className="rounded-xl border border-border bg-card p-6 flex flex-col"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="rounded-lg bg-secondary/10 p-2.5">
                        <Icon className="h-5 w-5 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{svc.name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{svc.duration_minutes} minutes</span>
                        </div>
                      </div>
                    </div>

                    {svc.description && (
                      <p className="text-sm text-muted-foreground mb-4 flex-1">{svc.description}</p>
                    )}

                    <div className="mt-auto pt-4 border-t border-border">
                      <p className="text-2xl font-bold text-foreground">
                        {svc.price != null ? `£${svc.price.toFixed(2)}` : "POA"}
                      </p>

                      {svcOffers.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {svcOffers.map((offer) => (
                            <div
                              key={offer.id}
                              className="rounded-lg bg-secondary/10 border border-secondary/20 p-2.5"
                            >
                              <div className="flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5 text-secondary" />
                                <span className="text-xs font-semibold text-secondary">
                                  {offer.offer_name}
                                </span>
                              </div>
                              <p className="text-xs text-foreground font-medium mt-1">
                                {offer.price_text}
                              </p>
                              {offer.price_note && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {offer.price_note}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Hearing Screening & No Wax Note */}
      <section className="bg-background py-8">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Ear className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold text-foreground">Hearing Screening Information</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Hearing screening is not always suitable for everyone and is dependent on ear fit suitability — it is not always possible to perform. Our hearing screening is complimentary as part of the service.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">No wax found?</strong> If no significant wax is present, your appointment reverts to an <strong className="text-foreground">Ear Wellness Check at £30</strong> — with or without a hearing screen, dependent on ear fit suitability.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Travel Fees */}
      <section className="bg-background py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div {...fadeUp} className="rounded-xl border border-border bg-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-lg bg-secondary/10 p-2.5">
                <MapPin className="h-5 w-5 text-secondary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Travel Fees</h2>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="text-lg">✅</span>
                <div>
                  <p className="font-medium text-foreground">Within 10 miles of Dorchester (DT2)</p>
                  <p>No travel fee — completely free</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">🚗</span>
                <div>
                  <p className="font-medium text-foreground">10–15 miles from Dorchester</p>
                  <p>£2.50 per mile travel fee applies</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">📍</span>
                <div>
                  <p className="font-medium text-foreground">Beyond 15 miles</p>
                  <p>
                    Not available for online booking.{" "}
                    <Link to="/contact" className="text-secondary hover:underline">
                      Contact us
                    </Link>{" "}
                    to discuss.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              Travel fees are calculated automatically during booking based on your postcode. The total cost including any travel fee is shown before you confirm.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="bg-muted py-12">
        <div className="container mx-auto max-w-3xl px-4 text-center space-y-6">
          <motion.div {...fadeUp}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 text-secondary" />
              <h2 className="text-xl font-bold text-foreground">Payment Methods</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Cash and Bank Transfer payments have no additional fees. Card payments include a 1.69% processing fee and online invoices include a 2.5% processing fee.
            </p>
            <PaymentMethodsBadge />
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background py-16">
        <div className="container mx-auto max-w-3xl px-4 text-center space-y-4">
          <motion.div {...fadeUp}>
            <h2 className="text-2xl font-bold text-foreground mb-2">Ready to Book?</h2>
            <p className="text-muted-foreground mb-6">
              Choose your service, pick a date and time, and we'll come to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/book">
                <Button size="lg" className="gap-2">
                  Book an Appointment
                </Button>
              </Link>
              <Link to="/reviews">
                <Button size="lg" variant="outline" className="gap-2">
                  <Star className="h-4 w-4 fill-secondary text-secondary" />
                  Read Our Reviews
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </SiteLayout>
  );
};

export default PricingPage;
