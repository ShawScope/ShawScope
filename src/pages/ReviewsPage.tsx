import { Star, ExternalLink, Quote, Award, Heart, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import SiteLayout from "@/components/SiteLayout";
import PageMeta from "@/components/PageMeta";

const GOOGLE_REVIEWS_URL = "https://www.google.com/search?sca_esv=467342054b4434cd&hl=en-GB&biw=1912&bih=948&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOXcMjxWu1wkof_5bCjiVrx2781h6Nu0zeA_VxTWxzpHBd-Kqq57DKyFG5PSXPiRx_xUqApEs1kwauygQCDl56pfsiOh5uXr6uWrTrmA-6b4Oi_ctQZG1eLrL95bD3TapCmGe43M%3D&q=ShawScope+Earwax+Removal+%26+Cryotherapy+Reviews&sa=X&ved=2ahUKEwiY-fL60eGSAxUYXUEAHa61ODQQ0bkNegQIHxAH";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const reviews = [
  {
    name: "Sarah M.",
    text: "Matt was fantastic — professional, gentle, and made me feel completely at ease. My hearing improved immediately after the earwax removal. Highly recommend ShawScope!",
    rating: 5,
    service: "Earwax Removal",
  },
  {
    name: "David P.",
    text: "Brilliant home visit service. Matt arrived on time, explained everything clearly, and the whole process was quick and painless. Five stars all round!",
    rating: 5,
    service: "Earwax Removal",
  },
  {
    name: "Linda T.",
    text: "I was nervous about cryotherapy but Matt was so reassuring and professional. The skin tag was gone in seconds. Such a convenient service coming to your home.",
    rating: 5,
    service: "Cryotherapy",
  },
  {
    name: "James R.",
    text: "Had earwax removed from both ears — the difference is incredible. Matt was punctual, friendly, and very thorough. Will definitely use ShawScope again.",
    rating: 5,
    service: "Earwax Removal",
  },
  {
    name: "Margaret W.",
    text: "So glad I found ShawScope. The home visit was so much more convenient than travelling to a clinic. Matt was lovely and the procedure was over in no time.",
    rating: 5,
    service: "Earwax Removal",
  },
  {
    name: "Paul H.",
    text: "Had a verruca treated with cryotherapy. Matt explained the process step by step and it was quick and virtually painless. Fantastic service.",
    rating: 5,
    service: "Cryotherapy",
  },
  {
    name: "Christine B.",
    text: "Matt was incredibly professional and put me at ease straight away. The visual ear check was thorough and he explained everything really clearly. Highly recommended!",
    rating: 5,
    service: "Ear Wellness Check",
  },
  {
    name: "Robert K.",
    text: "Excellent service from start to finish. The online booking was easy, I got reminders before the appointment, and Matt was brilliant. Can't fault it.",
    rating: 5,
    service: "Earwax Removal",
  },
  {
    name: "Helen S.",
    text: "Had multiple skin tags removed in one visit. Matt was gentle, efficient, and the aftercare advice was really helpful. Would recommend to anyone.",
    rating: 5,
    service: "Cryotherapy",
  },
];

const stats = [
  { icon: Star, label: "Google Rating", value: "5.0" },
  { icon: Heart, label: "Happy Patients", value: "100+" },
  { icon: Shield, label: "Fully Insured", value: "Yes" },
  { icon: Award, label: "Award Finalist", value: "2025" },
];

const ReviewsPage = () => {
  return (
    <SiteLayout>
      <PageMeta
        title="Patient Reviews | ShawScope Earwax Removal & Cryotherapy"
        description="Read what our patients say about ShawScope's home visit earwax removal and cryotherapy services across Dorset. 5-star Google reviews."
        path="/reviews"
      />

      {/* Hero */}
      <section className="bg-background py-16 md:py-24">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <motion.div {...fadeUp}>
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-7 w-7 fill-secondary text-secondary" />
              ))}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              What Our Patients Say
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We're proud to maintain a 5-star rating on Google with over 100 reviews — every one from a real client who experienced our friendly, professional home-visit service across Dorset. Founded in 2023 by Matt Shaw.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-4 text-center"
              >
                <stat.icon className="h-5 w-5 text-secondary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="bg-muted py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((review, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.5 }}
                className="rounded-xl border border-border bg-card p-5 flex flex-col"
              >
                <Quote className="h-5 w-5 text-secondary/40 mb-3" />
                <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
                  "{review.text}"
                </p>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{review.name}</p>
                    <p className="text-[11px] text-muted-foreground">{review.service}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-secondary text-secondary" />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div {...fadeUp} transition={{ delay: 0.3, duration: 0.5 }} className="text-center mt-12 space-y-4">
            <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2 transition-all duration-300 hover:scale-105">
                <Star className="h-4 w-4 fill-secondary-foreground text-secondary-foreground" />
                Read All Reviews on Google
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
            <p className="text-xs text-muted-foreground">
              All reviews are from verified Google users and are publicly visible.
            </p>
          </motion.div>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalBusiness",
            name: "ShawScope Earwax Removal & Cryotherapy",
            url: "https://shawscope.co.uk/reviews",
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "5.0",
              reviewCount: "100",
              bestRating: "5",
              worstRating: "5",
            },
            review: reviews.slice(0, 5).map((r) => ({
              "@type": "Review",
              author: { "@type": "Person", name: r.name },
              reviewRating: {
                "@type": "Rating",
                ratingValue: String(r.rating),
                bestRating: "5",
              },
              reviewBody: r.text,
            })),
          }),
        }}
      />
    </SiteLayout>
  );
};

export default ReviewsPage;
