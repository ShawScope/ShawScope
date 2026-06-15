import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Phone, Send, HelpCircle, MessageSquare, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SmsTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerType: string;
  bodyText: string;
  description: string;
  isActive: boolean;
  isNew?: boolean;
  triggerTypeLabels: Record<string, string>;
  availableVars: string[];
  onSave: (data: { triggerType: string; bodyText: string; description: string; isActive: boolean }) => void;
  onSendTest?: () => void;
}

const SmsTemplateEditor: React.FC<SmsTemplateEditorProps> = ({
  open, onOpenChange, triggerType: initTrigger, bodyText: initBody,
  description: initDesc, isActive: initActive, isNew, triggerTypeLabels,
  availableVars, onSave, onSendTest,
}) => {
  const [triggerType, setTriggerType] = useState(initTrigger);
  const [body, setBody] = useState(initBody);
  const [desc, setDesc] = useState(initDesc);
  const [active, setActive] = useState(initActive);

  useEffect(() => {
    if (open) {
      setTriggerType(initTrigger);
      setBody(initBody);
      setDesc(initDesc);
      setActive(initActive);
    }
  }, [open, initTrigger, initBody, initDesc, initActive]);

  const charCount = body.length;
  const segments = charCount <= 160 ? 1 : Math.ceil(charCount / 153);
  const isOverBudget = segments > 3;

  // Estimate with variables expanded (rough: each var ~15 chars)
  const varCount = (body.match(/\{\{[^}]+\}\}/g) || []).length;
  const estimatedLength = charCount + (varCount * 10);
  const estimatedSegments = estimatedLength <= 160 ? 1 : Math.ceil(estimatedLength / 153);

  const insertVariable = (v: string) => {
    setBody(body + v);
    toast.success(`Inserted ${v}`);
  };

  const handleSave = () => {
    onSave({ triggerType, bodyText: body, description: desc, isActive: active });
  };

  // Preview with sample data
  const previewText = body
    .replace(/\{\{client_name\}\}/g, "John Smith")
    .replace(/\{\{service_name\}\}/g, "Earwax Removal")
    .replace(/\{\{date\}\}/g, "15/03/2026")
    .replace(/\{\{time\}\}/g, "10:30")
    .replace(/\{\{address\}\}/g, "10 High Street, DT1 1AA")
    .replace(/\{\{admin_notes\}\}/g, "Please bring any hearing aids");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {isNew ? "New SMS Template" : `Edit: ${triggerTypeLabels[triggerType] || triggerType}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Help */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">SMS Template Tips</p>
                <p>• Keep messages <strong>under 160 characters</strong> for a single SMS (cheaper & faster delivery)</p>
                <p>• Variables like <code className="bg-muted px-1 rounded">{"{{client_name}}"}</code> get replaced with real data when sent</p>
                <p>• Messages over 160 chars are split into segments (153 chars each after the first)</p>
                <p>• Sent from <strong>SHAWSCOPE</strong> as the sender ID</p>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            {isNew && (
              <div className="space-y-1">
                <Label className="text-xs">Trigger Action *</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
                  <option value="">Select a trigger...</option>
                  {Object.entries(triggerTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">When this SMS is automatically sent</p>
              </div>
            )}
            <div className={cn("space-y-1", !isNew && "col-span-2")}>
              <Label className="text-xs">Description</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What triggers this SMS..." />
            </div>
          </div>

          {/* Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Message Text</Label>
              <div className="flex items-center gap-2">
                <Badge variant={isOverBudget ? "destructive" : segments > 1 ? "secondary" : "outline"} className="text-[10px]">
                  {charCount} chars · {segments} SMS{segments > 1 ? " segments" : ""}
                </Badge>
              </div>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="font-mono text-sm"
              placeholder="Hi {{client_name}}, your appointment is confirmed..."
            />
            {/* Character bar */}
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    charCount <= 160 ? "bg-green-500" : charCount <= 306 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${Math.min((charCount / 480) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{charCount} / 160 characters</span>
                <span>{segments} segment{segments > 1 ? "s" : ""} · est. with vars: ~{estimatedSegments}</span>
              </div>
            </div>
            {isOverBudget && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive">This SMS is {segments} segments long. Consider shortening to reduce costs.</p>
              </div>
            )}
          </div>

          {/* Variables */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium">Available Variables — click to insert:</p>
            <div className="flex flex-wrap gap-1.5">
              {availableVars.map((v) => (
                <Badge
                  key={v}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => insertVariable(v)}
                >
                  {v}
                </Badge>
              ))}
            </div>
          </div>

          {/* Phone Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">📱 Phone Preview</Label>
            <div className="max-w-xs mx-auto">
              <div className="rounded-2xl border-2 border-muted bg-muted/20 p-4 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">SHAWSCOPE</p>
                    <p className="text-[10px] text-muted-foreground">Text Message</p>
                  </div>
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted p-3">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{previewText || "Your message will appear here..."}</p>
                </div>
                <p className="text-[10px] text-muted-foreground text-right">Now</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="flex items-center justify-between">
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
              <Button onClick={handleSave}>{isNew ? "Create SMS" : "Save SMS"}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmsTemplateEditor;
