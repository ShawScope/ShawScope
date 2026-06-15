import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedback, step, callback_request } = await req.json();

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stepLabels: Record<number, string> = {
      1: "Service Selection",
      2: "Date Selection",
      3: "Time Selection",
      4: "Details Entry",
    };

    const hasCallback = callback_request && (callback_request.phone || callback_request.email);
    const callbackSection = hasCallback ? `
      <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 8px; color: #2e7d32;">📞 Callback Requested</h3>
        <p style="margin: 4px 0; color: #333;"><strong>Name:</strong> ${callback_request.name || "Not provided"}</p>
        ${callback_request.phone ? `<p style="margin: 4px 0; color: #333;"><strong>Phone:</strong> ${callback_request.phone}</p>` : ""}
        ${callback_request.email ? `<p style="margin: 4px 0; color: #333;"><strong>Email:</strong> ${callback_request.email}</p>` : ""}
        <p style="margin: 8px 0 0; color: #666; font-size: 12px;">This person would like you to reach out — they may need help with their booking.</p>
      </div>
    ` : "";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Booking Cancelled — Feedback</h2>
        <p style="color: #666;">A visitor cancelled their booking at step: <strong>${stepLabels[step] || `Step ${step}`}</strong></p>
        <div style="background: #f9f9f9; border-left: 4px solid #e74c3c; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; color: #333; white-space: pre-wrap;">${feedback || "No feedback provided"}</p>
        </div>
        ${callbackSection}
        <p style="color: #999; font-size: 12px;">This feedback was submitted from the booking page.</p>
      </div>
    `;

    const subject = hasCallback
      ? `⚠️ Callback Requested — Booking Cancelled (${stepLabels[step] || `Step ${step}`})`
      : `Booking Cancelled — Feedback (${stepLabels[step] || `Step ${step}`})`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "ShawScope Bookings <bookings@shawscope.co.uk>",
        to: [ADMIN_EMAIL],
        reply_to: "matt@shawscope.co.uk",
        subject,
        html,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
