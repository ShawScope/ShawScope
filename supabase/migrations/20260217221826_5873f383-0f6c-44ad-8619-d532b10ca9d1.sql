
-- Table to store OTP codes for admin login verification
CREATE TABLE public.login_otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_otp_codes ENABLE ROW LEVEL SECURITY;

-- Only the service role (edge functions) can manage OTP codes
-- No direct client access needed
CREATE POLICY "Service role only" ON public.login_otp_codes
  FOR ALL USING (false) WITH CHECK (false);

-- Auto-cleanup old codes (optional index for performance)
CREATE INDEX idx_login_otp_user_expires ON public.login_otp_codes (user_id, expires_at DESC);
