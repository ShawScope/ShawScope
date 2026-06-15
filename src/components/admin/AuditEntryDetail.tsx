import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Paperclip, Upload, X, MessageSquarePlus, Clock, FileText, Image as ImageIcon, Trash2, Download, ZoomIn } from "lucide-react";
import jsPDF from "jspdf";

interface AuditFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface AuditUpdate {
  id: string;
  note: string;
  created_at: string;
}

interface AuditEntryDetailProps {
  entryId: string;
  entryTitle: string;
  entryStatus: string;
  entryDate?: string;
  entryCategory?: string;
  entryDescription?: string | null;
  entryPatientName?: string | null;
  entrySeverity?: string;
  entryResolution?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryUpdated: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const AuditEntryDetail: React.FC<AuditEntryDetailProps> = ({
  entryId, entryTitle, entryStatus, entryDate, entryCategory, entryDescription,
  entryPatientName, entrySeverity, entryResolution,
  open, onOpenChange, onEntryUpdated,
}) => {
  const [files, setFiles] = useState<AuditFile[]>([]);
  const [updates, setUpdates] = useState<AuditUpdate[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!entryId) return;
    const [filesRes, updatesRes] = await Promise.all([
      supabase.from("clinical_audit_files").select("*").eq("audit_entry_id", entryId).order("created_at", { ascending: false }),
      supabase.from("clinical_audit_updates").select("*").eq("audit_entry_id", entryId).order("created_at", { ascending: false }),
    ]);
    if (filesRes.data) {
      const filesList = filesRes.data as AuditFile[];
      setFiles(filesList);
      // Generate signed URLs for image previews
      const imageFiles = filesList.filter(f => isImage(f.file_type));
      if (imageFiles.length > 0) {
        const urls: Record<string, string> = {};
        await Promise.all(imageFiles.map(async (f) => {
          const { data } = await supabase.storage.from("shawscope").createSignedUrl(f.file_path, 600);
          if (data?.signedUrl) urls[f.id] = data.signedUrl;
        }));
        setPreviewUrls(urls);
      }
    }
    if (updatesRes.data) setUpdates(updatesRes.data as AuditUpdate[]);
  }, [entryId]);

  useEffect(() => { if (open) fetchData(); }, [open, fetchData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length) return;
    const validFiles = Array.from(selectedFiles).filter(f => {
      if (f.size > MAX_FILE_SIZE) { toast.error(`${f.name} exceeds 10MB limit`); return false; }
      return true;
    });
    if (!validFiles.length) return;
    setUploading(true);
    for (const file of validFiles) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `audit-files/${entryId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("shawscope").upload(path, file);
      if (uploadErr) { toast.error(`Upload failed: ${file.name}`); continue; }
      await supabase.from("clinical_audit_files").insert({
        audit_entry_id: entryId, file_name: file.name, file_path: path,
        file_type: file.type || null, file_size: file.size,
      });
    }
    toast.success(`${validFiles.length} file(s) uploaded`);
    setUploading(false);
    fetchData();
    e.target.value = "";
  };

  const handleDeleteFile = async (file: AuditFile) => {
    await supabase.storage.from("shawscope").remove([file.file_path]);
    await supabase.from("clinical_audit_files").delete().eq("id", file.id);
    toast.success("File removed");
    fetchData();
  };

  const handleViewFile = async (file: AuditFile) => {
    if (isImage(file.file_type) && previewUrls[file.id]) {
      setLightboxUrl(previewUrls[file.id]);
    } else {
      const { data } = await supabase.storage.from("shawscope").createSignedUrl(file.file_path, 300);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    }
  };

  const handleDownloadFile = async (file: AuditFile) => {
    const { data } = await supabase.storage.from("shawscope").createSignedUrl(file.file_path, 300);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = file.file_name;
      a.target = "_blank";
      a.click();
    }
  };

  const handleAddUpdate = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    const { error } = await supabase.from("clinical_audit_updates").insert({
      audit_entry_id: entryId, note: newNote.trim(),
    });
    if (error) { toast.error("Failed to save update"); setSavingNote(false); return; }
    toast.success("Update logged");
    setNewNote("");
    setSavingNote(false);
    fetchData();
    onEntryUpdated();
  };

  const handleDeleteUpdate = async (id: string) => {
    await supabase.from("clinical_audit_updates").delete().eq("id", id);
    toast.success("Update removed");
    fetchData();
  };

  const isImage = (type: string | null) => type?.startsWith("image/");

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // ---------- PDF Export ----------
  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;

      const checkPage = (needed: number) => {
        if (y + needed > pageH - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      // Header
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("Clinical Audit Report", margin, y);
      y += 8;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120);
      pdf.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, margin, y);
      pdf.text("CONFIDENTIAL — For insurance & governance purposes", pageW - margin, y, { align: "right" });
      y += 4;
      pdf.setDrawColor(200);
      pdf.line(margin, y, pageW - margin, y);
      y += 8;
      pdf.setTextColor(0);

      // Entry Details
      const addField = (label: string, value: string | null | undefined) => {
        if (!value) return;
        checkPage(12);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(100);
        pdf.text(label.toUpperCase(), margin, y);
        y += 4;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(30);
        const lines = pdf.splitTextToSize(value, contentW);
        pdf.text(lines, margin, y);
        y += lines.length * 4.5 + 3;
      };

      addField("Title", entryTitle);
      addField("Date", entryDate ? format(parseISO(entryDate), "dd MMMM yyyy") : undefined);
      addField("Category", entryCategory?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
      addField("Status", entryStatus === "in_progress" ? "In Progress" : entryStatus?.charAt(0).toUpperCase() + entryStatus?.slice(1));
      addField("Severity", entrySeverity?.charAt(0).toUpperCase() + (entrySeverity?.slice(1) || ""));
      addField("Patient", entryPatientName);
      addField("Description", entryDescription);
      addField("Resolution / Actions Taken", entryResolution);

      // Case Updates
      if (updates.length > 0) {
        checkPage(12);
        y += 4;
        pdf.setDrawColor(200);
        pdf.line(margin, y, pageW - margin, y);
        y += 6;
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0);
        pdf.text("Case Update Log", margin, y);
        y += 6;

        const chronological = [...updates].reverse();
        for (const u of chronological) {
          checkPage(16);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100);
          pdf.text(format(parseISO(u.created_at), "dd MMM yyyy HH:mm"), margin, y);
          y += 4;
          pdf.setFontSize(9);
          pdf.setTextColor(30);
          const noteLines = pdf.splitTextToSize(u.note, contentW);
          pdf.text(noteLines, margin, y);
          y += noteLines.length * 4 + 4;
        }
      }

      // ALL Attachments — full page per image
      const imageFiles = files.filter(f => isImage(f.file_type));
      const nonImageFiles = files.filter(f => !isImage(f.file_type));

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          try {
            const { data: urlData } = await supabase.storage.from("shawscope").createSignedUrl(file.file_path, 120);
            if (!urlData?.signedUrl) continue;

            const imgData = await loadImageAsBase64(urlData.signedUrl);
            if (!imgData) continue;

            // Start a new page for each full-size image
            pdf.addPage();
            y = margin;

            // File label
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(60);
            pdf.text(file.file_name, margin, y);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(120);
            pdf.text(` — ${format(parseISO(file.created_at), "dd MMM yyyy HH:mm")}`, margin + pdf.getTextWidth(file.file_name) + 2, y);
            y += 6;

            // Fill as much of the page as possible
            const maxImgW = contentW;
            const maxImgH = pageH - y - margin - 5;
            const dims = fitImage(imgData.width, imgData.height, maxImgW, maxImgH);

            // Center horizontally
            const xOffset = margin + (contentW - dims.w) / 2;
            pdf.addImage(imgData.base64, "JPEG", xOffset, y, dims.w, dims.h);
            y += dims.h + 4;
          } catch {
            checkPage(8);
            pdf.setFontSize(8);
            pdf.setTextColor(150);
            pdf.text(`[Could not load: ${file.file_name}]`, margin, y);
            y += 5;
          }
        }
      }

      // Non-image attachments list
      if (nonImageFiles.length > 0) {
        checkPage(12);
        y += 4;
        pdf.setDrawColor(200);
        pdf.line(margin, y, pageW - margin, y);
        y += 6;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0);
        pdf.text("Other Attachments", margin, y);
        y += 5;
        for (const f of nonImageFiles) {
          checkPage(6);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(60);
          const sizeStr = f.file_size ? ` (${formatFileSize(f.file_size)})` : "";
          pdf.text(`• ${f.file_name}${sizeStr} — ${format(parseISO(f.created_at), "dd MMM yyyy")}`, margin, y);
          y += 4.5;
        }
      }

      // Footer on all pages
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setTextColor(150);
        pdf.text(`ShawScope Clinical Audit — Page ${i} of ${pageCount}`, margin, pageH - 8);
        pdf.text("Confidential", pageW - margin, pageH - 8, { align: "right" });
      }

      const safeName = entryTitle.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
      pdf.save(`Audit_${safeName}_${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("PDF exported");
    } catch (err) {
      console.error("PDF export failed:", err);
      toast.error("Failed to export PDF");
    }
    setExporting(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-background border-border text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-sm flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-cyan-400" />
              <span className="truncate flex-1">{entryTitle}</span>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${
                entryStatus === "resolved" ? "bg-green-900/40 text-green-300 border-green-600/40" :
                entryStatus === "in_progress" ? "bg-blue-900/40 text-blue-300 border-blue-600/40" :
                "bg-muted/60 text-muted-foreground border-border/40"
              }`}>
                {entryStatus === "in_progress" ? "In Progress" : entryStatus.charAt(0).toUpperCase() + entryStatus.slice(1)}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Export PDF Button */}
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs border-border text-muted-foreground hover:bg-muted"
            onClick={handleExportPdf}
            disabled={exporting}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {exporting ? "Generating PDF..." : "Export as PDF (with full attachments)"}
          </Button>

          {/* File Attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> Attachments ({files.length})
              </Label>
              <label className="cursor-pointer">
                <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                <Button size="sm" variant="outline" className="h-7 text-[11px] border-border text-muted-foreground hover:bg-muted" asChild disabled={uploading}>
                  <span><Upload className="h-3 w-3 mr-1" /> {uploading ? "Uploading..." : "Upload Files"}</span>
                </Button>
              </label>
            </div>

            {/* Image Previews */}
            {files.filter(f => isImage(f.file_type)).length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {files.filter(f => isImage(f.file_type)).map(f => (
                  <div key={f.id} className="relative group rounded-lg overflow-hidden border border-border/60 bg-card/60">
                    {previewUrls[f.id] ? (
                      <img
                        src={previewUrls[f.id]}
                        alt={f.file_name}
                        className="w-full h-24 object-cover cursor-pointer"
                        onClick={() => setLightboxUrl(previewUrls[f.id])}
                      />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center bg-muted">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/70" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setLightboxUrl(previewUrls[f.id])}>
                        <ZoomIn className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => handleDownloadFile(f)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-300 hover:bg-red-500/20" onClick={() => handleDeleteFile(f)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground truncate px-1.5 py-1">{f.file_name}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Non-image files */}
            {files.filter(f => !isImage(f.file_type)).length > 0 && (
              <div className="space-y-1.5">
                {files.filter(f => !isImage(f.file_type)).map(f => (
                  <Card key={f.id} className="bg-card/60 border-border/60">
                    <CardContent className="p-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <button onClick={() => handleViewFile(f)} className="text-[11px] text-cyan-300 hover:underline truncate block w-full text-left">
                          {f.file_name}
                        </button>
                        <p className="text-[9px] text-muted-foreground/70">{formatFileSize(f.file_size)} · {format(parseISO(f.created_at), "dd MMM yyyy")}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => handleDownloadFile(f)} title="Download">
                        <Download className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => handleDeleteFile(f)}>
                        <X className="h-3 w-3 text-red-400" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Case Updates */}
          <div className="space-y-2 mt-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquarePlus className="h-3 w-3" /> Case Updates ({updates.length})
            </Label>

            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Log an update on this case..."
                rows={2}
                className="bg-card border-border text-white text-xs flex-1"
              />
              <Button
                size="sm"
                onClick={handleAddUpdate}
                disabled={savingNote || !newNote.trim()}
                className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs h-auto self-end"
              >
                Add
              </Button>
            </div>

            {updates.length > 0 && (
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {updates.map(u => (
                  <div key={u.id} className="bg-card/50 border border-border/40 rounded p-2 flex gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/70 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white whitespace-pre-wrap">{u.note}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{format(parseISO(u.created_at), "dd MMM yyyy HH:mm")}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => handleDeleteUpdate(u.id)}>
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      {lightboxUrl && (
        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="bg-black/95 border-border max-w-[95vw] max-h-[95vh] p-2">
            <div className="flex items-center justify-center h-full">
              <img src={lightboxUrl} alt="Attachment preview" className="max-w-full max-h-[85vh] object-contain rounded" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

// Helper: load image URL as base64 + dimensions
function loadImageAsBase64(url: string): Promise<{ base64: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      resolve({ base64: canvas.toDataURL("image/jpeg", 0.85), width: img.width, height: img.height });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Helper: fit image within max dimensions preserving aspect ratio
function fitImage(w: number, h: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / w, maxH / h, 1);
  return { w: w * ratio, h: h * ratio };
}

export default AuditEntryDetail;
