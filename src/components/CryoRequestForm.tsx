import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PhotoEntry {
  file: File;
  preview: string;
  description: string;
  widthMm: string;
  lengthMm: string;
  heightMm: string;
}

const CryoRequestForm = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [treatmentDescription, setTreatmentDescription] = useState("");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newPhotos: PhotoEntry[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB limit`, variant: "destructive" });
        return;
      }
      newPhotos.push({ file, preview: URL.createObjectURL(file), description: "", widthMm: "", lengthMm: "", heightMm: "" });
    });
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updatePhoto = (index: number, updates: Partial<PhotoEntry>) => {
    setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async () => {
    if (!email.trim() || !name.trim()) {
      toast({ title: "Missing details", description: "Please enter your name and email address.", variant: "destructive" });
      return;
    }
    if (photos.length === 0) {
      toast({ title: "No photos", description: "Please upload at least one photo.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const attachments = await Promise.all(
        photos.map(async (p) => ({
          filename: p.file.name,
          content: await toBase64(p.file),
          type: p.file.type,
          description: p.description,
          sizeMm: { width: p.widthMm, length: p.lengthMm, height: p.heightMm },
        }))
      );

      const { error } = await supabase.functions.invoke("cryo-request", {
        body: { name, email, treatmentDescription, attachments },
      });

      if (error) throw error;

      toast({ title: "Request sent!", description: "We'll review your photos and get back to you with a quote." });
      setOpen(false);
      setEmail("");
      setName("");
      setTreatmentDescription("");
      setPhotos([]);
    } catch (err: any) {
      toast({ title: "Something went wrong", description: err.message || "Please try again later.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="mt-3">
          <Camera className="h-4 w-4 mr-1" /> Submit Photos for Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Cryotherapy Assessment Request</DialogTitle>
          <p className="text-sm text-muted-foreground">Upload clear photos of the area(s) you'd like treated and we'll get back to you with a price.</p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="cryo-name">Your Name</Label>
            <Input id="cryo-name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cryo-email">Your Email</Label>
            <Input id="cryo-email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="cryo-treatment-desc">What would you like treated?</Label>
            <Textarea
              id="cryo-treatment-desc"
              placeholder="Describe what you'd like treated, e.g. 'I have a skin tag on my neck and a wart on my left hand that I'd like removed...'"
              value={treatmentDescription}
              onChange={(e) => setTreatmentDescription(e.target.value)}
              className="mt-1 min-h-[80px]"
            />
          </div>

          <div>
            <Label>Photos</Label>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <Button type="button" variant="outline" className="w-full mt-1" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Choose Photos
            </Button>
          </div>

          {photos.map((photo, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 relative">
              <button onClick={() => removePhoto(i)} className="absolute top-2 right-2 p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive">
                <X className="h-3 w-3" />
              </button>
              <img src={photo.preview} alt={`Upload ${i + 1}`} className="w-full h-32 object-cover rounded-md" />
              <Textarea
                placeholder="Describe this area (e.g. skin tag on neck, wart on hand...)"
                value={photo.description}
                onChange={(e) => updatePhoto(i, { description: e.target.value })}
                className="text-sm min-h-[60px]"
              />
              <div>
                <Label className="text-xs text-muted-foreground">Approximate size (mm)</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div>
                    <Input
                      type="number"
                      placeholder="Width"
                      value={photo.widthMm}
                      onChange={(e) => updatePhoto(i, { widthMm: e.target.value })}
                      className="text-sm h-8"
                      min="0"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Length"
                      value={photo.lengthMm}
                      onChange={(e) => updatePhoto(i, { lengthMm: e.target.value })}
                      className="text-sm h-8"
                      min="0"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Height"
                      value={photo.heightMm}
                      onChange={(e) => updatePhoto(i, { heightMm: e.target.value })}
                      className="text-sm h-8"
                      min="0"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Width × Length × Height off skin surface</p>
              </div>
            </div>
          ))}

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {submitting ? "Sending..." : "Send Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CryoRequestForm;
