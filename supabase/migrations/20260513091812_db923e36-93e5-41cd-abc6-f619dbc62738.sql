
-- Expenses table
CREATE TABLE public.accounts_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  description text,
  vendor text,
  amount numeric NOT NULL DEFAULT 0,
  vat_amount numeric DEFAULT 0,
  payment_method text,
  receipt_path text,
  receipt_name text,
  receipt_mime text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expenses" ON public.accounts_expenses FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_accounts_expenses_updated BEFORE UPDATE ON public.accounts_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_accounts_expenses_date ON public.accounts_expenses(expense_date);

-- Employment income table (PAYE / second job)
CREATE TABLE public.accounts_employment_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_date date NOT NULL DEFAULT CURRENT_DATE,
  employer text,
  period_label text,
  gross_pay numeric NOT NULL DEFAULT 0,
  tax_paid numeric NOT NULL DEFAULT 0,
  ni_paid numeric NOT NULL DEFAULT 0,
  pension numeric NOT NULL DEFAULT 0,
  tax_year_start date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts_employment_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage employment income" ON public.accounts_employment_income FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_accounts_emp_updated BEFORE UPDATE ON public.accounts_employment_income FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_accounts_emp_pay_date ON public.accounts_employment_income(pay_date);

-- Storage bucket for receipts (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('accounts-receipts', 'accounts-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'accounts-receipts' AND is_admin());
CREATE POLICY "Admins upload receipts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'accounts-receipts' AND is_admin());
CREATE POLICY "Admins update receipts" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'accounts-receipts' AND is_admin());
CREATE POLICY "Admins delete receipts" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'accounts-receipts' AND is_admin());
