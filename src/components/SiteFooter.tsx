import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

const SiteFooter = () => (
  <footer className="bg-surface-dark py-10 text-primary-foreground">
    <div className="container mx-auto px-4">
      <div className="grid gap-8 sm:grid-cols-3 text-sm">
        <div>
          <h2 className="text-2xl tracking-[0.15em] uppercase mb-2" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 300 }}>
            <span className="text-primary-foreground font-light">Shaw</span>
            <span className="text-secondary font-light">Scope</span>
          </h2>
          <p className="text-primary-foreground/60 leading-relaxed">
            Comfort and Wellbeing, Brought to Your Home.
            <span className="block mt-2 text-primary-foreground/50 text-xs">Founded in 2023 by Matt Shaw. A friendly local home-visit service.</span>
          </p>
        </div>
        <div>
          <h4 className="font-medium mb-3 text-primary-foreground/80">Quick Links</h4>
          <nav className="flex flex-col gap-2 text-primary-foreground/60">
            <Link to="/book" className="hover:text-primary-foreground transition-colors">Book Appointment</Link>
            <Link to="/earwax-removal" className="hover:text-primary-foreground transition-colors">Earwax Removal</Link>
            <Link to="/cryotherapy" className="hover:text-primary-foreground transition-colors">Cryotherapy</Link>
            <Link to="/about" className="hover:text-primary-foreground transition-colors">About Us</Link>
          </nav>
        </div>
        <div>
          <h4 className="font-medium mb-3 text-primary-foreground/80">Contact</h4>
          <div className="flex flex-col gap-2 text-primary-foreground/60">
            <p>📞 01305 340194</p>
            <a href="mailto:matt@shawscope.co.uk" className="hover:text-primary-foreground transition-colors">
              📧 matt@shawscope.co.uk
            </a>
            <Link to="/privacy" className="hover:text-primary-foreground transition-colors">Terms &amp; Conditions + Privacy Policy</Link>
            <Link to="/privacy#cancellation" className="hover:text-primary-foreground transition-colors">Cancellation Policy</Link>
          </div>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-primary-foreground/10 flex flex-col items-center gap-2 text-xs text-primary-foreground/40">
        <p className="max-w-2xl text-center text-primary-foreground/50 leading-relaxed px-2">
          ShawScope is a non-diagnostic ear care and wellness service. We do not diagnose or treat medical conditions and do not replace assessment by a GP, audiologist or ENT specialist. If you have ear pain, discharge, sudden hearing change, dizziness, bleeding or any concerning symptom, please contact your GP, NHS 111 or a pharmacist.
        </p>
        <p className="text-primary-foreground/40 text-xs">Registered with the Information Commissioner&apos;s Office (ICO).</p>
        <Link
          to="/login"
          className="text-primary-foreground/20 hover:text-primary-foreground/40 transition-colors"
          aria-label="Admin access"
        >
          <Lock className="h-4 w-4" />
        </Link>
        <span>© {new Date().getFullYear()} ShawScope. All rights reserved.</span>
        <Link
          to="/parklyscope"
          className="text-primary-foreground/30 hover:text-primary-foreground/60 transition-colors flex items-center gap-1 text-[10px] tracking-wider"
        >
          Powered by Parkly<span className="text-secondary/60">Scope</span>
        </Link>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
