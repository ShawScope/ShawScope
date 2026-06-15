import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  GripVertical, Plus, Trash2, Copy, Eye, Pencil, ChevronDown, ChevronUp,
  Type, AlignLeft, CheckSquare, List, Hash, FileSignature, Heading, Info,
  Image, ToggleLeft, SlidersHorizontal, HelpCircle, Sparkles, Camera, Link2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FormField {
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  showWhen?: string;
  description?: string;
  followUp?: string;
  content?: string;
}

interface FormBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: FormField[];
  formType: string;
  isNew?: boolean;
  onSave: (data: { title: string; description: string; fields: FormField[]; formType: string }) => void;
}

const FIELD_TYPES = [
  { value: "text", label: "Text Input", icon: Type, description: "Single line text" },
  { value: "textarea", label: "Text Area", icon: AlignLeft, description: "Multi-line text for notes" },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare, description: "Yes/No toggle" },
  { value: "select", label: "Dropdown", icon: List, description: "Select from options" },
  { value: "multiselect", label: "Multi-Select", icon: SlidersHorizontal, description: "Select multiple options" },
  { value: "radio", label: "Radio Buttons", icon: ToggleLeft, description: "Choose one option" },
  { value: "signature", label: "Signature", icon: FileSignature, description: "Digital signature field" },
  { value: "photo", label: "Photo Upload", icon: Camera, description: "Camera or gallery upload" },
  { value: "heading", label: "Section Heading", icon: Heading, description: "Visual divider with title" },
  { value: "info", label: "Info Text", icon: Info, description: "Read-only guidance text" },
  { value: "link", label: "Link", icon: Link2, description: "Clickable URL link" },
];

const FIELD_TYPE_COLORS: Record<string, string> = {
  text: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  textarea: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  checkbox: "bg-green-500/10 text-green-600 border-green-500/20",
  select: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  multiselect: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  radio: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  signature: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  photo: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  heading: "bg-stone-500/10 text-stone-600 border-stone-500/20",
  info: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  link: "bg-teal-500/10 text-teal-600 border-teal-500/20",
};

const FormBuilderDialog: React.FC<FormBuilderDialogProps> = ({
  open, onOpenChange, title: initialTitle, description: initialDesc,
  fields: initialFields, formType: initialFormType, isNew, onSave,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [desc, setDesc] = useState(initialDesc);
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [formType, setFormType] = useState(initialFormType);
  const [activeTab, setActiveTab] = useState<string>("builder");
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const [addFieldOpen, setAddFieldOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDesc(initialDesc);
      setFields(initialFields.length > 0 ? initialFields : [{ label: "", type: "text", required: true }]);
      setFormType(initialFormType);
      setExpandedField(null);
    }
  }, [open, initialTitle, initialDesc, initialFields, initialFormType]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(fields);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setFields(items);
  }, [fields]);

  const addField = (type: string) => {
    const typeInfo = FIELD_TYPES.find(t => t.value === type);
    const newField: FormField = {
      label: type === "heading" ? "── NEW SECTION ──" : "",
      type,
      required: !["heading", "info", "checkbox", "photo", "link"].includes(type),
      ...(["select", "multiselect", "radio"].includes(type) ? { options: ["Option 1", "Option 2"] } : {}),
    };
    setFields([...fields, newField]);
    setExpandedField(fields.length);
    setAddFieldOpen(false);
  };

  const duplicateField = (index: number) => {
    const copy = { ...fields[index], label: fields[index].label + " (copy)" };
    if (copy.options) copy.options = [...copy.options];
    const updated = [...fields];
    updated.splice(index + 1, 0, copy);
    setFields(updated);
    setExpandedField(index + 1);
  };

  const removeField = (index: number) => {
    if (fields.length <= 1) return;
    setFields(fields.filter((_, i) => i !== index));
    if (expandedField === index) setExpandedField(null);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const checkboxLabels = useMemo(() =>
    fields.filter(f => f.type === "checkbox").map(f => f.label).filter(Boolean),
    [fields]
  );

  const handleSave = () => {
    if (!title.trim()) return;
    const validFields = fields.filter(f => f.label.trim());
    onSave({ title: title.trim(), description: desc.trim(), fields: validFields, formType });
  };

  // Live preview renderer
  const renderPreviewField = (field: FormField, index: number) => {
    if (field.type === "heading") {
      return (
        <div key={index} className="pt-4 pb-1">
          <Separator className="mb-3" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {field.label.replace(/^── |──$/g, "").trim() || "Section Title"}
          </h3>
        </div>
      );
    }
    if (field.type === "info") {
      return (
        <div key={index} className="rounded-lg bg-muted/50 border p-3">
          <p className="text-xs text-muted-foreground">{field.label || "Info text"}</p>
        </div>
      );
    }
    return (
      <div key={index} className="space-y-1.5">
        <Label className="text-sm">
          {field.label || "Untitled Field"}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
        {field.type === "text" && <Input placeholder={field.placeholder || ""} disabled className="bg-muted/30" />}
        {field.type === "textarea" && <Textarea rows={2} placeholder={field.placeholder || ""} disabled className="bg-muted/30" />}
        {field.type === "checkbox" && (
          <div className="flex items-center gap-2">
            <Checkbox disabled />
            <span className="text-sm text-muted-foreground">Check to confirm</span>
          </div>
        )}
        {field.type === "select" && (
          <Select disabled>
            <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select..." /></SelectTrigger>
          </Select>
        )}
        {field.type === "multiselect" && (
          <div className="flex flex-wrap gap-1.5">
            {(field.options || []).map((opt, i) => (
              <span key={i} className="px-2.5 py-1 text-xs rounded-full border bg-muted/50">{opt}</span>
            ))}
          </div>
        )}
        {field.type === "radio" && (
          <div className="space-y-1">
            {(field.options || []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />
                <span className="text-sm text-muted-foreground">{opt}</span>
              </div>
            ))}
          </div>
        )}
        {field.type === "signature" && (
          <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 text-center">
            <FileSignature className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground mt-1">Signature field</p>
          </div>
        )}
        {field.type === "photo" && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled><Camera className="h-4 w-4 mr-1" /> Camera</Button>
            <Button variant="outline" size="sm" disabled><Image className="h-4 w-4 mr-1" /> Gallery</Button>
          </div>
        )}
        {field.type === "link" && (
          <a href={field.placeholder || "#"} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline hover:text-primary/80">
            <Link2 className="h-3.5 w-3.5 inline mr-1" />
            {field.label || "Link"}
          </a>
        )}
        {field.showWhen && (
          <p className="text-[10px] text-amber-600 italic">
            ⚡ Only shows when "{field.showWhen}" is checked
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {isNew ? "Create New Form" : "Edit Form Template"}
          </DialogTitle>
        </DialogHeader>

        {/* Title & Description */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Form Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Earwax Removal Consent" maxLength={100} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Form Type</Label>
            <Select value={formType} onValueChange={setFormType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consent">Consent Form (patient-facing)</SelectItem>
                <SelectItem value="consultation">Consultation Form (practitioner)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Brief description..." maxLength={500} />
        </div>

        {/* Builder / Preview Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="builder" className="text-xs">
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Builder ({fields.length} fields)
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Live Preview
            </TabsTrigger>
          </TabsList>

          {/* BUILDER TAB */}
          <TabsContent value="builder" className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
            {/* Help Banner */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Form Builder Tips</p>
                  <p>• <strong>Drag</strong> the grip handle to reorder fields</p>
                  <p>• Use <strong>Conditional Logic</strong> to show fields only when a checkbox is ticked</p>
                  <p>• <strong>Headings</strong> create visual sections to organize your form</p>
                  <p>• Switch to <strong>Live Preview</strong> to see how patients/practitioners will see it</p>
                </div>
              </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fields">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                    {fields.map((field, index) => {
                      const isExpanded = expandedField === index;
                      const typeInfo = FIELD_TYPES.find(t => t.value === field.type);
                      const TypeIcon = typeInfo?.icon || Type;
                      const colorClass = FIELD_TYPE_COLORS[field.type] || FIELD_TYPE_COLORS.text;

                      return (
                        <Draggable key={index} draggableId={`field-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "rounded-lg border bg-card transition-all",
                                snapshot.isDragging && "shadow-lg ring-2 ring-primary/30",
                                isExpanded && "ring-1 ring-primary/20"
                              )}
                            >
                              {/* Collapsed Header */}
                              <div className="flex items-center gap-2 p-2.5">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted">
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <Badge variant="outline" className={cn("text-[9px] px-1.5 shrink-0", colorClass)}>
                                  <TypeIcon className="h-3 w-3 mr-0.5" />
                                  {typeInfo?.label || field.type}
                                </Badge>
                                <span
                                  className="flex-1 text-sm truncate cursor-pointer hover:text-primary"
                                  onClick={() => setExpandedField(isExpanded ? null : index)}
                                >
                                  {field.label || <span className="text-muted-foreground italic">Untitled</span>}
                                </span>
                                {field.required && <Badge variant="secondary" className="text-[9px] px-1">Required</Badge>}
                                {field.showWhen && <Badge variant="outline" className="text-[9px] px-1 border-amber-500/30 text-amber-600">⚡ Conditional</Badge>}
                                <div className="flex gap-0.5">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedField(isExpanded ? null : index)}>
                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateField(index)} title="Duplicate">
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeField(index)} title="Delete" disabled={fields.length <= 1}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Expanded Editor */}
                              {isExpanded && (
                                <div className="border-t px-3 pb-3 pt-2 space-y-3 bg-muted/20">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">{field.type === "info" ? "Info Text *" : "Label *"}</Label>
                                      {field.type === "info" ? (
                                        <Textarea
                                          value={field.label}
                                          onChange={(e) => {
                                            updateField(index, { label: e.target.value });
                                            e.target.style.height = "auto";
                                            e.target.style.height = e.target.scrollHeight + "px";
                                          }}
                                          onFocus={(e) => {
                                            e.target.style.height = "auto";
                                            e.target.style.height = e.target.scrollHeight + "px";
                                          }}
                                          placeholder="Enter guidance / information text..."
                                          rows={3}
                                          className="text-sm min-h-[80px] resize-none overflow-hidden"
                                          autoFocus
                                          style={{ height: "auto" }}
                                        />
                                      ) : (
                                        <Input
                                          value={field.label}
                                          onChange={(e) => updateField(index, { label: e.target.value })}
                                          placeholder="Field label"
                                          maxLength={200}
                                          autoFocus
                                        />
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Type</Label>
                                      <Select value={field.type} onValueChange={(v) => updateField(index, { type: v })}>
                                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {FIELD_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                              <div className="flex items-center gap-2">
                                                <t.icon className="h-3.5 w-3.5" />
                                                <span>{t.label}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  {/* Placeholder */}
                                  {["text", "textarea"].includes(field.type) && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Placeholder / Hint Text</Label>
                                      <Input
                                        value={field.placeholder || ""}
                                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                        placeholder="Hint shown to user..."
                                        className="text-sm"
                                      />
                                    </div>
                                  )}

                                  {/* URL for link type */}
                                  {field.type === "link" && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">URL *</Label>
                                      <Input
                                        value={field.placeholder || ""}
                                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                        placeholder="https://example.com"
                                        className="text-sm"
                                      />
                                    </div>
                                  )}

                                  {/* Options for select/multiselect/radio */}
                                  {["select", "multiselect", "radio"].includes(field.type) && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Options (one per line)</Label>
                                      <Textarea
                                        rows={4}
                                        className="text-xs font-mono"
                                        placeholder={"Option 1\nOption 2\nOption 3"}
                                        value={field.options?.join("\n") || ""}
                                        onChange={(e) => updateField(index, { options: e.target.value.split("\n") })}
                                      />
                                      <p className="text-[10px] text-muted-foreground">
                                        {field.options?.filter(Boolean).length || 0} options defined
                                      </p>
                                    </div>
                                  )}

                                  {/* Description */}
                                  {!["heading", "info"].includes(field.type) && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Helper Text (optional)</Label>
                                      <Input
                                        value={field.description || ""}
                                        onChange={(e) => updateField(index, { description: e.target.value })}
                                        placeholder="Additional guidance for the user"
                                        className="text-sm"
                                      />
                                    </div>
                                  )}

                                  {/* Follow-up details box */}
                                  {["radio", "select", "checkbox"].includes(field.type) && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Follow-up details box (optional)</Label>
                                      <Input
                                        value={field.followUp || ""}
                                        onChange={(e) => updateField(index, { followUp: e.target.value || undefined })}
                                        placeholder='e.g. "Please provide more details..."'
                                        className="text-sm"
                                      />
                                      <p className="text-[10px] text-muted-foreground">
                                        {field.type === "checkbox"
                                          ? "A text box will appear when the checkbox is ticked"
                                          : 'A text box will appear when "Yes" is selected'}
                                      </p>
                                    </div>
                                  )}

                                  {/* Settings row */}
                                  <div className="flex items-center gap-4 pt-1">
                                    {!["heading", "info"].includes(field.type) && (
                                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                                        <Switch
                                          checked={field.required}
                                          onCheckedChange={(v) => updateField(index, { required: v })}
                                          className="scale-75"
                                        />
                                        Required
                                      </label>
                                    )}

                                    {/* Conditional logic */}
                                    {!["heading", "info"].includes(field.type) && checkboxLabels.length > 0 && (
                                      <div className="flex items-center gap-2">
                                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Show when:</Label>
                                        <Select
                                          value={field.showWhen || "always"}
                                          onValueChange={(v) => updateField(index, { showWhen: v === "always" ? undefined : v })}
                                        >
                                          <SelectTrigger className="h-7 text-[11px] w-40"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="always">Always visible</SelectItem>
                                            {checkboxLabels.map((lbl) => (
                                              <SelectItem key={lbl} value={lbl}>✓ {lbl}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Add Field Section */}
            {addFieldOpen ? (
              <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-medium mb-2">Choose a field type:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {FIELD_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => addField(t.value)}
                      className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                    >
                      <t.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{t.label}</p>
                        <p className="text-[10px] text-muted-foreground">{t.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAddFieldOpen(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full border-dashed" onClick={() => setAddFieldOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Field
              </Button>
            )}
          </TabsContent>

          {/* PREVIEW TAB */}
          <TabsContent value="preview" className="flex-1 overflow-y-auto mt-2">
            <div className="max-w-md mx-auto space-y-4 rounded-xl border bg-background p-6 shadow-sm">
              <div className="text-center pb-2">
                <h2 className="text-lg font-semibold">{title || "Untitled Form"}</h2>
                {desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}
              </div>
              <Separator />
              <div className="space-y-4">
                {fields.filter(f => f.label.trim()).map((field, i) => renderPreviewField(field, i))}
              </div>
              {fields.some(f => f.type === "signature") && (
                <div className="pt-4 border-t">
                  <Button disabled className="w-full">Submit Form</Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-3">
          <p className="text-xs text-muted-foreground">
            {fields.filter(f => f.label.trim()).length} fields · {fields.filter(f => f.required).length} required
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              {isNew ? "Create Form" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormBuilderDialog;
