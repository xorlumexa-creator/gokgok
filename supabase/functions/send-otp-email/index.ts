import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check rate limit: max 3 OTP requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('otp_requests')
      .select('*', { count: 'exact', head: true })
      .eq('email', cleanEmail)
      .eq('used', false)
      .gte('created_at', oneHourAgo);

    if (recentCount && recentCount >= 3) {
      return new Response(JSON.stringify({ error: "rate_limit", message: "১ ঘন্টা পর আবার চেষ্টা করুন" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', cleanEmail)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "not_found", message: "এই ইমেইলে কোনো একাউন্ট নেই" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP with SHA256
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedOTP = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store OTP in database
    await supabase.from('otp_requests').insert({
      user_id: profile.user_id,
      email: cleanEmail,
      phone: cleanEmail,
      otp_hash: hashedOTP,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      used: false,
    });

    // Check TEST_MODE
    const testMode = Deno.env.get('TEST_MODE') === 'true';
    if (testMode) {
      return new Response(JSON.stringify({ success: true, test_otp: otp }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Send email via Resend through gateway
    const emailResponse = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'Dukan 360° <onboarding@resend.dev>',
        to: [cleanEmail],
        subject: 'Dukan 360° - পাসওয়ার্ড রিকভারি কোড',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0d9488;">Dukan 360°</h2>
            <p>আসসালামুয়ালাইকুম,</p>
            <p>আপনার পাসওয়ার্ড রিকভারি কোড:</p>
            <div style="background: #f0fdf4; border: 2px solid #0d9488; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #0d9488; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p>⏰ এই কোডটি <strong>১০ মিনিট</strong> পর্যন্ত বৈধ।</p>
            <p>⚠️ কাউকে এই কোড জানাবেন না।</p>
            <p>যদি আপনি পাসওয়ার্ড রিকভারির চেষ্টা না করে থাকেন, এই ইমেইল উপেক্ষা করুন।</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">Dukan 360° - দোকানের সম্পূর্ণ সমাধান 🏪</p>
          </div>
        `
      }),
    });

    if (!emailResponse.ok) {
      const errData = await emailResponse.text();
      console.error('Resend API error:', errData);
      throw new Error(`Email send failed [${emailResponse.status}]: ${errData}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error('Error in send-otp-email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
