import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { AlertTriangle, ChevronDown, ChevronUp, Mail, Phone, MessageSquare, RefreshCw, Trash2, TrendingUp, HelpCircle, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatLog {
  id: string;
  session_id: string;
  messages: Json;
  patient_email: string | null;
  patient_phone: string | null;
  escalated: boolean;
  escalation_reason: string | null;
  admin_read: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatLogsTabProps {
  onUnreadCountChange?: (count: number) => void;
}

const ChatLogsTab = ({ onUnreadCountChange }: ChatLogsTabProps) => {
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "escalated" | "unread">("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchChatLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("chat_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) setChatLogs(data);
    setLoading(false);
  };

  useEffect(() => { fetchChatLogs(); }, []);

  const unreadCount = chatLogs.filter(c => !c.admin_read).length;
  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  const filtered = filter === "escalated" ? chatLogs.filter(c => c.escalated) : filter === "unread" ? chatLogs.filter(c => !c.admin_read) : chatLogs;
  const escalatedCount = chatLogs.filter(c => c.escalated).length;

  const markAllRead = async () => {
    const unreadIds = chatLogs.filter(c => !c.admin_read).map(c => c.id);
    if (unreadIds.length === 0) return;
    await supabase.from("chat_logs").update({ admin_read: true } as any).in("id", unreadIds);
    setChatLogs(prev => prev.map(c => ({ ...c, admin_read: true })));
    toast.success("All conversations marked as read");
  };

  const markRead = async (id: string) => {
    await supabase.from("chat_logs").update({ admin_read: true } as any).eq("id", id);
    setChatLogs(prev => prev.map(c => c.id === id ? { ...c, admin_read: true } : c));
  };

  const parseMessages = (msgs: Json): ChatMessage[] => {
    if (Array.isArray(msgs)) return msgs as unknown as ChatMessage[];
    return [];
  };

  // Delete a conversation
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    setDeleting(id);
    const { error } = await supabase.from("chat_logs").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setChatLogs(prev => prev.filter(c => c.id !== id));
      if (expandedId === id) setExpandedId(null);
      toast.success("Conversation deleted");
    }
    setDeleting(null);
  };

  // Trending questions — extract user messages, normalize & count
  const trendingQuestions = useMemo(() => {
    const questionMap: Record<string, { text: string; count: number }> = {};

    chatLogs.forEach(log => {
      const messages = parseMessages(log.messages);
      const userMsgs = messages.filter(m => m.role === "user");
      userMsgs.forEach(msg => {
        const cleaned = msg.content.trim().toLowerCase().replace(/[?.!]+$/, "").trim();
        if (cleaned.length < 8 || cleaned.length > 200) return; // skip too short/long
        // Simple dedup: use first 60 chars as key
        const key = cleaned.slice(0, 60);
        if (!questionMap[key]) {
          questionMap[key] = { text: msg.content.trim(), count: 0 };
        }
        questionMap[key].count++;
      });
    });

    return Object.values(questionMap)
      .filter(q => q.count >= 2) // only show repeated questions
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [chatLogs]);

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="font-serif text-2xl font-bold text-foreground">Chatbot Conversations</h2>
        <p className="text-sm text-muted-foreground mt-1">Review patient chatbot interactions, escalations, and trending questions</p>
      </div>
      {/* Trending Questions */}
      <Card className="border-sky-800/40 bg-sky-950/20">
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-2 cursor-pointer hover:bg-sky-900/20 transition-colors rounded-t-lg">
              <CardTitle className="font-serif text-sm text-sky-200 flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-sky-500/20"><TrendingUp className="h-4 w-4 text-sky-400" /></div>
                Trending Patient Questions
                <Badge variant="outline" className="text-[10px] border-sky-600/40 text-sky-300 ml-auto">{trendingQuestions.length} topics</Badge>
                <ChevronDown className="h-4 w-4 text-sky-400" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-3">
              <p className="text-[10px] text-muted-foreground mb-3 italic">
                This section automatically tracks the most common questions patients ask the AI chatbot. Use these insights to improve your website content, update your FAQ page, or identify gaps in information that patients are looking for. Questions that appear 2 or more times across conversations will surface here.
              </p>
              {trendingQuestions.length > 0 ? (
                <div className="space-y-1.5">
                  {trendingQuestions.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-md border border-sky-800/30 bg-sky-950/30 p-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-[10px] font-bold text-sky-300 mt-0.5">
                        {q.count}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-sky-100 line-clamp-2">{q.text}</p>
                      </div>
                      <HelpCircle className="h-3.5 w-3.5 text-sky-400/50 shrink-0 mt-0.5" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <HelpCircle className="h-8 w-8 text-sky-400/30 mb-2" />
                  <p className="text-xs text-sky-300/60">No trending questions yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">As patients chat with the AI, repeated questions will appear here automatically.</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-serif font-semibold text-white">Conversations</h2>
          {escalatedCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {escalatedCount} escalated
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")} className="h-7 text-xs">
            All ({chatLogs.length})
          </Button>
          <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")} className="h-7 text-xs">
            Unread ({unreadCount})
          </Button>
          <Button variant={filter === "escalated" ? "default" : "outline"} size="sm" onClick={() => setFilter("escalated")} className="h-7 text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" /> Escalated ({escalatedCount})
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="h-7 text-xs">
              <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchChatLogs}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading conversations...</p>
      ) : filtered.length === 0 ? (
        <Card className="bg-card/60 border-border">
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/70" />
            <p className="text-sm text-muted-foreground">
              {filter === "escalated" ? "No escalated conversations" : "No chatbot conversations yet"}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Conversations will appear here when patients use the AI chatbot on the website.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => {
            const messages = parseMessages(log.messages);
            const isExpanded = expandedId === log.id;
            const userMessages = messages.filter(m => m.role === "user");
            const firstUserMsg = userMessages[0]?.content || "No message";
            const preview = firstUserMsg.length > 100 ? firstUserMsg.slice(0, 100) + "…" : firstUserMsg;

            return (
              <Card
                key={log.id}
                className={cn(
                  "transition-all bg-card/60 border-border",
                  log.escalated && "border-destructive/50 bg-red-950/30",
                  !log.admin_read && "border-primary/50 bg-primary/5"
                )}
              >
                <Collapsible open={isExpanded} onOpenChange={() => {
                  setExpandedId(isExpanded ? null : log.id);
                  if (!log.admin_read) markRead(log.id);
                }}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg">
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full mt-0.5",
                        log.escalated ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
                      )}>
                        {log.escalated ? <AlertTriangle className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {messages.length} messages
                          </Badge>
                          {!log.admin_read && (
                            <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">New</Badge>
                          )}
                          {log.escalated && (
                            <Badge variant="destructive" className="text-[10px]">
                              Escalated
                            </Badge>
                          )}
                          {log.patient_email && (
                            <Badge variant="secondary" className="text-[10px]">
                              <Mail className="h-2.5 w-2.5 mr-1" />
                              {log.patient_email}
                            </Badge>
                          )}
                          {log.patient_phone && (
                            <Badge variant="secondary" className="text-[10px]">
                              <Phone className="h-2.5 w-2.5 mr-1" />
                              {log.patient_phone}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mt-1 text-white/80 line-clamp-1">{preview}</p>
                        {log.escalation_reason && (
                          <p className="text-xs text-destructive mt-0.5 italic">
                            Reason: {log.escalation_reason}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDelete(log.id, e)}
                          disabled={deleting === log.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-1 border-t border-border/50">
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {messages.map((msg, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex gap-2 text-sm",
                              msg.role === "user" ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[80%] rounded-lg px-3 py-2",
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                                {msg.role === "user" ? "Patient" : "Matt AI"}
                              </p>
                              <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChatLogsTab;
