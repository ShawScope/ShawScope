import React, { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Mail, Eye, Code, Pencil, Plus, Trash2, Type, Image, Minus, Link,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Palette,
  GripVertical, ChevronDown, ChevronUp, HelpCircle, Send, Copy, Sparkles
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type BlockType = "header" | "text" | "button" | "divider" | "spacer" | "image";

interface EmailBlock {
  id: string;
  type: BlockType;
  content: string;
  style?: {
    align?: "left" | "center" | "right";
    color?: string;
    bgColor?: string;
    fontSize?: string;
    bold?: boolean;
    italic?: boolean;
    url?: string;
    width?: string;
    padding?: string;
  };
}

interface EmailTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerType: string;
  subject: string;
  bodyHtml: string;
  description: string;
  isActive: boolean;
  isNew?: boolean;
  triggerTypeLabels: Record<string, string>;
  availableVars: string[];
  onSave: (data: { triggerType: string; subject: string; bodyHtml: string; description: string; isActive: boolean }) => void;
  onSendTest?: () => void;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ElementType; description: string }[] = [
  { type: "header", label: "Heading", icon: Type, description: "Large bold text" },
  { type: "text", label: "Text", icon: AlignLeft, description: "Paragraph text" },
  { type: "button", label: "Button", icon: Link, description: "Call-to-action button" },
  { type: "divider", label: "Divider", icon: Minus, description: "Horizontal line" },
  { type: "spacer", label: "Spacer", icon: ChevronDown, description: "Vertical space" },
  { type: "image", label: "Image", icon: Image, description: "Image from URL" },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

// Parse existing HTML into blocks (basic)
const parseHtmlToBlocks = (html: string): EmailBlock[] => {
  if (!html || html.trim() === "") return [
    { id: generateId(), type: "header", content: "Email Title", style: { align: "center", color: "#292524", fontSize: "22px" } },
    { id: generateId(), type: "text", content: "Your email content here...", style: { align: "left", color: "#333333" } },
    { id: generateId(), type: "divider", content: "" },
    { id: generateId(), type: "text", content: "Kind regards,\nMatt Shaw\nShawScope Clinical Services", style: { align: "center", color: "#999999", fontSize: "13px" } },
  ];

  // Return a single "raw HTML" block for existing templates
  return [{ id: generateId(), type: "text", content: "⚠️ This template was created with raw HTML. Edit below or rebuild using blocks.", style: { color: "#92400e" } }];
};

// Render blocks to HTML
const blocksToHtml = (blocks: EmailBlock[]): string => {
  const renderBlock = (block: EmailBlock): string => {
    const align = block.style?.align || "left";
    const color = block.style?.color || "#333333";
    const fontSize = block.style?.fontSize || "14px";
    const bold = block.style?.bold ? "font-weight:bold;" : "";
    const italic = block.style?.italic ? "font-style:italic;" : "";

    switch (block.type) {
      case "header":
        return `<h2 style="text-align:${align};color:${color};font-size:${fontSize};margin:0 0 16px;${bold}${italic}">${block.content}</h2>`;
      case "text":
        return `<p style="text-align:${align};color:${color};font-size:${fontSize};line-height:1.6;margin:0 0 16px;${bold}${italic}">${block.content.replace(/\n/g, "<br/>")}</p>`;
      case "button":
        const bgColor = block.style?.bgColor || "#292524";
        const btnColor = block.style?.color || "#ffffff";
        const url = block.style?.url || "#";
        return `<div style="text-align:${align};margin:20px 0;"><a href="${url}" style="display:inline-block;padding:14px 36px;background-color:${bgColor};color:${btnColor};text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">${block.content}</a></div>`;
      case "divider":
        return `<hr style="border:none;border-top:1px solid #e7e5e4;margin:20px 0;" />`;
      case "spacer":
        return `<div style="height:${block.style?.padding || "20px"};"></div>`;
      case "image":
        return `<div style="text-align:${align};margin:16px 0;"><img src="${block.content}" alt="" style="max-width:${block.style?.width || "100%"};border-radius:8px;" /></div>`;
      default:
        return "";
    }
  };

  const body = blocks.map(renderBlock).join("\n");
  return `<div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;padding:0;">
  <div style="background-color:#292524;padding:20px 24px;text-align:center;">
    <h1 style="color:#FAFAF9;font-size:18px;letter-spacing:2px;margin:0;text-transform:uppercase;">ShawScope</h1>
  </div>
  <div style="padding:32px 24px;">
    ${body}
  </div>
  <div style="background-color:#292524;padding:16px 24px;text-align:center;">
    <p style="color:#a8a29e;font-size:11px;margin:0;">ShawScope · Dorchester, Dorset</p>
  </div>
</div>`;
};

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  open, onOpenChange, triggerType: initTriggerType, subject: initSubject,
  bodyHtml: initBodyHtml, description: initDesc, isActive: initActive,
  isNew, triggerTypeLabels, availableVars, onSave, onSendTest,
}) => {
  const [triggerType, setTriggerType] = useState(initTriggerType);
  const [subject, setSubject] = useState(initSubject);
  const [bodyHtml, setBodyHtml] = useState(initBodyHtml);
  const [desc, setDesc] = useState(initDesc);
  const [active, setActive] = useState(initActive);
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [activeTab, setActiveTab] = useState<string>("visual");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [addBlockOpen, setAddBlockOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTriggerType(initTriggerType);
      setSubject(initSubject);
      setBodyHtml(initBodyHtml);
      setDesc(initDesc);
      setActive(initActive);
      setBlocks(parseHtmlToBlocks(initBodyHtml));
      setSelectedBlock(null);
    }
  }, [open, initTriggerType, initSubject, initBodyHtml, initDesc, initActive]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(blocks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setBlocks(items);
  }, [blocks]);

  const addBlock = (type: BlockType) => {
    const defaults: Record<BlockType, Partial<EmailBlock>> = {
      header: { content: "Heading Text", style: { align: "center", color: "#292524", fontSize: "22px", bold: true } },
      text: { content: "Your text here...", style: { color: "#333333", fontSize: "14px" } },
      button: { content: "Click Here →", style: { bgColor: "#292524", color: "#ffffff", url: "{{consent_form_url}}", align: "center" } },
      divider: { content: "" },
      spacer: { content: "", style: { padding: "20px" } },
      image: { content: "", style: { align: "center", width: "100%" } },
    };
    const newBlock: EmailBlock = { id: generateId(), type, ...defaults[type] } as EmailBlock;
    setBlocks([...blocks, newBlock]);
    setSelectedBlock(newBlock.id);
    setAddBlockOpen(false);
  };

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates, style: { ...b.style, ...updates.style } } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlock === id) setSelectedBlock(null);
  };

  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const copy = { ...blocks[idx], id: generateId() };
    if (copy.style) copy.style = { ...copy.style };
    const updated = [...blocks];
    updated.splice(idx + 1, 0, copy);
    setBlocks(updated);
    setSelectedBlock(copy.id);
  };

  const insertVariable = (variable: string) => {
    if (!selectedBlock) {
      navigator.clipboard.writeText(variable);
      toast.success(`Copied ${variable} — paste where needed`);
      return;
    }
    const block = blocks.find(b => b.id === selectedBlock);
    if (block) {
      updateBlock(selectedBlock, { content: block.content + variable });
    }
  };

  const handleSave = () => {
    const finalHtml = activeTab === "code" ? bodyHtml : blocksToHtml(blocks);
    onSave({ triggerType, subject, bodyHtml: finalHtml, description: desc, isActive: active });
  };

  const selectedBlockData = blocks.find(b => b.id === selectedBlock);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {isNew ? "New Email Template" : `Edit: ${triggerTypeLabels[triggerType] || triggerType}`}
          </DialogTitle>
        </DialogHeader>

        {/* Meta fields */}
        <div className="grid grid-cols-3 gap-3">
          {isNew && (
            <div className="space-y-1">
              <Label className="text-xs">Trigger Action *</Label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
                <option value="">Select a trigger...</option>
                {Object.entries(triggerTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}
          <div className={cn("space-y-1", !isNew && "col-span-2")}>
            <Label className="text-xs">Subject Line *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What this email does..." />
          </div>
        </div>

        {/* Editor */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visual" className="text-xs"><Pencil className="h-3.5 w-3.5 mr-1.5" /> Visual Editor</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs"><Eye className="h-3.5 w-3.5 mr-1.5" /> Preview</TabsTrigger>
            <TabsTrigger value="code" className="text-xs"><Code className="h-3.5 w-3.5 mr-1.5" /> HTML Code</TabsTrigger>
          </TabsList>

          {/* VISUAL EDITOR */}
          <TabsContent value="visual" className="flex-1 overflow-hidden flex gap-3 mt-2">
            {/* Blocks List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {/* Help */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5">
                <div className="flex items-start gap-2">
                  <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <div className="text-[11px] text-muted-foreground">
                    <p><strong>Drag</strong> blocks to reorder · <strong>Click</strong> to select & edit · Use <strong>Variables</strong> panel to insert dynamic data</p>
                  </div>
                </div>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="email-blocks">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                      {blocks.map((block, index) => (
                        <Draggable key={block.id} draggableId={block.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "rounded-lg border bg-card p-2.5 cursor-pointer transition-all",
                                selectedBlock === block.id && "ring-2 ring-primary/40 border-primary/40",
                                snapshot.isDragging && "shadow-lg"
                              )}
                              onClick={() => setSelectedBlock(block.id)}
                            >
                              <div className="flex items-center gap-2">
                                <div {...provided.dragHandleProps} className="cursor-grab p-0.5 rounded hover:bg-muted">
                                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <Badge variant="outline" className="text-[9px] px-1.5 shrink-0">
                                  {BLOCK_TYPES.find(t => t.type === block.type)?.label || block.type}
                                </Badge>
                                <span className="flex-1 text-xs truncate text-muted-foreground">
                                  {block.type === "divider" ? "———" : block.type === "spacer" ? "↕ Space" : block.content.substring(0, 50)}
                                </span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {addBlockOpen ? (
                <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs font-medium mb-2">Add block:</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {BLOCK_TYPES.map((t) => (
                      <button key={t.type} onClick={() => addBlock(t.type)} className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2 hover:bg-muted/50 transition-colors">
                        <t.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="text-left">
                          <p className="text-[11px] font-medium">{t.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAddBlockOpen(false)}>Cancel</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setAddBlockOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Block
                </Button>
              )}
            </div>

            {/* Properties Panel */}
            <div className="w-64 border-l pl-3 overflow-y-auto space-y-3">
              {selectedBlockData ? (
                <>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Block Settings</h4>
                  <div className="space-y-2">
                    {!["divider", "spacer"].includes(selectedBlockData.type) && (
                      <div className="space-y-1">
                        <Label className="text-[11px]">Content</Label>
                        {selectedBlockData.type === "text" ? (
                          <Textarea
                            rows={4}
                            className="text-xs"
                            value={selectedBlockData.content}
                            onChange={(e) => updateBlock(selectedBlockData.id, { content: e.target.value })}
                          />
                        ) : (
                          <Input
                            className="text-xs"
                            value={selectedBlockData.content}
                            onChange={(e) => updateBlock(selectedBlockData.id, { content: e.target.value })}
                          />
                        )}
                      </div>
                    )}

                    {selectedBlockData.type === "button" && (
                      <div className="space-y-1">
                        <Label className="text-[11px]">Button URL</Label>
                        <Input
                          className="text-xs"
                          value={selectedBlockData.style?.url || ""}
                          onChange={(e) => updateBlock(selectedBlockData.id, { style: { ...selectedBlockData.style, url: e.target.value } })}
                          placeholder="https://..."
                        />
                      </div>
                    )}

                    {!["divider"].includes(selectedBlockData.type) && (
                      <div className="space-y-1">
                        <Label className="text-[11px]">Alignment</Label>
                        <div className="flex gap-1">
                          {(["left", "center", "right"] as const).map((a) => (
                            <Button
                              key={a}
                              variant={selectedBlockData.style?.align === a ? "default" : "outline"}
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateBlock(selectedBlockData.id, { style: { ...selectedBlockData.style, align: a } })}
                            >
                              {a === "left" && <AlignLeft className="h-3 w-3" />}
                              {a === "center" && <AlignCenter className="h-3 w-3" />}
                              {a === "right" && <AlignRight className="h-3 w-3" />}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {["header", "text"].includes(selectedBlockData.type) && (
                      <div className="space-y-1">
                        <Label className="text-[11px]">Text Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={selectedBlockData.style?.color || "#333333"}
                            onChange={(e) => updateBlock(selectedBlockData.id, { style: { ...selectedBlockData.style, color: e.target.value } })}
                            className="h-7 w-7 rounded border cursor-pointer"
                          />
                          <Input
                            className="text-xs flex-1"
                            value={selectedBlockData.style?.color || "#333333"}
                            onChange={(e) => updateBlock(selectedBlockData.id, { style: { ...selectedBlockData.style, color: e.target.value } })}
                          />
                        </div>
                      </div>
                    )}

                    {selectedBlockData.type === "button" && (
                      <div className="space-y-1">
                        <Label className="text-[11px]">Button Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={selectedBlockData.style?.bgColor || "#292524"}
                            onChange={(e) => updateBlock(selectedBlockData.id, { style: { ...selectedBlockData.style, bgColor: e.target.value } })}
                            className="h-7 w-7 rounded border cursor-pointer"
                          />
                          <Input className="text-xs flex-1" value={selectedBlockData.style?.bgColor || "#292524"} onChange={(e) => updateBlock(selectedBlockData.id, { style: { ...selectedBlockData.style, bgColor: e.target.value } })} />
                        </div>
                      </div>
                    )}

                    {["header", "text"].includes(selectedBlockData.type) && (
                      <div className="space-y-1">
                        <Label className="text-[11px]">Font Size</Label>
                        <Select
                          value={selectedBlockData.style?.fontSize || "14px"}
                          onValueChange={(v) => updateBlock(selectedBlockData.id, { style: { ...selectedBlockData.style, fontSize: v } })}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="11px">Small (11px)</SelectItem>
                            <SelectItem value="13px">Caption (13px)</SelectItem>
                            <SelectItem value="14px">Body (14px)</SelectItem>
                            <SelectItem value="16px">Large (16px)</SelectItem>
                            <SelectItem value="18px">H3 (18px)</SelectItem>
                            <SelectItem value="22px">H2 (22px)</SelectItem>
                            <SelectItem value="28px">H1 (28px)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedBlockData.type === "spacer" && (
                      <div className="space-y-1">
                        <Label className="text-[11px]">Height</Label>
                        <Select
                          value={selectedBlockData.style?.padding || "20px"}
                          onValueChange={(v) => updateBlock(selectedBlockData.id, { style: { ...selectedBlockData.style, padding: v } })}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10px">Small (10px)</SelectItem>
                            <SelectItem value="20px">Medium (20px)</SelectItem>
                            <SelectItem value="40px">Large (40px)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <Separator />
                </>
              ) : (
                <div className="rounded-lg bg-muted/50 border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Select a block to edit its properties</p>
                </div>
              )}

              {/* Variables panel */}
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Insert Variable</h4>
                <div className="flex flex-wrap gap-1">
                  {availableVars.map((v) => (
                    <Badge
                      key={v}
                      variant="secondary"
                      className="text-[10px] cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => insertVariable(v)}
                    >
                      {v}
                    </Badge>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Click to insert into selected block, or copy to clipboard</p>
              </div>
            </div>
          </TabsContent>

          {/* PREVIEW */}
          <TabsContent value="preview" className="flex-1 overflow-y-auto mt-2">
            <div className="max-w-2xl mx-auto bg-muted/30 rounded-xl p-6">
              <div className="bg-background rounded-lg shadow-sm overflow-hidden">
                <div dangerouslySetInnerHTML={{ __html: activeTab === "code" ? bodyHtml : blocksToHtml(blocks) }} />
              </div>
            </div>
          </TabsContent>

          {/* CODE */}
          <TabsContent value="code" className="flex-1 overflow-hidden flex flex-col mt-2">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2.5 mb-2">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                ⚠️ Editing raw HTML will disconnect from the visual editor. Use this for advanced customization.
              </p>
            </div>
            <Textarea
              className="flex-1 font-mono text-xs resize-none"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {availableVars.map((v) => (
                <Badge key={v} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => { navigator.clipboard.writeText(v); toast.success(`Copied ${v}`); }}>{v}</Badge>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-3">
            <Switch checked={active} onCheckedChange={setActive} />
            <Label className="text-sm">Active</Label>
            <span className="text-xs text-muted-foreground">Inactive templates won't be sent</span>
          </div>
          <div className="flex gap-2">
            {onSendTest && !isNew && (
              <Button variant="outline" onClick={onSendTest}><Send className="h-4 w-4 mr-1.5" /> Test</Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>{isNew ? "Create Template" : "Save Template"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailTemplateEditor;
