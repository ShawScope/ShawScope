
-- Create referrals table for tracking patient referrals
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  referral_type TEXT NOT NULL DEFAULT 'gp', -- gp, audiologist, specialist, nhs, private
  recipient_name TEXT, -- e.g. "Dr Smith"
  recipient_organisation TEXT, -- e.g. "Dorset County Hospital"
  recipient_email TEXT,
  reason TEXT,
  letter_content TEXT, -- the generated letter/email body
  letter_pdf_path TEXT, -- storage path if saved as PDF
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, acknowledged, completed
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_via TEXT, -- email, post, download
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage referrals"
ON public.referrals
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
