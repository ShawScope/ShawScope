import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Paperclip, Upload, Trash2, Download, Loader2, FileIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { logAccess } from "./RegisterShell";

interface AttachmentRow {
  id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

interface Props {
  recordType: string;
  recordId: string | null;
  compact?: boolean;
}

const bytesToKb = (n: number | null) => (n ? (n / 1024).toFixed(0) + " KB" : "");

const AttachmentsList: React.FC<Props> = ({ recordType, recordId, compact }) => {
  const [rows, setRows] = useState<AttachmentRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!recordId) { setRows([]); return; }
    const { data, error } = await supabase
      .from("gov_attachments")
      .select("id, file_path, file_name, mime_type, size_bytes, created_at")
      .eq("record_type", recordType)
      .eq("record_id", recordId)
      .order("created_at", { ascending: false });
    if (!error) setRows((data as any) ?? []);
  };

  useEffect(() => { load(); }, [recordType, recordId]);

  const onPick = () => inputRef.current?.click();

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !recordId) return;
    if (file.size > 15 * 1024 * 1024) { toast.error("Max 15MB per file"); return; }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${recordType}/${recordId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("governance").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("gov_attachments").insert({
        record_type: recordType, record_id: recordId,
        file_path: path, file_name: file.name,
        mime_type: file.type || null, size_bytes: file.size,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) throw insErr;
      await logAccess(supabase, "attach", recordType, { record_id: recordId, file_name: file.name });
      toast.success("File attached");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const download = async (r: AttachmentRow) => {
    const { data, error } = await supabase.storage.from("governance").createSignedUrl(r.file_path, 60);
    if (error || !data?.signedUrl) { toast.error("Could not get download link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (r: AttachmentRow) => {
    if (!confirm(`Delete ${r.file_name}?`)) return;
    await supabase.storage.from("governance").remove([r.file_path]);
    const { error } = await supabase.from("gov_attachments").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "detach", recordType, { record_id: recordId, file_name: r.file_name });
    toast.success("Removed");
    load();
  };

  if (!recordId) {
    return <div className="text-[11px] text-muted-foreground italic">Save record first to attach files.</div>;
  }

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Paperclip className="h-3 w-3" />
          <span>{rows.length} file{rows.length === 1 ? "" : "s"}</span>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={onPick} disabled={uploading}>
          {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
          Attach file
        </Button>
        <input ref={inputRef} type="file" className="hidden" onChange={onUpload}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" />
      </div>
      {rows.length > 0 && (
        <div className="space-y-1">
          {rows.map(r => (
            <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded border border-slate-800 bg-slate-900/60">
              <FileIcon className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <button onClick={() => download(r)} className="flex-1 min-w-0 text-left text-xs truncate hover:text-amber-300">
                {r.file_name}
              </button>
              <span className="text-[10px] text-muted-foreground shrink-0">{bytesToKb(r.size_bytes)}</span>
              <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">{format(parseISO(r.created_at), "dd/MM/yy")}</span>
              <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => download(r)}><Download className="h-3 w-3" /></Button>
              <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-rose-400" onClick={() => remove(r)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentsList;