
UPDATE consent_form_templates 
SET fields = '[
  {"label": "Date", "type": "text", "required": true},
  {"label": "Patient Name", "type": "text", "required": true},
  {"label": "Date of Birth", "type": "text", "required": false},

  {"label": "Presenting Complaint", "type": "textarea", "required": true, "placeholder": "Main concern, duration, affected area"},
  {"label": "Affected Foot", "type": "select", "required": true, "options": ["Left", "Right", "Both"]},
  {"label": "Pain Level", "type": "select", "required": false, "options": ["None", "Mild", "Moderate", "Severe"]},

  {"label": "Relevant Medical History", "type": "checkbox", "required": false},
  {"label": "Medical History Details", "type": "textarea", "required": false, "showWhen": "Relevant Medical History", "placeholder": "Diabetes, circulatory problems, neuropathy, skin conditions"},
  {"label": "Diabetes Type", "type": "select", "required": false, "showWhen": "Relevant Medical History", "options": ["N/A", "Type 1", "Type 2", "Gestational", "Other"]},

  {"label": "Current Medications", "type": "checkbox", "required": false},
  {"label": "Medication Details", "type": "textarea", "required": false, "showWhen": "Current Medications", "placeholder": "Anticoagulants, steroids, immunosuppressants"},

  {"label": "Allergies", "type": "checkbox", "required": false},
  {"label": "Allergy Details", "type": "textarea", "required": false, "showWhen": "Allergies", "placeholder": "Medications, latex, plasters, dressings"},

  {"label": "── SKIN ASSESSMENT ──", "type": "heading"},
  {"label": "Skin Condition", "type": "multiselect", "required": false, "options": ["Healthy", "Dry / Xerosis", "Macerated", "Callus present", "Corn present", "Fissures / Cracking", "Tinea pedis (athlete''s foot)", "Verruca", "Cellulitis", "Ulceration", "Blistering", "Discolouration", "Oedema", "Hyperkeratosis", "Other"]},
  {"label": "Skin Notes", "type": "textarea", "required": false, "placeholder": "Additional skin observations"},

  {"label": "── NAIL ASSESSMENT ──", "type": "heading"},
  {"label": "Nail Condition", "type": "multiselect", "required": false, "options": ["Healthy", "Thickened / Onychauxis", "Fungal / Onychomycosis", "Involuted", "Ingrown / Onychocryptosis", "Ram''s horn / Onychogryphosis", "Discoloured", "Brittle / Onychorrhexis", "Subungual haematoma", "Detached / Onycholysis", "Pincer nail", "Other"]},
  {"label": "Nails Affected", "type": "multiselect", "required": false, "options": ["Hallux L", "Hallux R", "2nd toe L", "2nd toe R", "3rd toe L", "3rd toe R", "4th toe L", "4th toe R", "5th toe L", "5th toe R", "All toes L", "All toes R"]},
  {"label": "Nail Notes", "type": "textarea", "required": false, "placeholder": "Additional nail observations"},

  {"label": "── VASCULAR ASSESSMENT ──", "type": "heading"},
  {"label": "Dorsalis Pedis Pulse - Left", "type": "select", "required": false, "options": ["Present & strong", "Present & weak", "Absent", "Not assessed"]},
  {"label": "Dorsalis Pedis Pulse - Right", "type": "select", "required": false, "options": ["Present & strong", "Present & weak", "Absent", "Not assessed"]},
  {"label": "Posterior Tibial Pulse - Left", "type": "select", "required": false, "options": ["Present & strong", "Present & weak", "Absent", "Not assessed"]},
  {"label": "Posterior Tibial Pulse - Right", "type": "select", "required": false, "options": ["Present & strong", "Present & weak", "Absent", "Not assessed"]},
  {"label": "Capillary Refill", "type": "select", "required": false, "options": ["Normal (< 3 sec)", "Delayed (3-5 sec)", "Significantly delayed (> 5 sec)", "Not assessed"]},
  {"label": "Skin Temperature", "type": "select", "required": false, "options": ["Warm", "Cool", "Cold", "Not assessed"]},
  {"label": "Oedema", "type": "select", "required": false, "options": ["None", "Mild", "Moderate", "Severe", "Pitting"]},
  {"label": "Skin Colour", "type": "select", "required": false, "options": ["Normal", "Pale", "Cyanotic", "Erythematous", "Mottled"]},

  {"label": "── NEUROLOGICAL ASSESSMENT ──", "type": "heading"},
  {"label": "10g Monofilament Test - Left", "type": "select", "required": false, "options": ["Sensation intact (all sites)", "Reduced sensation", "No sensation", "Not assessed"]},
  {"label": "10g Monofilament Test - Right", "type": "select", "required": false, "options": ["Sensation intact (all sites)", "Reduced sensation", "No sensation", "Not assessed"]},
  {"label": "Vibration Sense", "type": "select", "required": false, "options": ["Normal", "Reduced", "Absent", "Not assessed"]},
  {"label": "Sharp/Blunt Discrimination", "type": "select", "required": false, "options": ["Normal", "Reduced", "Absent", "Not assessed"]},

  {"label": "── MUSCULOSKELETAL ──", "type": "heading"},
  {"label": "Foot Deformities", "type": "multiselect", "required": false, "options": ["None", "Hallux valgus (bunion)", "Hammer toes", "Claw toes", "Mallet toes", "Pes planus (flat foot)", "Pes cavus (high arch)", "Charcot foot", "Tailor''s bunion", "Overlapping toes", "Other"]},
  {"label": "Gait Assessment", "type": "select", "required": false, "options": ["Normal", "Antalgic", "Shuffling", "Unsteady", "Uses walking aid", "Wheelchair user", "Not assessed"]},
  {"label": "Footwear Assessment", "type": "select", "required": false, "options": ["Appropriate", "Too tight", "Too loose", "Worn / unsupportive", "Inappropriate style", "Orthotics present", "Not assessed"]},

  {"label": "Diabetic Foot Risk Classification", "type": "select", "required": false, "options": ["N/A", "Low Risk", "Moderate Risk", "High Risk", "Active / Ulcerated"]},

  {"label": "Other Observations / Tests", "type": "textarea", "required": false, "placeholder": "e.g. ABI, Doppler, wound measurements, dermatological observations"},

  {"label": "── TREATMENT ──", "type": "heading"},
  {"label": "Treatment Performed", "type": "multiselect", "required": true, "options": ["Nail cutting / filing", "Nail thinning / reduction", "Callus reduction", "Corn enucleation", "Verruca treatment", "Wound care / dressing", "Ingrown nail management", "Fungal nail treatment", "Diabetic foot check", "Biomechanical assessment", "Padding / strapping", "Advice only", "Other"]},
  {"label": "Treatment Details", "type": "textarea", "required": false, "placeholder": "Additional treatment details if needed"},
  {"label": "Equipment Used", "type": "multiselect", "required": false, "options": ["Nail nippers", "Nail file / Blacks file", "Scalpel (blade no.)", "Diamond deb", "Burr / drill", "Autoclave-sterilised instruments", "Dressing materials", "Padding / felt", "Cryotherapy", "Other"]},
  {"label": "Photos - Before Treatment", "type": "photo", "required": false},
  {"label": "Photos - After Treatment", "type": "photo", "required": false},

  {"label": "Outcome", "type": "select", "required": true, "options": ["Resolved", "Improved", "Unchanged", "Requires further treatment", "Referred onwards"]},
  {"label": "Outcome Notes", "type": "textarea", "required": false, "placeholder": "Additional outcome details"},

  {"label": "Complications", "type": "checkbox", "required": false},
  {"label": "Complication Details", "type": "textarea", "required": false, "showWhen": "Complications", "placeholder": "Bleeding, pain, infection signs"},

  {"label": "Aftercare Advice Given", "type": "checkbox", "required": false},
  {"label": "Aftercare Topics", "type": "multiselect", "required": false, "showWhen": "Aftercare Advice Given", "options": ["Moisturising / emollient use", "Proper nail cutting technique", "Footwear advice", "Diabetic foot care", "Exercise / mobility", "When to seek medical help", "Wound care instructions", "Infection signs to watch for", "Padding / offloading advice", "Fungal treatment regime"]},

  {"label": "Follow-up Required", "type": "checkbox", "required": false},
  {"label": "Follow-up Timeframe", "type": "select", "required": false, "showWhen": "Follow-up Required", "options": ["1 week", "2 weeks", "4 weeks", "6 weeks", "8 weeks", "3 months", "6 months"]},
  {"label": "Follow-up Notes", "type": "textarea", "required": false, "showWhen": "Follow-up Required", "placeholder": "Reason, home care instructions"},

  {"label": "Referral to GP / Professional", "type": "checkbox", "required": false},
  {"label": "Referral Type", "type": "select", "required": false, "showWhen": "Referral to GP / Professional", "options": ["GP", "Podiatrist / Chiropodist", "Vascular specialist", "Diabetic foot team", "Orthotics / Biomechanics", "Dermatology", "Orthopaedics", "Other"]},
  {"label": "Referral Details", "type": "textarea", "required": false, "showWhen": "Referral to GP / Professional", "placeholder": "Reason and urgency"},

  {"label": "Completed By", "type": "text", "required": true}
]'::jsonb,
updated_at = now()
WHERE id = '75137690-b712-4730-9263-5be456c4703d';
