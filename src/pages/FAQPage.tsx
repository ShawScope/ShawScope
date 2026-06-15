import PageMeta from "@/components/PageMeta";
import SiteLayout from "@/components/SiteLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { HelpCircle, CalendarDays, Ear, Snowflake, Footprints, PoundSterling, Home, Phone, Stethoscope, Clock } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

type FAQCategory = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  questions: { q: string; a: string }[];
};

const categories: FAQCategory[] = [
  {
    id: "general",
    label: "General",
    icon: HelpCircle,
    questions: [
      { q: "What is ShawScope?", a: "ShawScope is a mobile, non-diagnostic ear care and wellness service providing professional earwax removal, cosmetic cryotherapy and foot care — all delivered to your home across Dorchester, Weymouth and the wider Dorset area. We focus on comfort, hygiene and wellbeing; we don't diagnose or treat medical conditions and we don't replace assessment by a GP, audiologist or ENT specialist." },
      { q: "Who will be looking after me?", a: "Every visit is carried out personally by Matt Shaw, founder of ShawScope. Matt is fully trained and insured in microsuction earwax removal, cosmetic cryotherapy and foot care." },
      { q: "Is ShawScope registered and insured?", a: "Yes. ShawScope is fully insured with professional indemnity and public liability cover. Matt holds all relevant qualifications and follows strict standards of hygiene, infection prevention, safeguarding and professional conduct." },
      { q: "What areas do you cover?", a: "We cover locations within approximately 15 miles of Dorchester (DT2). Home visits up to 10 miles are free of travel charges. This includes Dorchester, Weymouth, Bridport, Blandford Forum, Wareham, Puddletown, Crossways, Charminster, Broadmayne, Maiden Newton, Cerne Abbas, Beaminster, and surrounding villages. Locations between 10 and 15 miles incur a small travel fee of £2.50 per mile." },
      { q: "Can you visit me if I'm outside the 15-mile radius?", a: "Our automated online booking is limited to 15 miles from Dorchester. However, if you're slightly outside this area, please get in touch via our Contact page — we may be able to make an exception on a case-by-case basis." },
      { q: "What qualifications does Matt hold?", a: "Matt holds specialist qualifications in microsuction earwax removal, cosmetic cryotherapy and foot care practice. He maintains ongoing CPD (Continuing Professional Development) to stay current with best practice." },
      { q: "Is ShawScope part of the NHS?", a: "No — ShawScope is a private, independent non-diagnostic ear care and wellness service. We operate outside the NHS but maintain high standards of hygiene, care and professional governance." },
      { q: "Is ShawScope an ENT, audiology or diagnostic service?", a: "No. ShawScope is a non-diagnostic ear care and wellness service focused on the removal of visible excess earwax where appropriate, cosmetic cryotherapy and foot care. We don't carry out medical examinations, diagnose hearing disorders or treat infections. If you have ear pain, discharge, sudden hearing change, dizziness, bleeding or any concerning symptom, please contact your GP, NHS 111 or a pharmacist before booking." },
    ],
  },
  {
    id: "booking",
    label: "Booking",
    icon: CalendarDays,
    questions: [
      { q: "How do I book an appointment?", a: "You can book online through our website by clicking 'Book an Appointment'. Choose your service, pick an available date and time, and fill in your details. You'll receive a confirmation email straight away." },
      { q: "Can I book for someone else?", a: "Yes — you can book on behalf of a family member or friend. Just enter their details during the booking process. You can also book multiple people for the same visit to save time." },
      { q: "Can I book multiple people at once?", a: "Absolutely. Our booking system supports group bookings — you can add additional attendees during the booking process. Each person will have their own consent form and appointment record." },
      { q: "What if I need to cancel or reschedule?", a: "You can cancel or reschedule using the link in your confirmation email. We ask for at least 24 hours' notice where possible so we can offer the slot to another patient." },
      { q: "Do I need a GP referral?", a: "No referral is needed for earwax removal or most cosmetic cryotherapy appointments. You can book directly with us. Cryotherapy for benign moles does require confirmed GP approval beforehand." },
      { q: "How far in advance can I book?", a: "You can book as far in advance as our calendar allows — we regularly open up new availability. We recommend booking early, especially during busy periods." },
      { q: "What happens after I book?", a: "You'll receive a confirmation email with your appointment details and a digital consent form to complete before your visit. You'll also get a reminder closer to the date, and a live ETA notification when Matt is on his way." },
      { q: "Can I book by phone?", a: "Yes — if you call and we're unable to answer, simply leave a voicemail and we'll call you back to arrange your appointment at a time that suits you." },
    ],
  },
  {
    id: "earwax",
    label: "Earwax",
    icon: Ear,
    questions: [
      { q: "What method do you use for earwax removal?", a: "We use microsuction — a widely recognised and gentle method for removing visible excess earwax. It's safe, quick, and doesn't require water, making it suitable for most people including those with perforated eardrums. Irrigation is also available where appropriate." },
      { q: "Do I need to use ear drops before my appointment?", a: "Yes, we recommend using olive oil ear drops (2–3 drops) for 3–5 days before your appointment. This softens the wax and makes removal quicker and more comfortable. Avoid using hydrogen peroxide or ear candles." },
      { q: "Is earwax removal painful?", a: "Most people find it completely painless. You may hear a gentle suction sound, but the procedure is very well tolerated. Matt will talk you through everything before starting." },
      { q: "How long does the appointment take?", a: "A typical earwax removal appointment takes around 20–30 minutes, including the initial visual ear check using an otoscope and removal of visible excess earwax from both ears if needed." },
      { q: "What if there's no wax to remove?", a: "If Matt looks in your ears and there's no significant earwax, your appointment converts to a Wellness Check at £30. A non-diagnostic hearing screening may be included if ear fit allows — this isn't always possible. If your symptoms suggest something outside our service scope, Matt will suggest you contact your GP." },
      { q: "Can you check my hearing aids during the appointment?", a: "Yes — Matt can check hearing aid filters, batteries and tubing, and give them a light clean for hygiene. ShawScope does not provide replacement parts; these must be sourced from your original NHS or private provider." },
      { q: "How often should I have my ears checked?", a: "This depends on your individual ear health. Some people produce more wax than others — especially those who wear hearing aids, earbuds, or work in dusty environments. Matt can advise on a suitable check-up interval for you." },
      { q: "Is microsuction suitable for everyone?", a: "Microsuction suits the vast majority of people, including those with perforated eardrums, grommets or previous ear surgery. Matt will always check suitability before starting. Appointments may be paused or referred onward if concerns outside our service scope are identified." },
    ],
  },
  {
    id: "cryo",
    label: "Cryotherapy",
    icon: Snowflake,
    questions: [
      { q: "What can cosmetic cryotherapy be used for?", a: "Cosmetic cryotherapy can be used on a range of benign skin lesions including skin tags, warts, verrucas, age spots, cherry angiomas, seborrhoeic keratoses, milia and pigmentation marks. We don't diagnose skin conditions — if you're unsure about a lesion, please see your GP first." },
      { q: "Is cryotherapy safe?", a: "Yes — cosmetic cryotherapy is a well-established, non-invasive procedure. It uses controlled freezing (nitrous oxide) to target lesions precisely without affecting surrounding tissue." },
      { q: "How many sessions will I need?", a: "Many lesions resolve in a single session. Some stubborn warts or verrucas may need 2–3 sessions spaced a few weeks apart. Matt will discuss this with you on the day." },
      { q: "What aftercare is needed?", a: "The treated area may blister or scab — this is normal and part of the healing process. We'll provide full aftercare instructions and follow up with you at regular intervals to check how it's healing." },
      { q: "Can you treat moles with cryotherapy?", a: "Cryotherapy can be used on benign moles, but only with confirmed GP approval. If you're unsure whether your mole is suitable, please consult your GP first and let us know their recommendation when booking." },
      { q: "Does cryotherapy hurt?", a: "You may feel a brief stinging or cold sensation, typically lasting a few seconds. Most people find it very tolerable. Any discomfort usually settles quickly afterwards." },
      { q: "Can I have multiple lesions seen to in one visit?", a: "Yes — multiple lesions can often be addressed in a single appointment. The number depends on their size, type and location. Matt will discuss a plan with you on the day." },
    ],
  },
  {
    id: "foot",
    label: "Foot Health",
    icon: Footprints,
    questions: [
      { q: "What foot health services do you offer?", a: "Our foot care service covers nail care (cutting, thickening, fungal nails), corn and callus care, verruca care, diabetic foot care, ingrown toenail care and general foot wellbeing checks. We don't diagnose medical foot conditions." },
      { q: "When will foot health services be available?", a: "Our foot health service is launching in late September 2026. You can register your interest now through our Foot Health page to be among the first to book." },
      { q: "Is the foot health service suitable for diabetics?", a: "Yes. Diabetic foot care is a key part of our service. Matt is trained to carry out thorough diabetic foot wellbeing checks and provide ongoing care advice tailored to your needs. Anything outside our scope will be referred to your GP or podiatrist." },
      { q: "How often should I see a Foot Health Practitioner?", a: "For general foot care, every 6–8 weeks is typical. Diabetic patients or those with complex foot conditions may benefit from more frequent visits. Matt will recommend a schedule based on your individual needs." },
      { q: "What's the difference between a podiatrist and a Foot Health Practitioner?", a: "Podiatrists (chiropodists) hold a degree-level qualification and can treat more complex conditions. Foot Health Practitioners are trained in routine foot care including nail cutting, callus and corn removal, and basic foot health assessments. Both play important roles in keeping your feet healthy." },
    ],
  },
  {
    id: "pricing",
    label: "Pricing",
    icon: PoundSterling,
    questions: [
      { q: "How much does earwax removal cost?", a: "Prices are displayed during the booking process and vary by service. We aim to keep our pricing transparent and competitive. You'll always see the full cost including any travel fee before confirming your booking." },
      { q: "Is there a travel fee?", a: "Home visits within 10 miles of our base in Dorchester (DT2) are free of travel charges. For locations between 10 and 15 miles, a travel fee of £2.50 per mile applies. You can check your estimated travel fee using the calculator on our homepage before booking." },
      { q: "How is the travel fee calculated?", a: "The travel fee is calculated based on the straight-line distance from our base in Dorchester (DT2 8DG) to your postcode. Visits within 10 miles have no travel fee. Between 10–15 miles, a charge of £2.50 per mile applies. Bookings beyond 15 miles are not available through online booking, but you can contact us to discuss." },
      { q: "What payment methods do you accept?", a: "We accept cash, bank transfer, card payments, and online invoices. Cash and bank transfer have no additional fees. Card payments include a 1.69% processing fee and online invoice payments include a 2.5% processing fee. For example, on a £60 appointment: cash or bank transfer is £60.00, card payment is £61.01, and an online invoice is £61.50. Payment is taken at the time of your appointment." },
      { q: "Do you offer receipts for insurance claims?", a: "Yes — we can provide itemised receipts suitable for private health insurance claims or personal records." },
      { q: "Are there any hidden charges?", a: "No. The price you see at booking is the price you pay. If a travel fee applies, it's shown clearly before you confirm. There are no consultation fees or surprise add-ons." },
    ],
  },
  {
    id: "homevisit",
    label: "Home Visits",
    icon: Home,
    questions: [
      { q: "Why do you offer home visits instead of a clinic?", a: "Home visits provide maximum comfort and convenience — especially for elderly or less mobile clients. There's no need to travel, find parking or sit in a waiting room. We bring the service to you." },
      { q: "What do I need to prepare?", a: "Just a sturdy, upright chair (a dining chair is ideal) in a well-lit room near a power socket. We bring all the professional ear care equipment needed. Full preparation details are sent with your booking confirmation, and you can also visit our First Visit page." },
      { q: "Do you see children?", a: "Our services are available for patients aged 16 and over. For younger children with ear concerns, we recommend consulting your GP as a first step." },
      { q: "What happens when Matt arrives?", a: "Matt will introduce himself, confirm your details and set up the equipment. He'll begin with a gentle visual ear check using an otoscope, explain what he sees and talk you through the plan before starting." },
      { q: "How will I know when Matt is on his way?", a: "You'll receive a live 'On My Way' notification with an estimated arrival time so you know exactly when to expect the visit. We aim to arrive on time, but please allow around 15 minutes either side in case of travel disruption." },
      { q: "Is there parking available?", a: "If possible, please keep a parking spot available near your front door. Matt travels with professional ear care equipment and appreciates easy access. You can add parking tips or directions during the booking process." },
      { q: "What infection control measures do you follow?", a: "Matt follows strict infection control protocols including hand hygiene, use of disposable equipment where appropriate, and thorough cleaning and sterilisation of reusable instruments between patients." },
    ],
  },
  {
    id: "cometous",
    label: "Come to Us",
    icon: Home,
    questions: [
      { q: "Can I come to you instead of a home visit?", a: "Yes — we offer appointments at our home in Broadmayne, Dorchester. You can select 'Come to Us' during the online booking process. There is no travel fee for these appointments." },
      { q: "When are 'Come to Us' appointments available?", a: "These are typically offered as the first or last appointment of the day. Availability is shown during the booking process." },
      { q: "What should I expect at your home appointments?", a: "You'll be welcomed into a comfortable lounge area set up with professional ear care equipment. While it's not a traditional clinic, the care is exactly the same quality as a home visit — just in our space instead of yours." },
      { q: "Are there any things I should know before visiting?", a: "Yes, please be aware: we have a cat in the house (not suitable for severe allergies), there are steps to the entrance with no disability access, parking is limited on a residential street, there may be a baby at home so it can be noisy, and this is our private home — not a clinic. We are primarily a home visiting service." },
      { q: "Do I just turn up at my appointment time?", a: "No — please wait for our confirmation text or email letting you know we're ready for you. You'll receive a notification when you can arrive. If you haven't heard from us, plan to arrive at your booked appointment time." },
      { q: "Is there a travel fee for coming to you?", a: "No — there is no travel fee for 'Come to Us' appointments. The appointment fee is the only charge." },
      { q: "How do I find your home clinic?", a: "After booking, you'll receive detailed location information including the address in Broadmayne (DT2 8DG), What3Words directions, and photos of the approach so you know exactly where to come." },
    ],
  },
  {
    id: "aftercare",
    label: "Aftercare",
    icon: Stethoscope,
    questions: [
      { q: "What aftercare advice will I receive?", a: "You'll receive personalised aftercare instructions after your appointment — either verbally, by email, or both. For cryotherapy, we also send follow-up check-ins at regular intervals to monitor your healing." },
      { q: "Can I request a copy of my records?", a: "Yes — you can request a copy of your care records at any time. We can export them securely as a password-protected PDF document and send them to you via email." },
      { q: "What should I do if I have concerns after my visit?", a: "If you experience unexpected symptoms or have any concerns after your appointment, please contact us via our Contact page or phone. For urgent medical issues, contact NHS 111, your GP or a pharmacist." },
      { q: "Will I need a follow-up appointment?", a: "It depends on the service. Earwax removal clients may find a routine check every 6–12 months helpful. Cryotherapy clients may need follow-up sessions for stubborn lesions. Matt will advise you on the day." },
      { q: "Do you send appointment reminders?", a: "Yes — we send email reminders before your appointment and follow-up messages afterwards. You can opt out of marketing messages at any time, but service-related messages will always be sent." },
    ],
  },
];

// Flatten for JSON-LD
const allFAQs = categories.flatMap(c => c.questions);

const FAQPage = () => {
  const [activeCategory, setActiveCategory] = useState("general");

  const currentCategory = categories.find(c => c.id === activeCategory) || categories[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFAQs.map(faq => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <SiteLayout>
      <PageMeta
        title="FAQs — Earwax Removal, Cryotherapy & Home Visit Questions"
        description="Frequently asked questions about ShawScope earwax removal, cryotherapy, foot health, booking, pricing, travel fees, and home visits across Dorchester and Dorset."
        path="/faqs"
      />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
            <HelpCircle className="h-10 w-10 text-secondary" />
          </motion.div>
          <h1 className="font-serif text-3xl sm:text-5xl uppercase tracking-wide">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-primary-foreground/60 max-w-xl mx-auto text-sm sm:text-base">
            Everything you need to know about our services, booking, and what to expect
          </p>
        </motion.div>
      </section>

      {/* Category navigation */}
      <section className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto max-w-5xl px-4 py-2">
          <div className="flex justify-center">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-0.5 sm:gap-1 w-full max-w-lg sm:max-w-3xl">
              {categories.map((cat, i) => (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  onClick={() => setActiveCategory(cat.id)}
                  whileHover={{ y: -4 }}
                  className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-all duration-300 group"
                >
                  <motion.div
                    className={`flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-secondary/25 ${
                      activeCategory === cat.id
                        ? "bg-secondary/25 scale-110 shadow-md shadow-secondary/25"
                        : "bg-secondary/10 group-hover:bg-secondary/25"
                    }`}
                    whileHover={{ rotate: 6 }}
                  >
                    <cat.icon className="h-4 w-4 sm:h-6 sm:w-6 text-secondary" />
                  </motion.div>
                  <span className={`text-[8px] sm:text-[11px] font-medium text-center leading-tight transition-colors duration-300 ${
                    activeCategory === cat.id ? "text-secondary" : "text-foreground group-hover:text-secondary"
                  }`}>
                    {cat.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ content */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div {...fadeUp}>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                <currentCategory.icon className="h-6 w-6 text-secondary" />
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl uppercase tracking-wide">
                {currentCategory.label}
              </h2>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {currentCategory.questions.map((faq, i) => (
                <motion.div
                  key={`${activeCategory}-${i}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                >
                  <AccordionItem
                    value={`faq-${i}`}
                    className="border border-border rounded-lg px-4 bg-card"
                  >
                    <AccordionTrigger className="text-left text-sm sm:text-base font-medium hover:text-secondary transition-colors">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 text-center bg-muted">
        <motion.div {...fadeUp} className="container mx-auto px-4">
          <Phone className="mx-auto h-8 w-8 text-secondary mb-4" />
          <h2 className="font-serif text-3xl mb-4 uppercase tracking-wide">Still Have Questions?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Can't find what you're looking for? Get in touch and we'll be happy to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button size="lg" variant="outline" className="min-w-[200px] transition-all duration-300 hover:scale-105">
                <Phone className="mr-2 h-4 w-4" /> Contact Us
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
};

export default FAQPage;
