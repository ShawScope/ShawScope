import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Upload, FileText, Download, Trash2, Folder, FolderPlus, ChevronRight, ArrowLeft, Plus } from "lucide-react";

interface FolderRow { id: string; name: string; parent_id: string | null; created_at: string; }
interface FileRow { id: string; folder_id: string | null; label: string; description: string | null; file_path: string; mime_type: string | null; file_size_bytes: number | null; created_at: string; }

const DocumentsLibrary: React.FC = () => {
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [folderDlg, setFolderDlg] = useState(false);
  const [folderName, setFolderName] = useState("");

  const [uploadDlg, setUploadDlg] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: f }, { data: fi }] = await Promise.all([
      supabase.from("gov_folders").select("*").order("name"),
      supabase.from("gov_files").select("*").order("created_at", { ascending: false }),
    ]);
    setFolders((f as any) ?? []);
    setFiles((fi as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const breadcrumbs = useMemo(() => {
    const trail: FolderRow[] = [];
    let id: string | null = currentId;
    while (id) {
      const f = folders.find(x => x.id === id);
      if (!f) break;
      trail.unshift(f);
      id = f.parent_id;
    }
    return trail;
  }, [currentId, folders]);

  const childFolders = folders.filter(f => f.parent_id === currentId);
  const childFiles = files.filter(f => (f.folder_id ?? null) === currentId);

  const createFolder = async () => {
    const name = folderName.trim();
    if (!name) return toast.error("Folder name required");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("gov_folders").insert({ name, parent_id: currentId, created_by: user?.id ?? null });
    if (error) return toast.error(error.message);
    toast.success("Folder created");
    setFolderDlg(false); setFolderName("");
    load();
  };

  const deleteFolder = async (f: FolderRow) => {
    if (!confirm(`Delete folder "${f.name}" and ALL its contents?`)) return;
    // collect descendant folder ids
    const allIds: string[] = [];
    const stack = [f.id];
    while (stack.length) {
      const id = stack.pop()!;
      allIds.push(id);
      folders.filter(x => x.parent_id === id).forEach(c => stack.push(c.id));
    }
    const filesToDelete = files.filter(fi => fi.folder_id && allIds.includes(fi.folder_id));
    if (filesToDelete.length) {
      await supabase.storage.from("governance").remove(filesToDelete.map(x => x.file_path));
    }
    await supabase.from("gov_folders").delete().eq("id", f.id);
    toast.success("Folder deleted");
    load();
  };

  const handleUpload = async () => {
    if (!pickedFile || !label.trim()) return toast.error("Pick a file and add a label");
    if (pickedFile.size > 25 * 1024 * 1024) return toast.error("File exceeds 25MB limit");
    setUploading(true);
    try {
      const ext = pickedFile.name.split(".").pop() ?? "bin";
      const path = `documents/${currentId ?? "root"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("governance").upload(path, pickedFile, { contentType: pickedFile.type });
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("gov_files").insert({
        folder_id: currentId, label: label.trim(), description: description.trim() || null,
        file_path: path, mime_type: pickedFile.type, file_size_bytes: pickedFile.size,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) throw insErr;
      toast.success("File uploaded");
      setUploadDlg(false); setLabel(""); setDescription(""); setPickedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    }
    setUploading(false);
  };

  const handleDownload = async (f: FileRow) => {
    const { data, error } = await supabase.storage.from("governance").createSignedUrl(f.file_path, 60);
    if (error || !data) return toast.error("Couldn't get download link");
    window.open(data.signedUrl, "_blank");
  };

  const handleView = async (f: FileRow) => {
    const { data, error } = await supabase.storage.from("governance").createSignedUrl(f.file_path, 300);
    if (error || !data) return toast.error("Couldn't open file");
    window.open(data.signedUrl, "_blank");
  };

  const handleDeleteFile = async (f: FileRow) => {
    if (!confirm(`Delete "${f.label}"?`)) return;
    await supabase.storage.from("governance").remove([f.file_path]);
    await supabase.from("gov_files").delete().eq("id", f.id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-3">
      <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Folder className="h-5 w-5 text-amber-400 shrink-0" />
            <h2 className="font-serif text-xl truncate">Documents</h2>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setFolderDlg(true)} className="h-8">
              <FolderPlus className="h-3.5 w-3.5 mr-1" /> New folder
            </Button>
            <Button size="sm" onClick={() => setUploadDlg(true)} className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Upload
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <button onClick={() => setCurrentId(null)} className="hover:text-foreground">Documents</button>
          {breadcrumbs.map(b => (
            <React.Fragment key={b.id}>
              <ChevronRight className="h-3 w-3" />
              <button onClick={() => setCurrentId(b.id)} className="hover:text-foreground">{b.name}</button>
            </React.Fragment>
          ))}
        </div>
      </Card>

      {currentId && (
        <Button size="sm" variant="ghost" className="h-7" onClick={() => {
          const parent = folders.find(f => f.id === currentId)?.parent_id ?? null;
          setCurrentId(parent);
        }}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
      )}

      <Card className="p-4 bg-slate-950/60 border-slate-800">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
        ) : childFolders.length === 0 && childFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">This folder is empty.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {childFolders.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-slate-900/50 border border-slate-800/60">
                <button onClick={() => setCurrentId(f.id)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                  <Folder className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-sm font-medium truncate">{f.name}</span>
                </button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-400" onClick={() => deleteFolder(f)} title="Delete folder">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {childFiles.map(d => (
              <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md hover:bg-slate-900/50 border border-slate-800/60">
                <button onClick={() => handleView(d)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                  <FileText className="h-4 w-4 text-sky-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.label}</p>
                    {d.description && <p className="text-[11px] text-muted-foreground truncate">{d.description}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      {format(parseISO(d.created_at), "dd/MM/yyyy")} · {d.mime_type ?? "file"} · {d.file_size_bytes ? `${Math.round(d.file_size_bytes/1024)} KB` : ""}
                    </p>
                  </div>
                </button>
                <div className="flex gap-1 shrink-0 self-end sm:self-auto">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(d)} title="Download"><Download className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-400" onClick={() => handleDeleteFile(d)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={folderDlg} onOpenChange={setFolderDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>New folder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Folder name</Label>
              <Input value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="e.g. Insurance certificates" autoFocus />
            </div>
            <p className="text-xs text-muted-foreground">
              Will be created inside: <span className="text-foreground">{breadcrumbs.map(b => b.name).join(" / ") || "Documents"}</span>
            </p>
            <Button onClick={createFolder} className="w-full"><FolderPlus className="h-4 w-4 mr-2" />Create folder</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDlg} onOpenChange={setUploadDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload file</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Uploading to: <span className="text-foreground">{breadcrumbs.map(b => b.name).join(" / ") || "Documents"}</span>
            </p>
            <div>
              <Label>Label</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Public liability insurance 2026" />
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

export default DocumentsLibrary;