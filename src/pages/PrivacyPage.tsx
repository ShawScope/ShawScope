import SiteLayout from "@/components/SiteLayout";
import PageMeta from "@/components/PageMeta";
import { motion } from "framer-motion";
import {
  ShieldCheck, FileText, Database, Eye, Lock, Trash2, UserCheck,
  RefreshCw, Mail, CheckCircle, Shield, Globe, Cookie, Mic, Video, BarChart3, Megaphone, HeartHandshake,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const sectionLinks = [
  { id: "intro", label: "Intro", icon: FileText },
  { id: "collect", label: "We Collect", icon: Database },
  { id: "use", label: "How We Use", icon: Eye },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "heidi", label: "Heidi", icon: Mic },
  { id: "video", label: "Video", icon: Video },
  { id: "storage", label: "Storage", icon: Lock },
  { id: "sharing", label: "Sharing", icon: Globe },
  { id: "retention", label: "Retention", icon: Trash2 },
  { id: "rights", label: "Your Rights", icon: UserCheck },
  { id: "changes", label: "Changes", icon: RefreshCw },
  { id: "contact", label: "Contact", icon: Mail },
  { id: "consent", label: "Consent", icon: CheckCircle },
  { id: "security", label: "Security", icon: Shield },
  { id: "cookies", label: "Cookies", icon: Cookie },
  { id: "cancellation", label: "Cancellation", icon: FileText },
  { id: "conduct", label: "Conduct", icon: HeartHandshake },
];

const PrivacyPage = () => {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <SiteLayout>
      <PageMeta
        title="Terms & Conditions + Privacy Policy"
        description="ShawScope's Terms & Conditions and Privacy Policy. Learn how we collect, use, and protect your personal information, plus our service terms."
        path="/privacy"
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
            <ShieldCheck className="h-10 w-10 text-secondary" />
          </motion.div>
          <h1 className="font-serif text-3xl sm:text-5xl uppercase tracking-wide">Terms &amp; Conditions <span className="text-secondary">+</span> Privacy Policy</h1>
          <p className="mt-3 text-primary-foreground/50 text-sm">Effective Date: 01/01/2023 · Latest Review: 30/04/2026</p>
        </motion.div>
      </section>

      {/* Section navigation */}
      <section className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto max-w-5xl px-4 py-2">
          <div className="flex flex-wrap justify-center gap-1 sm:flex-nowrap">
            {sectionLinks.map((s, i) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                onClick={() => scrollTo(s.id)}
                whileHover={{ y: -4 }}
                className="flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-all duration-300 group"
              >
                <motion.div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 group-hover:bg-secondary/25 group-hover:shadow-md group-hover:shadow-secondary/25 transition-all duration-300 group-hover:scale-110"
                  whileHover={{ rotate: 6 }}
                >
                  <s.icon className="h-6 w-6 text-secondary" />
                </motion.div>
                <span className="text-[10px] font-medium text-muted-foreground group-hover:text-secondary transition-colors">
                  {s.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4 space-y-12">

          <motion.div {...fadeUp} id="intro">
            <h2 className="font-serif text-xl text-foreground mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              ShawScope ("we," "us," "our") is committed to protecting the privacy and security of our patients' personal information. This Privacy Policy explains how we collect, use, store, and protect your information when you use our services for earwax removal, cryotherapy skin lesion removal, and foot health treatments.
            </p>
          </motion.div>

          <motion.div {...fadeUp} id="collect">
            <h2 className="font-serif text-xl text-foreground mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">We collect the following personal information to provide you with our services:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Full name</li>
              <li>Home address</li>
              <li>Phone number(s) — landline and/or mobile</li>
              <li>Email address</li>
              <li>Date of birth</li>
              <li>Payment information (processed securely via Sum Up)</li>
              <li>Photos of skin lesions (for cryotherapy consultations)</li>
              <li>Hearing assessment results</li>
              <li>Ear canal health images</li>
              <li>Health questionnaire and consent form responses</li>
              <li>Consultation and care notes</li>
            </ul>
          </motion.div>

          <motion.div {...fadeUp} id="use">
            <h2 className="font-serif text-xl text-foreground mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>To provide, manage, and deliver our clinical services.</li>
              <li>To communicate with you regarding appointments, reminders, and follow-ups via email and SMS.</li>
              <li>To process payments securely through Sum Up.</li>
              <li>To maintain accurate patient records and consultation notes.</li>
              <li>To send digital consent forms and collect your signed responses prior to treatment.</li>
              <li>To share clinical images with you upon your consent.</li>
              <li>To request feedback or reviews after your appointment.</li>
              <li>To calculate travel fees for home visit appointments.</li>
            </ul>
          </motion.div>

          <motion.div {...fadeUp} id="analytics">
            <h2 className="font-serif text-xl text-foreground mb-3">4. Operational Statistics & Service Insights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To run ShawScope safely and efficiently we collect and review aggregated operational data drawn from your appointments. This is used internally to plan our service and is never sold or shared with third parties for marketing.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Locations visited</strong> — postcodes, towns and travel distances are logged so we can plan routes, calculate travel fees, build our service-area heatmap, and decide where to expand.</li>
              <li><strong className="text-foreground">Appointment activity</strong> — service types, durations, kit/stock used, and clinical outcomes (e.g. wax removed, lesions treated) to monitor quality and stock levels.</li>
              <li><strong className="text-foreground">Financial reporting</strong> — anonymised income, expenses and payment methods for tax, accounting and business planning.</li>
              <li><strong className="text-foreground">Website analytics</strong> — basic page-view and booking-funnel statistics via Google Analytics 4 to understand how patients find and use the site. No personally identifiable browsing data is sold or shared.</li>
              <li><strong className="text-foreground">Recall &amp; outcome tracking</strong> — when treatments are due to be repeated and how patients respond to recall reminders.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Wherever possible these statistics are reviewed in aggregated or anonymised form. Identifiable care records are kept separate and only accessed by the practitioner under secure 2FA login.
            </p>
          </motion.div>

          <motion.div {...fadeUp} id="marketing">
            <h2 className="font-serif text-xl text-foreground mb-3">5. Marketing Communications</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                We may occasionally contact existing patients with relevant service updates, recalls (e.g. an annual ear health check), seasonal offers, new services, and ShawScope news by email or SMS.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Marketing messages are only sent to patients who have <strong className="text-foreground">opted in</strong> during booking or via a consent form.</li>
                <li>Every marketing email contains an <strong className="text-foreground">unsubscribe</strong> link and SMS opt-outs are honoured immediately.</li>
                <li>We do not share, sell, or rent your contact details to any third-party marketers.</li>
                <li>Campaign performance (e.g. open and click rates) is recorded in aggregate to help us improve future communications.</li>
              </ul>
            </div>
          </motion.div>

          <motion.div {...fadeUp} id="heidi">
            <h2 className="font-serif text-xl text-foreground mb-3">6. Appointment Recording &amp; Transcription (Heidi)</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                To improve the accuracy of our care notes, the practitioner uses an application called <strong className="text-foreground">Heidi</strong> on a personal device during your appointment. Heidi records the spoken consultation and produces a written transcription and summary.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-foreground">Stored locally on the device</strong> — audio recordings remain on the practitioner's device and are <strong className="text-foreground">not uploaded, sold, or shared</strong> with any third party.</li>
                <li><strong className="text-foreground">Transcription only</strong> — the resulting text summary and transcription are pasted into your secure ShawScope clinical record so that your notes accurately reflect what was discussed.</li>
                <li><strong className="text-foreground">Audio is deleted</strong> from the device once the transcription has been added to your record.</li>
                <li><strong className="text-foreground">Secure clinical storage</strong> — once added to your record, your notes are stored within the ShawScope platform on encrypted, role-restricted infrastructure (provided by Lovable Cloud, our backend host) with access protected by 2FA-secured admin login, Row-Level Security policies, and TLS encryption in transit.</li>
                <li>You may ask the practitioner not to use Heidi at any time without affecting your treatment.</li>
              </ul>
            </div>
          </motion.div>

          <motion.div {...fadeUp} id="video">
            <h2 className="font-serif text-xl text-foreground mb-3">7. Video Recording for Marketing (Meta Glasses)</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                With your explicit opt-in, the practitioner may record short video clips of your appointment using <strong className="text-foreground">Meta smart glasses</strong>. This is entirely optional and only happens where written consent has been provided.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-foreground">Full consent at booking</strong> — you choose whether to opt in via the booking form or consent form; if you do not opt in, no video is recorded.</li>
                <li><strong className="text-foreground">Withdraw at any time</strong> — you can withdraw consent before, during, or after the appointment by telling the practitioner or emailing matt@shawscope.co.uk. Any unpublished footage of you will be deleted, and we will make reasonable efforts to remove already-published material.</li>
                <li><strong className="text-foreground">Use of footage</strong> — clips may be used on our social media channels, the ShawScope website, paid digital advertising, and occasionally in printed promotional materials.</li>
                <li><strong className="text-foreground">Storage</strong> — footage is stored on the practitioner's device and within our secure cloud storage (Lovable Cloud / Google Workspace), accessible only to the practitioner.</li>
                <li><strong className="text-foreground">Children</strong> — video consent for under-18s must be given by a parent or legal guardian.</li>
              </ul>
            </div>
          </motion.div>

          <motion.div {...fadeUp} id="storage">
            <h2 className="font-serif text-xl text-foreground mb-3">8. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We store your personal information securely using the following platforms and services:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>ShawScope Website &amp; Booking System</strong> — Our website (shawscope.co.uk) handles online appointment bookings, consent forms, patient records, consultation notes, and appointment management. The platform is hosted on Lovable Cloud with PostgreSQL storage protected by Row-Level Security, encrypted at rest and in transit (TLS), with admin access secured by 2FA and biometric device protection.</li>
              <li><strong>Lovable Cloud Storage</strong> — Clinical images, consent PDFs, and uploaded files are stored in private buckets and only accessible via short-lived signed URLs generated server-side; they cannot be browsed publicly.</li>
              <li><strong>Sum Up</strong> — Used to process card payments securely. We do not store your full card details ourselves.</li>
              <li><strong>Google Workspace</strong> — Used for email communications (e.g., appointment confirmations, follow-ups).</li>
              <li><strong>SwitchboardFREE</strong> — Used for voicemail services. Voicemail recordings are deleted monthly.</li>
              <li><strong>Pie Software</strong> — Used for tax and accounting purposes only. No patient names or clinical data are stored in this system; only anonymised financial transaction records.</li>
            </ul>
          </motion.div>

          <motion.div {...fadeUp} id="sharing">
            <h2 className="font-serif text-xl text-foreground mb-3">9. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not share your personal information with anyone except as described in this policy. With your consent, we may share clinical images and health data with you. We do not sell, rent, or trade your personal information to third parties. Data is only shared with the third-party service providers listed above for the sole purpose of delivering our services to you.
            </p>
          </motion.div>

          <motion.div {...fadeUp} id="retention">
            <h2 className="font-serif text-xl text-foreground mb-3">10. Data Retention</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Our retention periods follow NHS and UK healthcare record-keeping guidelines:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-foreground">Adult patients (aged 18 and over at time of treatment):</strong> Records are retained for <strong className="text-foreground">8 years</strong> from the date of your last appointment (or 8 years after death). After this period, all personal data — including appointment records, consent forms, consultation notes, clinical images, and any uploaded files — is permanently and automatically deleted from our systems.</li>
                <li><strong className="text-foreground">Children and young persons (under 18 at time of treatment):</strong> Records are retained until your <strong className="text-foreground">25th birthday</strong> (or <strong className="text-foreground">26th birthday</strong> if you were 17 at the conclusion of treatment), in line with NHS guidance on the retention of health records for minors.</li>
                <li><strong className="text-foreground">Voicemail recordings</strong> via SwitchboardFREE are deleted monthly.</li>
                <li><strong className="text-foreground">Heidi audio recordings</strong> are deleted from the device once transcribed into your clinical record.</li>
                <li><strong className="text-foreground">Marketing video footage</strong> is retained while it is in active campaign use; on withdrawal of consent we delete unpublished clips and remove published material where reasonably possible.</li>
                <li><strong className="text-foreground">Financial records</strong> are retained in anonymised form as required by UK tax legislation.</li>
              </ul>
              <p>
                This automated retention process ensures compliance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. You may also request early deletion of your data at any time (see Your Rights below), subject to any overriding legal obligations.
              </p>
            </div>
          </motion.div>

          <motion.div {...fadeUp} id="rights">
            <h2 className="font-serif text-xl text-foreground mb-3">11. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Under data protection law, you have the right to access, correct, or delete your personal information held by us. You can also withdraw your consent for us to use your information at any time. To exercise any of these rights, please contact us using the details below.
            </p>
          </motion.div>

          <motion.div {...fadeUp} id="changes">
            <h2 className="font-serif text-xl text-foreground mb-3">12. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices, services, or legal requirements. We will notify you of any significant changes by posting the updated policy on our website with a revised review date.
            </p>
          </motion.div>

          <motion.div {...fadeUp} id="contact">
            <h2 className="font-serif text-xl text-foreground mb-3">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <p className="font-medium text-foreground mt-2">ShawScope · 01305 340194 · matt@shawscope.co.uk</p>
          </motion.div>

          <motion.div {...fadeUp} id="consent">
            <h2 className="font-serif text-xl text-foreground mb-3">14. Consent</h2>
            <p className="text-muted-foreground leading-relaxed">
              By using our services — including booking appointments through our website, completing consent forms, and attending treatment sessions — you consent to the collection, use, and storage of your personal information as described in this Privacy Policy.
            </p>
          </motion.div>

          <motion.div {...fadeUp} id="security">
            <h2 className="font-serif text-xl text-foreground mb-3">15. Security Measures</h2>
            <p className="text-muted-foreground leading-relaxed">
              We take the security of your personal information seriously and implement reasonable technical and organisational measures to protect your data against unauthorised access, alteration, disclosure, or destruction. Our booking system and patient records use encrypted connections (SSL/TLS), secure authentication, and role-based access controls.
            </p>
          </motion.div>

          <motion.div {...fadeUp} id="cookies">
            <h2 className="font-serif text-xl text-foreground mb-3">16. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our website may use cookies and similar technologies to enhance your browsing experience. These are limited to essential functionality such as session management. We do not use third-party advertising or analytics tracking cookies. You can control cookie usage through your browser settings.
            </p>
          </motion.div>

          <motion.div {...fadeUp} id="cancellation">
            <h2 className="font-serif text-xl text-foreground mb-3">17. Cancellation Policy</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                We kindly ask for <strong className="text-foreground">at least 24 hours' notice</strong> if you need to cancel or reschedule your appointment.
              </p>
              <p>
                If an appointment is cancelled with less than 24 hours' notice, we may charge a <strong className="text-foreground">50% cancellation fee</strong> based on the cost of your booked service. This will be waived in exceptional circumstances at our discretion.
              </p>
              <p>
                To cancel or reschedule, please contact us by:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Email:</strong> <a href="mailto:matt@shawscope.co.uk" className="underline text-secondary hover:text-secondary/80">matt@shawscope.co.uk</a></li>
                <li><strong className="text-foreground">Telephone:</strong> <a href="tel:01305340194" className="underline text-secondary hover:text-secondary/80">01305 340194</a></li>
              </ul>
              <p>
                This policy helps us keep our business running smoothly and allows us to continue offering low-cost services to all our clients. We appreciate your understanding and cooperation.
              </p>
            </div>
          </motion.div>

          <motion.div {...fadeUp} id="conduct">
            <h2 className="font-serif text-xl text-foreground mb-3">18. Patient Conduct &amp; Right to Refuse Service</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                ShawScope is committed to providing a safe, respectful and professional environment for both our patients and our practitioner. As a mobile, single-practitioner home-visiting service, mutual respect is essential to the safe delivery of care.
              </p>
              <p>
                We <strong className="text-foreground">do not tolerate</strong> rude, abusive, threatening, discriminatory or inappropriate behaviour or comments of any kind — whether in person, by phone, by SMS, by email, or via our online forms and booking system. This includes (but is not limited to) verbal abuse, intimidation, harassment, sexually inappropriate conduct, discriminatory remarks, or aggressive behaviour towards the practitioner or anyone associated with ShawScope.
              </p>
              <p>
                We also expect the treatment environment within your home to be safe and suitable. This includes a clean working area, appropriate supervision of pets, and that the patient is not under the influence of alcohol or illicit substances at the time of the appointment.
              </p>
              <p>
                <strong className="text-foreground">We reserve the right to refuse, pause, or end any treatment or service at any time</strong> — including on arrival or mid-appointment — if the practitioner feels uncomfortable, unsafe, disrespected, or that continuing would be clinically inappropriate. In such cases:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>The appointment will be ended and the practitioner will leave the premises immediately.</li>
                <li>The full appointment fee may still be charged at our discretion to cover the visit and time allocated.</li>
                <li>We reserve the right to decline future bookings and to remove the individual from our patient list.</li>
                <li>Serious incidents (including threats or assault) will be reported to the police.</li>
              </ul>
              <p>
                By booking an appointment with ShawScope you agree to these conduct expectations. We thank the overwhelming majority of our patients for the warmth and kindness shown during home visits — it is genuinely appreciated.
              </p>
            </div>
          </motion.div>

          <motion.p {...fadeUp} className="text-center font-medium text-foreground pt-6">
            Thank you for choosing ShawScope. We are dedicated to providing you with exceptional service while protecting your privacy.
          </motion.p>
        </div>
      </section>
    </SiteLayout>
  );
};

export default PrivacyPage;
