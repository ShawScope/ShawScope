import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteLayout from "@/components/SiteLayout";
import PageMeta from "@/components/PageMeta";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <SiteLayout>
      <PageMeta
        title="Page Not Found"
        description="The page you're looking for doesn't exist."
      />
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden py-20">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-secondary blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Large 404 number */}
            <h1 className="font-serif text-[8rem] leading-none font-bold text-primary/15 sm:text-[12rem]">
              404
            </h1>

            {/* Heading */}
            <motion.h2
              className="mt-[-2rem] font-serif text-3xl text-foreground sm:text-4xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Page Not Found
            </motion.h2>

            {/* Description */}
            <motion.p
              className="mx-auto mt-4 max-w-md text-lg text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              Sorry, the page{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground">
                {location.pathname}
              </code>{" "}
              doesn't exist. It may have been moved or removed.
            </motion.p>

            {/* Action buttons */}
            <motion.div
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Button asChild size="lg" className="gap-2">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link to="/book">
                  <Search className="h-4 w-4" />
                  Book an Appointment
                </Link>
              </Button>
            </motion.div>

            {/* Quick links */}
            <motion.div
              className="mt-12 rounded-lg border bg-card p-6 shadow-sm max-w-lg mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.5 }}
            >
              <p className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Popular pages
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { to: "/earwax-removal", label: "Earwax Removal" },
                  { to: "/cryotherapy", label: "Cryotherapy" },
                  { to: "/foot-health", label: "Foot Health" },
                  { to: "/about", label: "About" },
                  { to: "/contact", label: "Contact" },
                ].map((link) => (
                  <Button key={link.to} asChild variant="ghost" size="sm">
                    <Link to={link.to} className="text-primary hover:text-primary/80">
                      {link.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </SiteLayout>
  );
};

export default NotFound;
