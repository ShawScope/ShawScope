import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, CalendarDays, User, Ear, Snowflake, HeadphonesIcon, Mail, Footprints, HelpCircle, Users, Newspaper, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import NoticeBanner from "./NoticeBanner";


type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Home", path: "/", icon: Home },
  { label: "Book", path: "/book", icon: CalendarDays },
  { label: "About", path: "/about", icon: User },
  { label: "Earwax", path: "/earwax-removal", icon: Ear },
  { label: "Cryo", path: "/cryotherapy", icon: Snowflake },
  { label: "Foot Health", path: "/foot-health", icon: Footprints },
  { label: "Ear Advice", path: "/ear-advice", icon: HeadphonesIcon },
  { label: "Events", path: "/events", icon: Users },
  { label: "FAQs", path: "/faqs", icon: HelpCircle },
  { label: "News & Offers", path: "/blog", icon: Newspaper },
  { label: "Reviews", path: "/reviews", icon: Star },
  { label: "Contact", path: "/contact", icon: Mail },
];

const SiteHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Top booking bar */}
      <Link
        to="/book"
        className="subtle-pulse group flex items-center justify-center gap-2 bg-secondary py-2.5 text-center transition-all hover:brightness-110"
      >
        <CalendarDays className="h-3.5 w-3.5 text-secondary-foreground animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
        <span className="text-xs font-semibold tracking-widest text-secondary-foreground uppercase group-hover:tracking-[0.2em] transition-all duration-300">
          Book an Appointment
        </span>
        <span className="text-secondary-foreground/60 text-xs transition-transform duration-300 group-hover:translate-x-1">→</span>
      </Link>

      {/* Site-wide notice banner */}
      <NoticeBanner variant="header" />

      {/* Main nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center">
            <h1 className="text-xl tracking-[0.15em] uppercase" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 300 }}>
              <span className="text-text font-light">Shaw</span>
              <span className="text-secondary font-light">Scope</span>
            </h1>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-300 group hover:-translate-y-1",
                    isActive
                      ? "text-text"
                      : "text-text-muted"
                  )}
                >
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-secondary/25 group-hover:bg-secondary/25",
                    isActive
                      ? "bg-secondary/20 scale-110"
                      : "bg-secondary/10"
                  )}>
                    <item.icon className="h-6 w-6 text-secondary transition-transform duration-300 group-hover:rotate-6" />
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-center text-text transition-all duration-300 group-hover:text-secondary">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile toggle */}
          <Button
            variant="ghost"
            className="lg:hidden flex items-center gap-1.5 px-3"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="text-sm font-medium">{mobileOpen ? "Close" : "Menu"}</span>
          </Button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-md">
            <nav className="container mx-auto px-6 py-4 grid grid-cols-4 gap-2 max-w-sm mx-auto">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className="flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all duration-200 group active:scale-95"
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                      isActive
                        ? "bg-secondary text-secondary-foreground shadow-sm shadow-secondary/30"
                        : "bg-card border border-border/50 group-hover:border-secondary/40 group-hover:shadow-sm group-hover:shadow-secondary/20"
                    )}>
                      <item.icon className={cn(
                        "h-[18px] w-[18px] transition-colors duration-300",
                        isActive ? "text-secondary-foreground" : "text-secondary"
                      )} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium leading-tight text-center transition-colors duration-300",
                      isActive ? "text-secondary" : "text-muted-foreground"
                    )}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default SiteHeader;
