import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Lock, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const DEVICE_TRUST_KEY = "shawscope_device_trusted";
const ADMIN_OAUTH_PENDING_KEY = "shawscope_admin_oauth_pending";
const DEVICE_TRUST_DAYS = 3;

const isDeviceTrusted = (): boolean => {
  const stored = localStorage.getItem(DEVICE_TRUST_KEY);
  if (!stored) return false;
  const expiresAt = new Date(stored);
  return expiresAt > new Date();
};

const trustDevice = () => {
  const expires = new Date();
  expires.setDate(expires.getDate() + DEVICE_TRUST_DAYS);
  localStorage.setItem(DEVICE_TRUST_KEY, expires.toISOString());
};

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [otpCode, setOtpCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const navigate = useNavigate();
  const { session, isAdmin } = useAuth();

  useEffect(() => {
    if (!session || !isAdmin) return;

    if (otpVerified || isDeviceTrusted()) {
      localStorage.removeItem(ADMIN_OAUTH_PENDING_KEY);
      navigate("/admin", { replace: true });
      return;
    }

    if (localStorage.getItem(ADMIN_OAUTH_PENDING_KEY)) {
      void sendSmsAndShowOtp();
    }
  }, [session, isAdmin, otpVerified, navigate]);

  const sendSmsAndShowOtp = async () => {
    setLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const sendRes = await supabase.functions.invoke("send-otp", {
        headers: { Authorization: `Bearer ${currentSession?.access_token}` },
      });
      if (sendRes.error || sendRes.data?.error) {
        toast.error(sendRes.data?.error || "Failed to send SMS code");
        setLoading(false);
        return false;
      }
      const phone = sendRes.data?.maskedPhone ?? sendRes.data?.phone;
      if (phone) setMaskedPhone(phone);
      setStep("otp");
      setOtpCode("");
      toast.success("SMS code sent to your phone");
      setLoading(false);
      return true;
    } catch {
      toast.error("Failed to send SMS code");
      setLoading(false);
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Invalid credentials");
      setLoading(false);
      return;
    }

    if (isDeviceTrusted()) {
      setOtpVerified(true);
      setLoading(false);
      return;
    }

    // Send SMS code
    await sendSmsAndShowOtp();
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otpCode.length !== 6) return;
    setLoading(true);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("verify-otp", {
        body: { code: otpCode },
        headers: { Authorization: `Bearer ${currentSession?.access_token}` },
      });

      if (res.error || res.data?.error) {
        toast.error(res.data?.error || "Invalid code");
        setOtpCode("");
        setLoading(false);
        return;
      }

      toast.success("Welcome back!");
      if (rememberDevice) {
        trustDevice();
      }
      setOtpVerified(true);
    } catch {
      toast.error("Verification failed");
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("send-otp", {
        headers: { Authorization: `Bearer ${currentSession?.access_token}` },
      });
      if (res.error || res.data?.error) {
        toast.error("Failed to resend code");
      } else {
        toast.success("New code sent!");
        setOtpCode("");
      }
    } catch {
      toast.error("Failed to resend code");
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    await supabase.auth.signOut();
    setStep("credentials");
    setOtpCode("");
    setOtpVerified(false);
    localStorage.removeItem(DEVICE_TRUST_KEY);
    localStorage.removeItem(ADMIN_OAUTH_PENDING_KEY);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mb-2">
            <Link to="/" className="inline-block font-serif text-lg text-muted-foreground hover:text-foreground">Parkly<span className="text-secondary">Scope</span></Link>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Mobile Clinic System</p>
            <div className="mt-2 flex justify-center">
              <Badge variant="outline" className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px] font-medium">
                <ShieldCheck className="h-3 w-3" /> Secured by Lovable
              </Badge>
            </div>
          </div>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            {step === "credentials" ? (
              <Lock className="h-6 w-6 text-primary-foreground" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            )}
          </div>
          <CardTitle className="font-serif text-2xl">
            {step === "credentials" ? "Admin Login" : "Verify Your Identity"}
          </CardTitle>
          <CardDescription>
            {step === "credentials"
              ? "Sign in to ParklyScope"
              : (
                <span className="flex items-center justify-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" />
                  Code sent to {maskedPhone}
                </span>
              )
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@shawscope.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                >
                  Forgot password?
                </button>
              </div>

              {forgotOpen && (
                <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                  <Label htmlFor="forgot-email" className="text-xs">Send reset link to</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1"
                      disabled={loading || !forgotEmail}
                      onClick={async () => {
                        setLoading(true);
                        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        setLoading(false);
                        if (error) {
                          toast.error(error.message);
                        } else {
                          toast.success("Reset link sent — check your inbox (and junk folder).");
                          setForgotOpen(false);
                        }
                      }}
                    >
                      Send reset link
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setForgotOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="relative my-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  or
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  localStorage.setItem(ADMIN_OAUTH_PENDING_KEY, "true");
                  const { error } = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: `${window.location.origin}/login`,
                  });
                  if (error) {
                    localStorage.removeItem(ADMIN_OAUTH_PENDING_KEY);
                    toast.error("Google sign-in failed");
                    setLoading(false);
                  }
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Label>Enter your 6-digit code</Label>
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={() => handleVerifyOtp()}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6}>
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <Button type="button" variant="ghost" size="sm" onClick={handleResendCode} disabled={loading}>
                  Resend code
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)} className="rounded border-input" />
                Remember this device for {DEVICE_TRUST_DAYS} days
              </label>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
