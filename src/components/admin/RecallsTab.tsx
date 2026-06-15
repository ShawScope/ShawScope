import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO, addMonths, addDays, addYears, differenceInDays, differenceInMonths, differenceInYears, isPast } from "date-fns";
import { Plus, Trash2, Search, Clock, CheckCircle, Mail, Phone, CalendarClock, Pencil } from "lucide-react";

interface Recall {
  id: string;
  patient_id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  service_name: string | null;
  recall_months: number;
  recall_date: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  notes: string | null;
}

interface PatientResult {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
}

function formatRecallIn(recallDateStr: string): string {
  const recallDate = parseISO(recallDateStr);
  const now = new Date();
  if (isPast(recallDate)) return "Overdue";
  const years = differenceInYears(recallDate, now);
  if (years >= 1) return `${years} year${years > 1 ? "s" : ""}`;
  const months = differenceInMonths(recallDate, now);
  if (months >= 1) return `${months} month${months > 1 ? "s" : ""}`;
  const days = differenceInDays(recallDate, now);
  return `${days} day${days > 1 ? "s" : ""}`;
}

const RecallsTab = () => {
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecall, setEditingRecall] = useState<Recall | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [searching, setSearching] = useState(false);

  // New recall form
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [recallValue, setRecallValue] = useState(6);
  const [recallUnit, setRecallUnit] = useState<"days" | "months" | "years">("months");
  const [recallNotes, setRecallNotes] = useState("");
  const [recallService, setRecallService] = useState("");
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);

  // Edit form
  const [editRecallValue, setEditRecallValue] = useState(6);
  const [editRecallUnit, setEditRecallUnit] = useState<"days" | "months" | "years">("months");
  const [editRecallNotes, setEditRecallNotes] = useState("");
  const [editRecallService, setEditRecallService] = useState("");

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchRecalls = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_recalls")
      .select("*")
      .order("recall_date", { ascending: true });
    if (!error && data) setRecalls(data as unknown as Recall[]);
    setLoading(false);
  };

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("id, name").eq("is_active", true);
    if (data) setServices(data);
  };

  useEffect(() => {
    fetchRecalls();
    fetchServices();
  }, []);

  const searchPatients = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("patients")
      .select("id, client_name, client_email, client_phone")
      .or(`client_name.ilike.%${term}%,client_email.ilike.%${term}%`)
      .limit(10);
    if (data) setSearchResults(data);
    setSearching(false);
  };

  const getRecallDate = () => {
    const now = new Date();
    if (recallUnit === "days") return addDays(now, recallValue);
    if (recallUnit === "years") return addYears(now, recallValue);
    return addMonths(now, recallValue);
  };

  const getRecallLabel = () => {
    return `${recallValue} ${recallUnit}`;
  };

  const getRecallMonthsEquivalent = () => {
    if (recallUnit === "days") return Math.max(1, Math.round(recallValue / 30));
    if (recallUnit === "years") return recallValue * 12;
    return recallValue;
  };

  const getEditRecallDate = () => {
    const now = new Date();
    if (editRecallUnit === "days") return addDays(now, editRecallValue);
    if (editRecallUnit === "years") return addYears(now, editRecallValue);
    return addMonths(now, editRecallValue);
  };

  const getEditRecallMonthsEquivalent = () => {
    if (editRecallUnit === "days") return Math.max(1, Math.round(editRecallValue / 30));
    if (editRecallUnit === "years") return editRecallValue * 12;
    return editRecallValue;
  };

  const addRecall = async () => {
    if (!selectedPatient) { toast.error("Please select a patient"); return; }
    if (!recallService) { toast.error("Please select a service"); return; }

    const recallDate = getRecallDate();

    const { error } = await supabase.from("patient_recalls").insert({
      patient_id: selectedPatient.id,
      client_name: selectedPatient.client_name,
      client_email: selectedPatient.client_email,
      client_phone: selectedPatient.client_phone,
      service_name: recallService,
      recall_months: getRecallMonthsEquivalent(),
      recall_date: recallDate.toISOString(),
      notes: recallNotes ? `${getRecallLabel()} recall. ${recallNotes}` : `${getRecallLabel()} recall`,
    } as any);

    if (error) {
      toast.error("Failed to create recall");
      console.error(error);
      return;
    }

    toast.success(`Recall set for ${selectedPatient.client_name} in ${getRecallLabel()}`);
    setAddDialogOpen(false);
    setSelectedPatient(null);
    setRecallValue(6);
    setRecallUnit("months");
    setRecallNotes("");
    setRecallService("");
    setSearchTerm("");
    setSearchResults([]);
    fetchRecalls();
  };

  const openEditDialog = (recall: Recall) => {
    setEditingRecall(recall);
    setEditRecallService(recall.service_name || "");
    setEditRecallNotes(recall.notes || "");
    // Default edit to months with stored value
    setEditRecallValue(recall.recall_months);
    setEditRecallUnit("months");
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingRecall) return;
    if (!editRecallService) { toast.error("Please select a service"); return; }

    const recallDate = getEditRecallDate();

    const { error } = await supabase
      .from("patient_recalls")
      .update({
        service_name: editRecallService,
        recall_months: getEditRecallMonthsEquivalent(),
        recall_date: recallDate.toISOString(),
        notes: editRecallNotes || null,
      } as any)
      .eq("id", editingRecall.id);

    if (error) {
      toast.error("Failed to update recall");
      console.error(error);
      return;
    }

    toast.success("Recall updated");
    setEditDialogOpen(false);
    setEditingRecall(null);
    fetchRecalls();
  };

  const deleteRecall = async (id: string) => {
    const { error } = await supabase.from("patient_recalls").delete().eq("id", id);
    if (error) { toast.error("Failed to delete recall"); return; }
    toast.success("Recall removed");
    fetchRecalls();
  };

  const filteredRecalls = statusFilter === "all"
    ? recalls
    : recalls.filter(r => r.status === statusFilter);

  const pendingCount = recalls.filter(r => r.status === "pending").length;
  const sentCount = recalls.filter(r => r.status === "sent").length;

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="font-serif text-2xl font-bold text-foreground">Patient Recalls</h2>
        <p className="text-sm text-muted-foreground mt-1">Schedule and manage follow-up recall reminders for returning patients</p>
      </div>
      <Card className="bg-muted/60 border-border">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
           <div>
             <p className="text-sm text-muted-foreground">
               Schedule future reminders for patients to rebook. SMS &amp; email sent automatically.
             </p>
           </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-500/30 text-amber-400">
              <Clock className="h-3 w-3 mr-1" /> {pendingCount} Pending
            </Badge>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
              <CheckCircle className="h-3 w-3 mr-1" /> {sentCount} Sent
            </Badge>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Recall
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Label className="text-muted-foreground text-sm">Filter:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-secondary/50 border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading recalls...</p>
          ) : filteredRecalls.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No recalls found. Click "Add Recall" to schedule one.</p>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="sm:hidden space-y-2">
                {filteredRecalls.map((r) => {
                  const recallIn = formatRecallIn(r.recall_date);
                  const isOverdue = recallIn === "Overdue";
                  return (
                    <div key={r.id} className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{r.client_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.service_name || "—"}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {r.status === "sent" ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Sent</Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Pending</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className={isOverdue ? "text-red-400 font-medium" : ""}>{recallIn}</span>
                        <span>·</span>
                        <span>{format(parseISO(r.recall_date), "dd/MM/yyyy")}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground min-w-0 flex-1 truncate">
                          <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" />{r.client_email}</span>
                          {r.client_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{r.client_phone}</span>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {r.status === "pending" && (
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(r)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-accent">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => deleteRecall(r.id)} className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {r.notes && <p className="text-[10px] text-muted-foreground/70 truncate">{r.notes}</p>}
                    </div>
                  );
                })}
              </div>
              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Patient</TableHead>
                      <TableHead className="text-muted-foreground">Contact</TableHead>
                      <TableHead className="text-muted-foreground">Service</TableHead>
                      <TableHead className="text-muted-foreground">Recall In</TableHead>
                      <TableHead className="text-muted-foreground">Recall Date</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Notes</TableHead>
                      <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecalls.map((r) => {
                      const recallIn = formatRecallIn(r.recall_date);
                      const isOverdue = recallIn === "Overdue";
                      return (
                        <TableRow key={r.id} className="border-border hover:bg-secondary/30">
                          <TableCell className="text-foreground font-medium">{r.client_name}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{r.client_email}</span>
                              {r.client_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.client_phone}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{r.service_name || "—"}</TableCell>
                          <TableCell className={isOverdue ? "text-red-400 font-medium" : "text-muted-foreground"}>{recallIn}</TableCell>
                          <TableCell className="text-muted-foreground">{format(parseISO(r.recall_date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>
                            {r.status === "sent" ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Sent</Badge>
                            ) : (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">{r.notes || "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {r.status === "pending" && (
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(r)} className="text-muted-foreground hover:text-foreground hover:bg-accent">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => deleteRecall(r.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Recall Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Add Patient Recall</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Patient Search */}
            <div className="space-y-2">
              <Label>Search Patient</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => searchPatients(e.target.value)}
                  placeholder="Type patient name or email..."
                  className="pl-9"
                />
              </div>
              {searchResults.length > 0 && !selectedPatient && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                      onClick={() => { setSelectedPatient(p); setSearchResults([]); setSearchTerm(p.client_name); }}
                    >
                      <span className="font-medium">{p.client_name}</span>
                      <span className="text-muted-foreground ml-2">{p.client_email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedPatient && (
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-sm space-y-1">
                  <p><strong>{selectedPatient.client_name}</strong></p>
                  <p className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {selectedPatient.client_email}</p>
                  {selectedPatient.client_phone && (
                    <p className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedPatient.client_phone}</p>
                  )}
                  <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => { setSelectedPatient(null); setSearchTerm(""); }}>
                    Change patient
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Service */}
            <div className="space-y-2">
              <Label>Service to Recall For</Label>
              <Select value={recallService} onValueChange={setRecallService}>
                <SelectTrigger><SelectValue placeholder="Select service..." /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recall Period */}
            <div className="space-y-2">
              <Label>Recall In</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={recallUnit === "days" ? 365 : recallUnit === "years" ? 10 : 36}
                  value={recallValue}
                  onChange={(e) => setRecallValue(Math.max(1, Number(e.target.value)))}
                  className="w-24"
                />
                <Select value={recallUnit} onValueChange={(v) => setRecallUnit(v as "days" | "months" | "years")}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                Recall will be sent on {format(getRecallDate(), "dd/MM/yyyy")}
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={recallNotes}
                onChange={(e) => setRecallNotes(e.target.value)}
                placeholder="Any specific notes about this recall..."
                rows={2}
              />
            </div>

            <Button onClick={addRecall} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Schedule Recall
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Recall Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Recall — {editingRecall?.client_name}</DialogTitle>
          </DialogHeader>
          {editingRecall && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-sm space-y-1">
                  <p><strong>{editingRecall.client_name}</strong></p>
                  <p className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {editingRecall.client_email}</p>
                  {editingRecall.client_phone && (
                    <p className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {editingRecall.client_phone}</p>
                  )}
                </CardContent>
              </Card>

              {/* Service */}
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={editRecallService} onValueChange={setEditRecallService}>
                  <SelectTrigger><SelectValue placeholder="Select service..." /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recall Period */}
              <div className="space-y-2">
                <Label>New Recall In (from today)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={editRecallUnit === "days" ? 365 : editRecallUnit === "years" ? 10 : 36}
                    value={editRecallValue}
                    onChange={(e) => setEditRecallValue(Math.max(1, Number(e.target.value)))}
                    className="w-24"
                  />
                  <Select value={editRecallUnit} onValueChange={(v) => setEditRecallUnit(v as "days" | "months" | "years")}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  Recall will be sent on {format(getEditRecallDate(), "dd/MM/yyyy")}
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editRecallNotes}
                  onChange={(e) => setEditRecallNotes(e.target.value)}
                  placeholder="Any specific notes..."
                  rows={2}
                />
              </div>

              <Button onClick={saveEdit} className="w-full">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecallsTab;
