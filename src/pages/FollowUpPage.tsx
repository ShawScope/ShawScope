import { useState, useRef, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Camera, Send, CheckCircle, Snowflake, X, Heart, Plus } from "lucide-react";

const weekInfo: Record<number, { title: string; tips: string[] }> = {
  1: {
    title: "Week 1 — Early Healing",
    tips: [
      "Redness and slight swelling are normal",
      "A small scab may be forming — don't pick it",
      "Mild itching is expected and should pass quickly",
      "If a blister formed, leave it alone to heal",
    ],
  },
  2: {
    title: "Week 2 — Active Healing",
    tips: [
      "The treated area may have darkened — this is normal",
      "Scabs and crusts should be forming",
      "Skin tags may be drying and shrinking",
      "Let us know if the area is weeping",
    ],
  },
  3: {
    title: "Week 3 — Regeneration",
    tips: [
      "Scabs may be starting to come away naturally",
      "New pink skin underneath is NOT scarring",
      "The area may look paler — this will blend over time",
      "Start using SPF 50 on pigmented areas",
    ],
  },
  4: {
    title: "Week 4 — Final Check",
    tips: [
      "New healthy skin should be visible",
      "Colour will continue to normalise over coming weeks",
      "You're now eligible for retreatment if needed",
      "Continue using SPF 50 on pigmented areas",
    ],
  },
};

const FollowUpPage = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const weekParam = parseInt(searchParams.get("week") || "1");
  const week = weekParam >= 1 && weekParam <= 4 ? weekParam : 1;

  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clientName, setClientName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) {
      supabase.rpc("get_appointment_by_token", { p_token: token }).then(({ data }) => {
        if (data && data.length > 0) {
          setClientName(data[0].client_name);
        }
      });
    }
  }, [token]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: { file: File; preview: string }[] = [];
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return;
      }
      if (photos.length + newPhotos.length >= 5) {
        toast.error("Maximum 5 photos allowed");
        return;
      }
      newPhotos.push({ file, preview: URL.createObjectURL(file) });
    });
    setPhotos(prev => [...prev, ...newPhotos]);
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!message.trim() && photos.length === 0) {
      toast.error("Please add a message or photo before sending");
      return;
    }
    setLoading(true);

    try {
      // Convert all photos to base64
      const photosBase64: { base64: string; name: string }[] = [];
      for (const photo of photos) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(photo.file);
        });
        photosBase64.push({ base64, name: photo.file.name });
      }

      const { error } = await supabase.functions.invoke("cryo-followup-response", {
        body: {
          accessToken: token,
          weekNumber: week,
          message: message.trim(),
          // Support both single and multiple photos
          photoBase64: photosBase64.length === 1 ? photosBase64[0].base64 : undefined,
          photoName: photosBase64.length === 1 ? photosBase64[0].name : undefined,
          photos: photosBase64.length > 1 ? photosBase64 : undefined,
        },
      });

      if (error) throw error;
      setSubmitted(true);
      toast.success("Your update has been sent!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send your update. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const info = weekInfo[week];

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="bg-surface-dark">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <Link to="/" className="font-serif text-lg tracking-wide text-primary-foreground uppercase">ShawScope</Link>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center p-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
              <Heart className="h-10 w-10 text-secondary" />
            </div>
            <h1 className="mb-3 font-serif text-3xl">Thank You!</h1>
            <p className="text-muted-foreground mb-6">
              Your update has been sent to Matt. If you've included photos, he'll review them and get back to you if anything needs attention.
            </p>
            <Link to="/">
              <Button variant="outline">Return to ShawScope</Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-surface-dark">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="font-serif text-lg tracking-wide text-primary-foreground uppercase">ShawScope</Link>
        </div>
      </header>

      <div className="flex-1 py-10">
        <div className="container mx-auto max-w-lg px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
              <Snowflake className="h-7 w-7 text-secondary" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl mb-2">{info.title}</h1>
            {clientName && <p className="text-muted-foreground">Hi {clientName}, how is your treated area healing?</p>}
          </motion.div>

          {/* Healing tips */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-lg mb-6">
              <CardContent className="p-5">
                <h3 className="font-serif text-base mb-3">What you might be seeing:</h3>
                <ul className="space-y-2">
                  {info.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Response form */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-serif text-base">Send us an update</h3>

                <Textarea
                  placeholder="How is your treated area looking? Any concerns or questions?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                  maxLength={2000}
                />

                {/* Photo upload - multiple */}
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                  
                  {photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {photos.map((photo, i) => (
                        <div key={i} className="relative inline-block">
                          <img
                            src={photo.preview}
                            alt={`Photo ${i + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border"
                          />
                          <button
                            onClick={() => removePhoto(i)}
                            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {photos.length < 5 && (
                    <Button
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                      className="gap-2"
                    >
                      {photos.length === 0 ? (
                        <><Camera className="h-4 w-4" /> Add Photos (Optional)</>
                      ) : (
                        <><Plus className="h-4 w-4" /> Add Another Photo ({photos.length}/5)</>
                      )}
                    </Button>
                  )}
                  {photos.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">{photos.length}/5 photos added</p>
                  )}
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading || (!message.trim() && photos.length === 0)}
                  className="w-full gap-2"
                >
                  {loading ? "Sending..." : <><Send className="h-4 w-4" /> Send Update</>}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Your message and photos will be sent directly to Matt for review. You can also reply to any follow-up email directly.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default FollowUpPage;