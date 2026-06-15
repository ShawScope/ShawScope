import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Upload, FileText, Download, Trash2, Folder, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CQC_DOMAINS, CqcDomain } from "./types";

interface Doc {
  id: string;
  cqc_domain: string;
  label: string;
  description: string | null;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

export const EvidenceFolder: React.FC = () => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeDomain, setActiveDomain] = useState<CqcDomain>("safe");
  const [uploading, setUploading] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<CqcDomain>("safe");
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);

  const load = async () => {
    const { data } = await supabase.from("gov_documents").select("*").order("created_at", { ascending: false });
    setDocs((data as any) ?? []);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!pickedFile || !label.trim()) {
      toast.error("Pick a file and add a label");
      return;
    }
    if (pickedFile.size > 25 * 1024 * 1024) {
      toast.error("File exceeds 25MB limit");
      return;
    }
    setUploading(true);
    try {
      const ext = pickedFile.name.split(".").pop() ?? "bin";
      const path = `${domain}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("governance").upload(path, pickedFile, { contentType: pickedFile.type });
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("gov_documents").insert({
        cqc_domain: domain, label: label.trim(), description: description.trim() || null,
        file_path: path, mime_type: pickedFile.type, file_size_bytes: pickedFile.size,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) throw insErr;
      await supabase.from("gov_access_log").insert({
        user_id: user?.id, user_email: user?.email, action: "upload_evidence",
        entity: "gov_documents", details: { domain, label, path },
      });
      toast.success("Document uploaded");
      setDlgOpen(false); setLabel(""); setDescription(""); setPickedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    }
    setUploading(false);
  };

  const handleDownload = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("governance").createSignedUrl(d.file_path, 60);
    if (error || !data) return toast.error("Couldn't get download link");
    window.open(data.signedUrl, "_blank");
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("gov_access_log").insert({
      user_id: user?.id, user_email: user?.email, action: "download_evidence",
      entity: "gov_documents", entity_id: d.id, details: { path: d.file_path },
    });
  };

  const handleDelete = async (d: Doc) => {
    if (!confirm(`Delete "${d.label}"?`)) return;
    await supabase.storage.from("governance").remove([d.file_path]);
    await supabase.from("gov_documents").delete().eq("id", d.id);
    toast.success("Deleted");
    load();
  };

  const filtered = docs.filter(d => d.cqc_domain === activeDomain);

  return (
    <div className="space-y-3">
      <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-amber-400" />
            <h2 className="font-serif text-xl">CQC Evidence Folder</h2>
          </div>
          <Button size="sm" onClick={() => { setDomain(activeDomain); setDlgOpen(true); }} className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Upload evidence
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Quick-access evidence library for inspections. Files stored privately and accessed via signed URLs.</p>
      </Card>

      {/* Domain tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
        {CQC_DOMAINS.map(d => {
          const count = docs.filter(x => x.cqc_domain === d.key).length;
          const active = activeDomain === d.key;
          return (
            <button
              key={d.key}
              onClick={() => setActiveDomain(d.key)}
              className={cn(
                "rounded-lg border px-2 py-2.5 text-center transition-colors",
                active ? d.tone : "border-slate-800 bg-slate-950/50 text-muted-foreground hover:bg-slate-900",
              )}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-80">{d.label}</div>
              <div className="text-base font-bold mt-0.5">{count}</div>
            </button>
          );
        })}
      </div>

      {/* Documents list */}
      <Card className="p-4 bg-slate-950/60 border-slate-800">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No evidence uploaded for this domain yet.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(d => (
              <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md hover:bg-slate-900/50 border border-slate-800/60">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.label}</p>
                    {d.description && <p className="text-[11px] text-muted-foreground truncate">{d.description}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      {format(parseISO(d.created_at), "dd/MM/yyyy")} · {d.mime_type ?? "file"} · {d.file_size_bytes ? `${Math.round(d.file_size_bytes/1024)} KB` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 self-end sm:self-auto">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(d)} title="Download"><Download className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-400" onClick={() => handleDelete(d)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload evidence</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>CQC domain</Label>
              <Select value={domain} onValueChange={(v) => setDomain(v as CqcDomain)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CQC_DOMAINS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Label</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Infection control policy v3" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>File (max 25MB)</Label>
              <Input ref={fileRef} type="file" onChange={e => setPickedFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button onClick={handleUpload} disabled={uploading} className="w-full">
              <Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EvidenceFolder;