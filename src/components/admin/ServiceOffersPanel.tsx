import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, parseISO, isAfter, isBefore } from "date-fns";

interface ServiceOffer {
  id: string;
  service_id: string;
  offer_name: string;
  description: string | null;
  price_text: string;
  price_note: string | null;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  sort_order: number;
}

interface ServiceOffersPanelProps {
  serviceId: string;
  serviceName: string;
}

const ServiceOffersPanel = ({ serviceId, serviceName }: ServiceOffersPanelProps) => {
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceOffer | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceText, setPriceText] = useState("");
  const [priceNote, setPriceNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const fetchOffers = useCallback(async () => {
    const { data } = await supabase
      .from("service_offers")
      .select("*")
      .eq("service_id", serviceId)
      .order("sort_order");
    if (data) setOffers(data as ServiceOffer[]);
  }, [serviceId]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const openNew = () => {
    setEditing(null);
    setName(""); setDescription(""); setPriceText(""); setPriceNote("");
    setIsActive(true); setValidFrom(""); setValidUntil(""); setSortOrder(offers.length);
    setDialogOpen(true);
  };

  const openEdit = (offer: ServiceOffer) => {
    setEditing(offer);
    setName(offer.offer_name);
    setDescription(offer.description || "");
    setPriceText(offer.price_text);
    setPriceNote(offer.price_note || "");
    setIsActive(offer.is_active);
    setValidFrom(offer.valid_from || "");
    setValidUntil(offer.valid_until || "");
    setSortOrder(offer.sort_order);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !priceText.trim()) {
      toast.error("Name and price are required");
      return;
    }
    const payload = {
      service_id: serviceId,
      offer_name: name.trim(),
      description: description.trim() || null,
      price_text: priceText.trim(),
      price_note: priceNote.trim() || null,
      is_active: isActive,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      sort_order: sortOrder,
    };

    if (editing) {
      const { error } = await supabase.from("service_offers").update(payload).eq("id", editing.id);
      if (error) toast.error("Failed to update offer");
      else { toast.success("Offer updated"); setDialogOpen(false); fetchOffers(); }
    } else {
      const { error } = await supabase.from("service_offers").insert(payload);
      if (error) toast.error("Failed to create offer");
      else { toast.success("Offer created"); setDialogOpen(false); fetchOffers(); }
    }
  };

  const deleteOffer = async (id: string) => {
    const { error } = await supabase.from("service_offers").delete().eq("id", id);
    if (error) toast.error("Failed to delete offer");
    else { toast.success("Offer deleted"); fetchOffers(); }
  };

  const getOfferStatus = (offer: ServiceOffer) => {
    if (!offer.is_active) return { label: "Inactive", className: "bg-muted text-muted-foreground" };
    const now = new Date();
    if (offer.valid_from && isBefore(now, parseISO(offer.valid_from)))
      return { label: "Scheduled", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
    if (offer.valid_until && isAfter(now, parseISO(offer.valid_until)))
      return { label: "Expired", className: "bg-red-500/10 text-red-500 border-red-500/20" };
    return { label: "Live", className: "bg-success/10 text-success border-success/20" };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Special Offers for {serviceName}</h3>
        </div>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="h-3 w-3 mr-1" /> Add Offer
        </Button>
      </div>

      {offers.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No special offers yet. Add group discounts, seasonal promotions, or bundle deals.</p>
      ) : (
        <div className="space-y-2">
          {offers.map((offer) => {
            const status = getOfferStatus(offer);
            return (
              <Card key={offer.id} className="border">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm">{offer.offer_name}</p>
                      <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge>
                    </div>
                    {offer.description && <p className="text-xs text-muted-foreground line-clamp-1">{offer.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{offer.price_text}</span>
                      {offer.price_note && <span>· {offer.price_note}</span>}
                      {(offer.valid_from || offer.valid_until) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {offer.valid_from && format(parseISO(offer.valid_from), "dd MMM")}
                          {offer.valid_from && offer.valid_until && " – "}
                          {offer.valid_until && format(parseISO(offer.valid_until), "dd MMM yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(offer)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteOffer(offer.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? "Edit Offer" : "New Offer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Offer Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Two Person Discount" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Same household, same visit..." maxLength={300} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Price *</Label>
                <Input value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="e.g. £100 total" maxLength={50} />
                <p className="text-[10px] text-muted-foreground">Shown prominently, e.g. "£100 total" or "20% off"</p>
              </div>
              <div className="space-y-2">
                <Label>Price Note</Label>
                <Input value={priceNote} onChange={(e) => setPriceNote(e.target.value)} placeholder="e.g. That's just £50 each" maxLength={100} />
                <p className="text-[10px] text-muted-foreground">Smaller text below the price</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valid From (optional)</Label>
                <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Valid Until (optional)</Label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Leave dates empty for an always-active offer. Set dates for seasonal or limited-time promotions.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} min={0} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
            </div>
            <Button onClick={save} className="w-full">
              {editing ? "Save Changes" : "Create Offer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceOffersPanel;
