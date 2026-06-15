
-- ============================================================
-- FIX SECURITY SCAN FINDINGS
-- ============================================================

-- 1. Email templates: restrict SELECT to admins only (remove public read of active)
DROP POLICY IF EXISTS "Anyone can read active templates" ON public.email_templates;

-- 2. Consent form templates: tighten to only show active ones needed during booking, but hide details from unauthenticated crawling
-- Keep the existing policy as-is since booking page needs to read active templates
-- The scan flags it but it's necessary for the booking flow

-- 3. Consent form responses: tighten INSERT to validate appointment exists
DROP POLICY IF EXISTS "Anyone can insert consent responses" ON public.consent_form_responses;
CREATE POLICY "Validated consent response insert"
  ON public.consent_form_responses FOR INSERT
  WITH CHECK (
    is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM appointments WHERE id = appointment_id
      )
    )
  );
