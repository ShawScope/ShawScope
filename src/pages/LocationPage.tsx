import { useParams, Link } from "react-router-dom";
import SiteLayout from "@/components/SiteLayout";
import PageMeta from "@/components/PageMeta";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Ear, Snowflake, CheckCircle, Phone, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import TravelFeeCalculator from "@/components/TravelFeeCalculator";
import { useServicePricing } from "@/hooks/useServicePricing";
import mattHomevisit from "@/assets/matt-homevisit.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

interface LocationData {
  town: string;
  slug: string;
  county: string;
  description: string;
  nearbyTowns: string[];
  distanceFromBase: string;
  postcodeAreas: string[];
}

const locations: Record<string, LocationData> = {
  dorchester: {
    town: "Dorchester",
    slug: "dorchester",
    county: "Dorset",
    description:
      "ShawScope is based right here in Dorchester — the heart of our service area. As our home town, Dorchester appointments are always within our free travel zone. Matt provides earwax removal by microsuction and irrigation, plus cryotherapy for skin tags, warts, and more.",
    nearbyTowns: ["Poundbury", "Charminster", "Fordington", "Stinsford"],
    distanceFromBase: "Our base — free travel",
    postcodeAreas: ["DT1", "DT2"],
  },
  weymouth: {
    town: "Weymouth",
    slug: "weymouth",
    county: "Dorset",
    description:
      "ShawScope provides professional earwax removal and cryotherapy home visits throughout Weymouth and the surrounding areas. Whether you're near the seafront, Westham, Chickerell, or Preston, Matt will come directly to your home with all the specialist equipment needed.",
    nearbyTowns: ["Preston", "Sutton Poyntz", "Overcombe", "Littlemoor"],
    distanceFromBase: "8 miles from Dorchester",
    postcodeAreas: ["DT3", "DT4"],
  },
  portland: {
    town: "Portland",
    slug: "portland",
    county: "Dorset",
    description:
      "ShawScope visits Portland for earwax removal and cryotherapy appointments. Whether you're in Fortuneswell, Easton, or Southwell, Matt will come to your home with full professional ear care equipment.",
    nearbyTowns: ["Fortuneswell", "Easton", "Southwell", "Castletown"],
    distanceFromBase: "10 miles from Dorchester",
    postcodeAreas: ["DT5"],
  },
  chickerell: {
    town: "Chickerell",
    slug: "chickerell",
    county: "Dorset",
    description:
      "ShawScope provides earwax removal and cryotherapy home visits in Chickerell, just west of Weymouth. Matt brings clinical-grade equipment to your door — no clinic visits or waiting rooms needed.",
    nearbyTowns: ["Weymouth", "Abbotsbury", "Portesham", "Langton Herring"],
    distanceFromBase: "7 miles from Dorchester",
    postcodeAreas: ["DT3"],
  },
  crossways: {
    town: "Crossways",
    slug: "crossways",
    county: "Dorset",
    description:
      "ShawScope offers earwax removal and cryotherapy home visits in Crossways and the surrounding villages. Conveniently located between Dorchester and Wareham, Crossways is well within our free travel zone.",
    nearbyTowns: ["Moreton", "Owermoigne", "West Knighton", "Broadmayne"],
    distanceFromBase: "6 miles from Dorchester",
    postcodeAreas: ["DT2"],
  },
  puddletown: {
    town: "Puddletown",
    slug: "puddletown",
    county: "Dorset",
    description:
      "ShawScope provides earwax removal and cryotherapy home visits in Puddletown and nearby villages. Just a short drive from our Dorchester base, appointments here are within our free travel zone.",
    nearbyTowns: ["Tolpuddle", "Affpuddle", "Briantspuddle", "Dewlish"],
    distanceFromBase: "5 miles from Dorchester",
    postcodeAreas: ["DT2"],
  },
  cerne_abbas: {
    town: "Cerne Abbas",
    slug: "cerne_abbas",
    county: "Dorset",
    description:
      "ShawScope delivers professional earwax removal and cryotherapy home visits in Cerne Abbas and the beautiful Cerne Valley. Matt brings all equipment to your home for a comfortable, convenient experience.",
    nearbyTowns: ["Godmanstone", "Minterne Magna", "Piddletrenthide", "Nether Cerne"],
    distanceFromBase: "8 miles from Dorchester",
    postcodeAreas: ["DT2"],
  },
  maiden_newton: {
    town: "Maiden Newton",
    slug: "maiden_newton",
    county: "Dorset",
    description:
      "ShawScope offers earwax removal and cryotherapy home visits in Maiden Newton and the Frome Valley. Matt visits your home with full professional ear care equipment — no need to travel to a clinic.",
    nearbyTowns: ["Cattistock", "Frampton", "Sydling St Nicholas", "Toller Porcorum"],
    distanceFromBase: "8 miles from Dorchester",
    postcodeAreas: ["DT2"],
  },
  broadmayne: {
    town: "Broadmayne",
    slug: "broadmayne",
    county: "Dorset",
    description:
      "ShawScope provides earwax removal and cryotherapy home visits in Broadmayne and surrounding villages south-east of Dorchester. Just minutes from our base, appointments here are always in the free travel zone.",
    nearbyTowns: ["West Knighton", "Warmwell", "Owermoigne", "West Stafford"],
    distanceFromBase: "4 miles from Dorchester",
    postcodeAreas: ["DT2"],
  },
  charminster: {
    town: "Charminster",
    slug: "charminster",
    county: "Dorset",
    description:
      "ShawScope provides earwax removal and cryotherapy home visits in Charminster, just north of Dorchester. As one of our closest villages, appointments here are always within the free travel zone.",
    nearbyTowns: ["Dorchester", "Wolfeton", "Forston", "Stratton"],
    distanceFromBase: "2 miles from Dorchester",
    postcodeAreas: ["DT2"],
  },
  martinstown: {
    town: "Martinstown",
    slug: "martinstown",
    county: "Dorset",
    description:
      "ShawScope offers earwax removal and cryotherapy home visits in Martinstown (Winterborne St Martin) and the South Winterborne valley. Matt brings full professional ear care equipment to your door.",
    nearbyTowns: ["Winterborne Monkton", "Winterborne Herringston", "Upwey", "Abbotsbury"],
    distanceFromBase: "4 miles from Dorchester",
    postcodeAreas: ["DT2"],
  },
  upwey: {
    town: "Upwey",
    slug: "upwey",
    county: "Dorset",
    description:
      "ShawScope provides earwax removal and cryotherapy home visits in Upwey, nestled between Dorchester and Weymouth. Matt visits your home with professional, clinical-grade equipment.",
    nearbyTowns: ["Broadwey", "Bincombe", "Martinstown", "Littlemoor"],
    distanceFromBase: "5 miles from Dorchester",
    postcodeAreas: ["DT3"],
  },
  tolpuddle: {
    town: "Tolpuddle",
    slug: "tolpuddle",
    county: "Dorset",
    description:
      "ShawScope delivers earwax removal and cryotherapy home visits in Tolpuddle and the Piddle Valley villages. Famous for its Martyrs, Tolpuddle is well within our service area for comfortable home appointments.",
    nearbyTowns: ["Puddletown", "Affpuddle", "Milborne St Andrew", "Dewlish"],
    distanceFromBase: "7 miles from Dorchester",
    postcodeAreas: ["DT2"],
  },
};

const services = [
  {
    icon: Ear,
    name: "Earwax Removal",
    desc: "earwax", // resolved dynamically
    link: "/earwax-removal",
  },
  {
    icon: Snowflake,
    name: "Cryotherapy",
    desc: "Skin tag, wart, verruca and age spot removal. Submit photos for a free assessment.",
    link: "/cryotherapy",
  },
];

const LocationPage = () => {
  const { town } = useParams<{ town: string }>();
  const loc = town ? locations[town] : null;
  const { getServicePrice, getServiceOffers } = useServicePricing();
  const earwaxPrice = getServicePrice("earwax");
  const earwaxPriceText = earwaxPrice != null ? `£${earwaxPrice}` : "£60";
  const earwaxOffers = getServiceOffers("earwax");

  if (!loc) {
    return (
      <SiteLayout>
        <PageMeta title="Location Not Found" description="This location page could not be found." />
        <div className="py-20 text-center">
          <h1 className="text-2xl font-serif">Location not found</h1>
          <Link to="/" className="text-secondary underline mt-4 inline-block">
            Return home
          </Link>
        </div>
      </SiteLayout>
    );
  }

  // Build dynamic group discount text from offers
  const groupDiscountText = earwaxOffers.length > 0
    ? earwaxOffers.map(o => `${o.offer_name}: ${o.price_text}`).join(". ") + "."
    : "";

  const earwaxFaqs = [
    { q: `Where can I get earwax removal in ${loc.town}?`, a: `ShawScope provides professional earwax removal home visits in ${loc.town} and surrounding areas including ${loc.nearbyTowns.join(", ")}. Matt travels to your home with full professional ear care equipment — no need to visit a clinic.` },
    { q: `How much does earwax removal cost in ${loc.town}?`, a: `Earwax removal with ShawScope starts from ${earwaxPriceText} per person (both ears).${groupDiscountText ? ` ${groupDiscountText}` : ""} ${loc.distanceFromBase === "Our base — free travel" ? "There's no travel fee for Dorchester appointments." : `A small travel fee may apply based on distance (${loc.distanceFromBase}).`}` },
    { q: `Do you offer microsuction in ${loc.town}?`, a: `Yes! Matt uses both microsuction and irrigation techniques. He'll recommend the best method for you based on the type and position of your earwax. Both methods are safe, gentle, and performed at your home in ${loc.town}.` },
    { q: `Can I book a cryotherapy appointment in ${loc.town}?`, a: `Absolutely. ShawScope offers cryotherapy home visits in ${loc.town} for skin tags, warts, verrucae, age spots, and more. Simply send a photo of your lesion for a free assessment and pricing.` },
  ];

  return (
    <SiteLayout>
      <PageMeta
        title={`Earwax Removal & Cryotherapy ${loc.town} — Home Visits`}
        description={`Professional earwax removal and cryotherapy home visits in ${loc.town}, ${loc.county}. Microsuction, irrigation & cosmetic cryotherapy at your door. Covering ${loc.nearbyTowns.slice(0, 3).join(", ")} and more. Book online.`}
        path={`/locations/${loc.slug}`}
        breadcrumbs={[
          { name: "Locations", path: "/locations" },
          { name: loc.town, path: `/locations/${loc.slug}` },
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            "name": `Earwax Removal & Cryotherapy Home Visits in ${loc.town}`,
            "description": `Professional earwax removal and cryotherapy home visits in ${loc.town}, ${loc.county}. Covering ${loc.nearbyTowns.join(", ")}.`,
            "provider": {
              "@type": "MedicalBusiness",
              "name": "ShawScope",
              "url": "https://shawscope.co.uk",
              "telephone": "+441305340194",
              "address": { "@type": "PostalAddress", "addressLocality": "Dorchester", "addressRegion": "Dorset", "addressCountry": "GB" }
            },
            "areaServed": { "@type": "City", "name": loc.town },
            "serviceType": "Earwax Removal & Cryotherapy"
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": earwaxFaqs.map(f => ({
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
          <MapPin className="h-10 w-10 text-secondary mx-auto mb-4" />
          <h1 className="font-serif text-3xl sm:text-5xl uppercase tracking-wide">
            Earwax Removal &amp; Cryotherapy in {loc.town}
          </h1>
          <p className="mt-4 text-primary-foreground/60 max-w-xl mx-auto">
            Professional home visits across {loc.town} and surrounding areas
          </p>
          <p className="mt-2 text-xs text-primary-foreground/40">
            {loc.distanceFromBase} · Postcodes: {loc.postcodeAreas.join(", ")}
          </p>
        </motion.div>
      </section>

      {/* About this area */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div {...fadeUp}>
              <h2 className="font-serif text-2xl uppercase tracking-wide mb-4">
                Home Visits in {loc.town}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">{loc.description}</p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                We also cover nearby areas including <strong>{loc.nearbyTowns.join(", ")}</strong>.
              </p>
              <Link to="/book">
                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <CalendarDays className="mr-2 h-4 w-4" /> Book in {loc.town}
                </Button>
              </Link>
            </motion.div>
            <motion.div {...fadeUp} className="rounded-2xl overflow-hidden shadow-xl">
              <img
                src={mattHomevisit}
                alt={`ShawScope earwax removal home visit in ${loc.town}, Dorset`}
                loading="lazy"
                className="w-full h-72 object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-muted py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h2 className="font-serif text-2xl uppercase tracking-wide">
              Services Available in {loc.town}
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-6">
            {services.map((svc, i) => (
              <motion.div key={i} {...fadeUp}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <svc.icon className="h-8 w-8 text-secondary mb-3" />
                    <h3 className="font-serif text-lg font-medium mb-2">{svc.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {svc.desc === "earwax"
                        ? `Microsuction and irrigation — safe, gentle, and effective. From ${earwaxPriceText} per person.`
                        : svc.desc}
                    </p>
                    <Link to={svc.link} className="text-secondary text-sm underline hover:text-secondary/80">
                      Learn more →
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why home visits */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h2 className="font-serif text-2xl uppercase tracking-wide">
              Why Choose a Home Visit in {loc.town}?
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: CheckCircle, title: "No Travel Required", text: `Stay in the comfort of your own home in ${loc.town}. Matt comes to you with all the equipment needed.` },
              { icon: Star, title: "5-Star Rated", text: "Over 100 five-star Google reviews from patients across Dorset. Award-winning service you can trust." },
              { icon: MapPin, title: `Covering ${loc.town}`, text: `We serve ${loc.town} and nearby areas: ${loc.nearbyTowns.slice(0, 3).join(", ")} and more.` },
              { icon: Phone, title: "Easy Booking", text: "Book online in minutes or call 01305 340194. Choose a date and time that works for you." },
              { icon: Ear, title: "Expert Care", text: "Matt is fully trained, insured, and DBS checked. Professional microsuction and irrigation using clinical-grade equipment." },
              { icon: CalendarDays, title: "Flexible Scheduling", text: "Appointments available Monday to Saturday. We'll work around your schedule." },
            ].map((item, i) => (
              <motion.div key={i} {...fadeUp}>
                <Card>
                  <CardContent className="p-5">
                    <item.icon className="h-6 w-6 text-secondary mb-2" />
                    <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h2 className="font-serif text-2xl uppercase tracking-wide">
              Frequently Asked Questions — {loc.town}
            </h2>
          </motion.div>
          <div className="space-y-4">
            {earwaxFaqs.map((faq, i) => (
              <motion.div key={i} {...fadeUp}>
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-medium text-sm mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Travel fee */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div {...fadeUp} className="text-center mb-6">
            <h2 className="font-serif text-2xl uppercase tracking-wide">
              Travel Fee to {loc.town}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">
              {loc.distanceFromBase === "Our base — free travel"
                ? "Dorchester is our home base — no travel fee applies!"
                : `${loc.town} is ${loc.distanceFromBase}. Check your exact travel fee below.`}
            </p>
          </motion.div>
          <TravelFeeCalculator />
        </div>
      </section>

      {/* Other locations */}
      <section className="bg-muted py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div {...fadeUp} className="text-center mb-8">
            <h2 className="font-serif text-xl uppercase tracking-wide">
              We Also Cover
            </h2>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.values(locations)
              .filter(l => l.slug !== loc.slug)
              .map(l => (
                <Link
                  key={l.slug}
                  to={`/locations/${l.slug}`}
                  className="px-4 py-2 bg-card rounded-lg shadow-sm text-sm hover:bg-secondary hover:text-secondary-foreground transition-colors"
                >
                  {l.town}
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface-dark py-16 text-center text-primary-foreground">
        <motion.div {...fadeUp} className="container mx-auto px-4">
          <h2 className="font-serif text-3xl uppercase tracking-wide mb-4">
            Ready to Book in {loc.town}?
          </h2>
          <p className="text-primary-foreground/60 mb-8 max-w-md mx-auto">
            Professional earwax removal and cryotherapy at your door
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/book">
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <CalendarDays className="mr-2 h-4 w-4" /> Book Online
              </Button>
            </Link>
            <a href="tel:01305340194">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-surface-dark">
                <Phone className="mr-2 h-4 w-4" /> Call 01305 340194
              </Button>
            </a>
          </div>
        </motion.div>
      </section>
    </SiteLayout>
  );
};

export { locations };
export default LocationPage;
