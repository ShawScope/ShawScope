import { motion } from "framer-motion";
import { CalendarDays, Home, Smile } from "lucide-react";

const steps = [
  {
    icon: CalendarDays,
    title: "Book Online",
    description: "Choose your service, pick a date and time that suits you, and book in under 2 minutes.",
  },
  {
    icon: Home,
    title: "Home Visit",
    description: "Matt arrives at your door with all the professional ear care equipment needed — no travel or waiting rooms.",
  },
  {
    icon: Smile,
    title: "Feel Better",
    description: "Enjoy immediate results, personalised aftercare advice, and follow-up support.",
  },
];

const HowItWorks = () => (
  <section className="py-16 sm:py-20 bg-muted">
    <div className="container mx-auto max-w-4xl px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <p className="text-xs tracking-[0.3em] text-secondary uppercase mb-2">Simple Process</p>
        <h2 className="font-serif text-3xl sm:text-4xl uppercase tracking-wide">How It Works</h2>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 relative">
        {/* Connecting line (desktop only) */}
        <div className="hidden sm:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-secondary/0 via-secondary/30 to-secondary/0" />

        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.6 }}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              className="relative flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10 mb-5"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                {i + 1}
              </span>
              <step.icon className="h-8 w-8 text-secondary" />
            </motion.div>
            <h3 className="font-serif text-xl mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[250px]">
              {step.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
