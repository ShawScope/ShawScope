import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarDays, Save, Trash2, Megaphone, Eye, EyeOff, AlertTriangle, Info, Clock, AlertOctagon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const NOTICE_TYPES = [
  { value: "closure", label: "Holiday Closure", icon: CalendarDays, color: "amber", description: "Practice fully closed" },
  { value: "reduced", label: "Reduced Hours", icon: Clock, color: "blue", description: "Open with limited hours" },
  { value: "announcement", label: "General Announcement", icon: Info, color: "teal", description: "Important info for patients" },
  { value: "emergency", label: "Emergency / Urgent", icon: AlertOctagon, color: "red", description: "Unexpected closures or issues" },
] as const;

type NoticeType = typeof NOTICE_TYPES[number]["value"];

interface Notice {
  id: string;
  title: string;
  message: string;
  notice_type: string;
  closed_from: string | null;
  closed_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const NoticesTab = () => {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [noticeType, setNoticeType] = useState<NoticeType>("closure");
  const [closedFrom, setClosedFrom] = useState<Date | undefined>();
  const [closedUntil, setClosedUntil] = useState<Date | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchNotice = async () => {
    const { data } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      const n = data[0] as unknown as Notice;
      setNotice(n);
      setTitle(n.title);
      setMessage(n.message);
      setNoticeType((n.notice_type || "closure") as NoticeType);
      setClosedFrom(n.closed_from ? new Date(n.closed_from + "T00:00:00") : undefined);
      setClosedUntil(n.closed_until ? new Date(n.closed_until + "T00:00:00") : undefined);
    } else {
      setNotice(null);
      setTitle("");
      setMessage("");
      setNoticeType("closure");
      setClosedFrom(undefined);
      setClosedUntil(undefined);
    }
    setLoading(false);
  };

  useEffect(() => { fetchNotice(); }, []);

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please enter a title and message");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      message: message.trim(),
      notice_type: noticeType,
      closed_from: closedFrom ? format(closedFrom, "yyyy-MM-dd") : null,
      closed_until: closedUntil ? format(closedUntil, "yyyy-MM-dd") : null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (notice) {
      const { error } = await supabase.from("notices").update(payload).eq("id", notice.id);
      if (error) { toast.error("Failed to update notice"); setSaving(false); return; }
      toast.success("Notice updated — now live on the website");
    } else {
      const { error } = await supabase.from("notices").insert(payload);
      if (error) { toast.error("Failed to create notice"); setSaving(false); return; }
      toast.success("Notice published — now live on the website");
    }
    await fetchNotice();
    setSaving(false);
  };

  const handleClear = async () => {
    if (!notice) return;
    setSaving(true);
    const { error } = await supabase.from("notices").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", notice.id);
    if (error) { toast.error("Failed to clear notice"); setSaving(false); return; }
    toast.success("Notice cleared — removed from the website");
    setNotice(null);
    setTitle("");
    setMessage("");
    setNoticeType("closure");
    setClosedFrom(undefined);
    setClosedUntil(undefined);
    setSaving(false);
  };

  const activeType = NOTICE_TYPES.find(t => t.value === noticeType) || NOTICE_TYPES[0];
  const showDates = noticeType === "closure" || noticeType === "reduced";

  const formatDateWithDay = (d: Date) => format(d, "EEEE, d MMMM yyyy");

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="font-serif text-2xl font-bold text-foreground">Notices</h2>
        <p className="text-sm text-muted-foreground mt-1">Create and manage public-facing practice notices, closures, and announcements</p>
      </div>
      {/* Status indicator */}
      <Card className="border-orange-800/50 bg-gradient-to-br from-orange-950/60 to-orange-900/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Megaphone className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">Practice Notices</CardTitle>
                <CardDescription className="text-orange-200/70">
                  Create announcements that display on the homepage and booking page
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {notice && title.trim() && message.trim() ? (
                <>
                  <Switch
                    checked={notice.is_active}
                    className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-muted border border-border"
                    onCheckedChange={async (checked) => {
                      const { error } = await supabase.from("notices").update({ is_active: checked, updated_at: new Date().toISOString() }).eq("id", notice.id);
                      if (error) { toast.error("Failed to update"); return; }
                      toast.success(checked ? "Notice is now live" : "Notice removed from website");
                      await fetchNotice();
                    }}
                  />
                  {notice.is_active ? (
                    <Badge className="bg-green-600/80 text-white border-green-500/50">
                      <Eye className="h-3 w-3 mr-1" /> Live
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                      <EyeOff className="h-3 w-3 mr-1" /> Off
                    </Badge>
                  )}
                </>
              ) : (
                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                  <EyeOff className="h-3 w-3 mr-1" /> No active notice
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editor */}
      <Card className="border-border bg-card/40">
        <CardHeader>
          <CardTitle className="text-base text-white">Notice Editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Notice Type */}
          <div className="space-y-2">
            <Label className="text-white">Notice Type</Label>
            <Select value={noticeType} onValueChange={(v) => setNoticeType(v as NoticeType)}>
              <SelectTrigger className="bg-muted/60 border-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTICE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <t.icon className="h-4 w-4" />
                      <span>{t.label}</span>
                      <span className="text-muted-foreground text-xs">— {t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={noticeType === "closure" ? "e.g. Holiday Closure Notice" : noticeType === "reduced" ? "e.g. Reduced Hours This Week" : noticeType === "emergency" ? "e.g. Temporary Closure" : "e.g. New Service Available"}
              className="bg-muted/60 border-border text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Message</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={noticeType === "closure" ? "e.g. We will be closed for the Christmas period..." : noticeType === "reduced" ? "e.g. We will be operating reduced hours, mornings only..." : noticeType === "emergency" ? "e.g. Due to unforeseen circumstances..." : "e.g. We are pleased to announce..."}
              rows={4}
              className="bg-muted/60 border-border text-white"
            />
          </div>

          {showDates && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">{noticeType === "closure" ? "Closed From" : "Dates From"} (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-muted/60 border-border text-white", !closedFrom && "text-muted-foreground")}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {closedFrom ? formatDateWithDay(closedFrom) : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={closedFrom} onSelect={setClosedFrom} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-white">{noticeType === "closure" ? "Closed Until" : "Dates Until"} (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-muted/60 border-border text-white", !closedUntil && "text-muted-foreground")}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {closedUntil ? formatDateWithDay(closedUntil) : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={closedUntil} onSelect={setClosedUntil} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Preview */}
          {title.trim() && message.trim() && (
            <div className="space-y-2">
              <Label className="text-white text-xs uppercase tracking-wider">Preview</Label>
              <NoticePreview
                type={noticeType}
                title={title}
                message={message}
                closedFrom={closedFrom}
                closedUntil={closedUntil}
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving || !title.trim() || !message.trim()} className="bg-green-700 hover:bg-green-600 text-white flex-1">
              <Save className="h-4 w-4 mr-2" />
              {notice?.is_active ? "Save & Update" : "Publish Notice"}
            </Button>
            {notice?.is_active && (
              <Button onClick={handleClear} disabled={saving} variant="outline" className="border-red-700/50 text-red-400 hover:bg-red-950/50">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Notice
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* Small preview sub-component */
function NoticePreview({ type, title, message, closedFrom, closedUntil }: { type: string; title: string; message: string; closedFrom?: Date; closedUntil?: Date }) {
  const formatDateWithDay = (d: Date) => format(d, "EEEE, d MMMM yyyy");

  const colorMap: Record<string, { border: string; bg: string; icon: string; iconCircle: string; heading: string; text: string; date: string }> = {
    closure: { border: "border-amber-600/40", bg: "bg-gradient-to-r from-amber-950/50 to-orange-950/50", icon: "text-amber-400", iconCircle: "bg-amber-500/20", heading: "text-amber-200", text: "text-amber-100/80", date: "text-amber-300" },
    reduced: { border: "border-blue-600/40", bg: "bg-gradient-to-r from-blue-950/50 to-indigo-950/50", icon: "text-blue-400", iconCircle: "bg-blue-500/20", heading: "text-blue-200", text: "text-blue-100/80", date: "text-blue-300" },
    announcement: { border: "border-teal-600/40", bg: "bg-gradient-to-r from-teal-950/50 to-emerald-950/50", icon: "text-teal-400", iconCircle: "bg-teal-500/20", heading: "text-teal-200", text: "text-teal-100/80", date: "text-teal-300" },
    emergency: { border: "border-red-600/40", bg: "bg-gradient-to-r from-red-950/50 to-rose-950/50", icon: "text-red-400", iconCircle: "bg-red-500/20", heading: "text-red-200", text: "text-red-100/80", date: "text-red-300" },
  };
  const c = colorMap[type] || colorMap.closure;

  const IconComp = type === "closure" ? AlertTriangle : type === "reduced" ? Clock : type === "emergency" ? AlertOctagon : Info;

  const statusLabel: Record<string, string> = {
    closure: "CLOSED",
    reduced: "REDUCED HOURS",
    emergency: "URGENT",
    announcement: "",
  };

  const dateStr = (() => {
    const from = closedFrom ? formatDateWithDay(closedFrom) : null;
    const until = closedUntil ? formatDateWithDay(closedUntil) : null;
    if (from && until) return `${from} – ${until}`;
    if (from) return `From ${from}`;
    if (until) return `Until ${until}`;
    return null;
  })();

  const showAvailabilityHint = type === "closure" || type === "reduced";

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-4`}>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <div className={`p-1.5 rounded-full ${c.iconCircle} mb-1`}>
          <IconComp className={`h-5 w-5 ${c.icon}`} />
        </div>
        <span className={`font-serif text-sm font-semibold uppercase tracking-wide ${c.heading}`}>{title}</span>
        {statusLabel[type] && (
          <span className={`font-serif text-xl font-bold uppercase tracking-widest ${c.heading}`}>
            {statusLabel[type]}
          </span>
        )}
        {dateStr && (
          <span className={`text-sm font-bold ${c.date}`}>{dateStr}</span>
        )}
        <p className={`text-xs ${c.text} mt-1 max-w-md`}>{message}</p>
        {showAvailabilityHint && (
          <p className="text-xs text-amber-200/50 italic mt-0.5">
            Please still check our availability — we may have appointments available before or after this period.
          </p>
        )}
      </div>
    </div>
  );
}

export default NoticesTab;
