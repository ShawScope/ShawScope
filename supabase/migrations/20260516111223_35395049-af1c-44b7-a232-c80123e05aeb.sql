CREATE TABLE public.patient_birthday_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_birthday_cards_patient ON public.patient_birthday_cards(patient_id, sent_at DESC);

ALTER TABLE public.patient_birthday_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage birthday cards"
ON public.patient_birthday_cards
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());