import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AlertTriangle, Clock, Info, AlertOctagon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Notice {
  title: string;
  message: string;
  notice_type: string;
  closed_from: string | null;
  closed_until: string | null;
}

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  closure: AlertTriangle,
  reduced: Clock,
  announcement: Info,
  emergency: AlertOctagon,
};

const COLOR_MAP = {
  closure: {
    homeBg: "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15",
    homeBorder: "border-amber-500/20",
    bookingBorder: "border-amber-500/30",
    bookingBg: "bg-gradient-to-r from-amber-500/10 to-orange-500/10",
    iconCircle: "bg-amber-500/20",
    icon: "text-amber-500",
    heading: "text-amber-700 dark:text-amber-300",
    text: "text-amber-600/90 dark:text-amber-200/80",
    date: "text-amber-600 dark:text-amber-400",
  },
  reduced: {
    homeBg: "bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/15",
    homeBorder: "border-blue-500/20",
    bookingBorder: "border-blue-500/30",
    bookingBg: "bg-gradient-to-r from-blue-500/10 to-indigo-500/10",
    iconCircle: "bg-blue-500/20",
    icon: "text-blue-500",
    heading: "text-blue-700 dark:text-blue-300",
    text: "text-blue-600/90 dark:text-blue-200/80",
    date: "text-blue-600 dark:text-blue-400",
  },
  announcement: {
    homeBg: "bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-teal-500/15",
    homeBorder: "border-teal-500/20",
    bookingBorder: "border-teal-500/30",
    bookingBg: "bg-gradient-to-r from-teal-500/10 to-emerald-500/10",
    iconCircle: "bg-teal-500/20",
    icon: "text-teal-500",
    heading: "text-teal-700 dark:text-teal-300",
    text: "text-teal-600/90 dark:text-teal-200/80",
    date: "text-teal-600 dark:text-teal-400",
  },
  emergency: {
    homeBg: "bg-gradient-to-r from-red-500/15 via-rose-500/10 to-red-500/15",
    homeBorder: "border-red-500/20",
    bookingBorder: "border-red-500/30",
    bookingBg: "bg-gradient-to-r from-red-500/10 to-rose-500/10",
    iconCircle: "bg-red-500/20",
    icon: "text-red-500",
    heading: "text-red-700 dark:text-red-300",
    text: "text-red-600/90 dark:text-red-200/80",
    date: "text-red-600 dark:text-red-400",
  },
};

const NoticeBanner = ({ variant = "home" }: { variant?: "home" | "booking" | "header" }) => {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    supabase
      .from("notices")
      .select("title, message, notice_type, closed_from, closed_until")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setNotice(data[0] as unknown as Notice);
      });
  }, []);

  if (!notice) return null;

  const type = (notice.notice_type || "closure") as keyof typeof COLOR_MAP;
  const c = COLOR_MAP[type] || COLOR_MAP.closure;
  const IconComp = ICON_MAP[type] || AlertTriangle;
  const showDates = type === "closure" || type === "reduced";
  const showAvailabilityHint = type === "closure" || type === "reduced";
  const statusLabel: Record<string, string> = {
    closure: "CLOSED",
    reduced: "REDUCED HOURS",
    emergency: "URGENT",
    announcement: "",
  };

  const formatDateWithDay = (dateStr: string) =>
    format(new Date(dateStr + "T00:00:00"), "EEEE, d MMMM yyyy");

  const dateStr = (() => {
    if (!showDates) return null;
    const from = notice.closed_from ? formatDateWithDay(notice.closed_from) : null;
    const until = notice.closed_until ? formatDateWithDay(notice.closed_until) : null;
    if (type === "closure") {
      if (from && until) return `${from} – ${until}`;
      if (from) return `From ${from}`;
      if (until) return `Until ${until}`;
    } else {
      if (from && until) return `${from} – ${until}`;
      if (from) return `From: ${from}`;
      if (until) return `Until: ${until}`;
    }
    return null;
  })();

  if (variant === "header") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-b-2 border-t-2 border-dashed border-foreground/20 bg-card"
        >
          <div className="container mx-auto max-w-5xl px-4 py-3">
            <div className="flex flex-col items-center gap-0.5 text-center">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-full ${c.iconCircle} shrink-0`}>
                  <IconComp className={`h-5 w-5 ${c.icon}`} />
                </div>
                <span className={`font-serif text-sm sm:text-base font-semibold uppercase tracking-wide ${c.heading}`}>{notice.title}</span>
              </div>
              {statusLabel[type] && (
                <span className={`font-serif text-xl sm:text-2xl font-bold uppercase tracking-widest ${c.heading}`}>
                  {statusLabel[type]}
                </span>
              )}
              {dateStr && (
                <span className={`text-sm sm:text-base font-bold ${c.date}`}>
                  {dateStr}
                </span>
              )}
              <span className="hidden sm:block text-xs text-foreground/70 max-w-md">{notice.message}</span>
              {showAvailabilityHint && (
                <p className="text-xs text-muted-foreground italic mt-0.5">
                  Please still check our availability — we may have appointments available before or after this period.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (variant === "booking") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border-2 ${c.bookingBorder} ${c.bookingBg} p-4 mb-6`}
        >
          <div className="flex items-start gap-3">
            <IconComp className={`h-5 w-5 ${c.icon} mt-0.5 shrink-0`} />
            <div>
              <p className={`font-semibold ${c.heading}`}>{notice.title}</p>
              <p className={`text-sm ${c.text} mt-1 whitespace-pre-line`}>{notice.message}</p>
              {dateStr && <p className={`text-xs ${c.date} mt-2 font-medium`}>{dateStr}</p>}
              {showAvailabilityHint && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Please still check our availability below — we may have appointments available before or after this period.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Home page variant (kept for backward compat but header is primary now)
  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className={`${c.homeBg} border-y-2 border-dashed border-foreground/20`}
      >
        <div className="container mx-auto max-w-4xl px-4 py-5">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${c.iconCircle} shrink-0`}>
              <IconComp className={`h-5 w-5 ${c.icon}`} />
            </div>
            <div>
              <h3 className={`font-serif text-lg font-semibold ${c.heading}`}>{notice.title}</h3>
              <p className="text-sm text-foreground/80 mt-1 whitespace-pre-line">{notice.message}</p>
              {dateStr && (
                <p className={`text-sm ${c.date} mt-2 font-semibold`}>{dateStr}</p>
              )}
              {showAvailabilityHint && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Please still check our availability — we may have appointments available before or after this period.
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
};

export default NoticeBanner;
