UPDATE public.consent_form_templates
SET fields = (
  SELECT jsonb_agg(
    CASE
      WHEN (elem->>'type') = 'radio'
       AND (elem->>'label') = 'Have you had Cryotherapy before?'
      THEN elem || jsonb_build_object('followUp', 'When was your last treatment, and where was it carried out?')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(fields) AS elem
),
updated_at = now()
WHERE id = '252ae8c1-9cd1-44d6-a3d2-1583545cd763';