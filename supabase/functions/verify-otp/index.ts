import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, otp, action } = await req.json();

    if (!email || !otp) {
      return new Response(JSON.stringify({ error: "Email and OTP required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Hash the entered OTP
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedOTP = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Find matching OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_requests')
      .select('*')
      .eq('email', cleanEmail)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return new Response(JSON.stringify({ error: "expired", message: "কোডের মেয়াদ শেষ। নতুন কোড নিন।" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      return new Response(JSON.stringify({ error: "max_attempts", message: "অনেকবার ভুল কোড দিয়েছেন। নতুন কোড নিন।" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Compare hashes
    if (hashedOTP !== otpRecord.otp_hash) {
      // Increment attempts
      await supabase.from('otp_requests').update({ attempts: otpRecord.attempts + 1 }).eq('id', otpRecord.id);
      const remaining = 2 - otpRecord.attempts;
      return new Response(JSON.stringify({ 
        error: "wrong_code", 
        message: `ভুল কোড! আর ${remaining > 0 ? remaining : 0} বার চেষ্টা করতে পারবেন।` 
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Mark OTP as used
    await supabase.from('otp_requests').update({ used: true }).eq('id', otpRecord.id);

    // If action is reset-password, generate temp password and return login credentials
    if (action === 'reset-password') {
      const userId = otpRecord.user_id;
      
      // Get user auth email
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (!authUser?.user?.email) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Generate temp password and set it
      const tempPassword = crypto.randomUUID() + "A1!";
      await supabase.auth.admin.updateUserById(userId, { password: tempPassword });

      // Log recovery
      const month = new Date().toISOString().slice(0, 7);
      
      // Get current recovery count
      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_recovery_count, recovery_month, total_fines, fines_unpaid')
        .eq('user_id', userId)
        .single();

      let recoveryCount = profile?.monthly_recovery_count || 0;
      let currentMonth = profile?.recovery_month || '';
      let totalFines = profile?.total_fines || 0;
      let finesUnpaid = profile?.fines_unpaid || 0;

      // Reset count if new month
      if (currentMonth !== month) {
        recoveryCount = 0;
        currentMonth = month;
      }

      const wasFree = recoveryCount < 3;
      const fineAmount = recoveryCount >= 3 ? 5 : 0;

      // Update profile
      await supabase.from('profiles').update({
        monthly_recovery_count: recoveryCount + 1,
        recovery_month: month,
        total_fines: totalFines + fineAmount,
        fines_unpaid: finesUnpaid + fineAmount,
      }).eq('user_id', userId);

      // Log recovery
      await supabase.from('password_recovery_logs').insert({
        user_id: userId,
        method: 'email_otp',
        month,
        success: true,
      });

      return new Response(JSON.stringify({
        success: true,
        email: authUser.user.email,
        tempPassword,
        wasFree,
        fineAmount,
        recoveryCount: recoveryCount + 1,
        totalFines: totalFines + fineAmount,
        finesUnpaid: finesUnpaid + fineAmount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error('Error in verify-otp:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
