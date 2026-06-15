import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import TravelDisputeForm from "@/components/TravelDisputeForm";

const CALC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-fee-check`;

type Result = {
  distance_miles: number;
  travel_fee: number;
  within_range: boolean;
  out_of_area?: boolean;
};

const TravelFeeCalculator = () => {
  const [postcode, setPostcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const check = async () => {
    const pc = postcode.trim();
    if (!pc) return;
    setLoading(true);
    setResult(null);

    try {
      const resp = await fetch(CALC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ postcode: pc }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Something went wrong" }));
        throw new Error(err.error || "Could not check postcode");
      }

      const data: Result = await resp.json();
      setResult(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to check postcode");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="max-w-md mx-auto mt-10 rounded-2xl border bg-card p-6 shadow-lg"
    >
      <h3 className="text-lg font-semibold text-center mb-1">Check Your Travel Fee</h3>
      <p className="text-sm text-muted-foreground text-center mb-4">
        Enter your postcode to see if a travel fee applies
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
        className="flex gap-2"
      >
        <Input
          value={postcode}
          onChange={(e) => {
            setPostcode(e.target.value.toUpperCase());
            setResult(null);
          }}
          placeholder="e.g. DT4 7TJ"
          className="flex-1 text-sm uppercase"
          maxLength={10}
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !postcode.trim()} size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
        </Button>
      </form>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 overflow-hidden"
          >
            <div
              className={`rounded-xl p-4 text-center ${
                result.out_of_area
                  ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                  : result.within_range
                  ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                  : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
              }`}
            >
              {result.out_of_area ? (
                <>
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                    Sorry, we don't currently cover your area
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                    You're {result.distance_miles} miles away, which is outside our service area.
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                    However, we may make exceptions!{" "}
                    <a href="/contact" className="underline font-medium hover:text-red-900 dark:hover:text-red-300">
                      Get in touch with us here
                    </a>{" "}
                    to let us know you're interested.
                  </p>
                </>
              ) : result.within_range ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    No travel fee! 🎉
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                    You're {result.distance_miles} miles away — within our free travel area.
                  </p>
                </>
              ) : (
                <>
                  <MapPin className="h-6 w-6 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Travel fee: £{result.travel_fee.toFixed(2)}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    You're {result.distance_miles} miles away — £2.50 per mile beyond 10 miles.
                  </p>
                </>
              )}
              {/* Dispute link for all results */}
              <TravelDisputeForm
                postcode={postcode}
                calculatedDistance={result.distance_miles}
                calculatedFee={result.travel_fee}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TravelFeeCalculator;
