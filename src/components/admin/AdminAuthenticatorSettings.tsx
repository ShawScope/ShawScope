import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, KeyRound, Copy } from "lucide-react";

const AdminAuthenticatorSettings = () => {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const { session } = useAuth();

  const invoke = async (body: Record<string, unknown>) => {
    return supabase.functions.invoke("admin-authenticator", {
      body,
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
  };

  const loadStatus = async () => {
    setLoading(true);
    const res = await invoke({ action: "status" });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || res.error?.message || "Could not load authenticator status");
      setLoading(false);
      return;
    }
    setEnabled(!!res.data?.enabled);
    setConfigured(!!res.data?.configured);
    setLoading(false);
  };

  useEffect(() => {
    if (session?.access_token) {
      loadStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const startSetup = async () => {
    setBusy(true);
    const res = await invoke({ action: "setup" });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || res.error?.message || "Could not start setup");
      setBusy(false);
      return;
    }
    setSecret(res.data.secret || "");
    setOtpauthUri(res.data.otpauthUri || "");
    setConfigured(true);
    setEnabled(false);
    setCode("");
    toast.success("Setup key generated");
    setBusy(false);
  };

  const confirmEnable = async () => {
    if (code.length !== 6) {
      toast.error("Enter a 6-digit code");
      return;
    }
    setBusy(true);
    const res = await invoke({ action: "enable", code });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || res.error?.message || "Code verification failed");
      setBusy(false);
      return;
    }
    setEnabled(true);
    setCode("");
    setSecret("");
    setOtpauthUri("");
    toast.success("Authenticator enabled");
    setBusy(false);
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Authenticator App
        </CardTitle>
        <CardDescription>
          Use Microsoft Authenticator (or any TOTP app) for admin verification codes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading authenticator status…</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Badge variant={enabled ? "default" : "outline"}>{enabled ? "Enabled" : "Not enabled"}</Badge>
              {configured && !enabled && <Badge variant="secondary">Setup pending</Badge>}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={startSetup} disabled={busy}>
                <KeyRound className="h-4 w-4 mr-1.5" />
                {configured ? "Reset setup key" : "Set up authenticator"}
              </Button>
            </div>

            {secret && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-sm font-medium">Step 1: Add account in Microsoft Authenticator</p>
                <p className="text-xs text-muted-foreground">In Microsoft Authenticator: <strong>+</strong> → <strong>Other account</strong> (or manual entry), then paste this setup key:</p>
                <div className="flex items-center gap-2">
                  <Input value={secret} readOnly className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={() => copyText(secret, "Setup key")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {otpauthUri && (
                  <div className="flex items-center gap-2">
                    <Input value={otpauthUri} readOnly className="font-mono text-[10px]" />
                    <Button type="button" variant="outline" size="icon" onClick={() => copyText(otpauthUri, "Setup URI")}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <p className="text-sm font-medium">Step 2: Enter the 6-digit code to enable</p>
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                    className="max-w-[160px]"
                  />
                  <Button onClick={confirmEnable} disabled={busy || code.length !== 6}>Enable</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAuthenticatorSettings;
