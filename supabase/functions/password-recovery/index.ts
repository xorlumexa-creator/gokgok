import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...params } = await req.json();

    // === VERIFY FACE (server-side distance check not needed since client does it,
    // but we still log recovery and issue token) ===
    if (action === "verify-face") {
      const { phone, month } = params;

      // Find user
      const { data: users } = await supabase.rpc("find_user_for_recovery", { p_phone: phone });
      if (!users || users.length === 0) {
        return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const userId = users[0].p_user_id;

      // Count monthly recoveries
      const { data: count } = await supabase.rpc("get_monthly_recovery_count", { p_phone: phone, p_month: month });
      const currentCount = count || 0;
      const newCount = currentCount + 1;
      const needsFine = currentCount >= 3;

      // Log recovery
      await supabase.from("password_recovery_logs").insert({
        user_id: userId, method: "face", month, success: true
      });

      // Add fine if over limit
      let fineAdded = false;
      if (needsFine) {
        await supabase.from("fines").insert({
          user_id: userId, amount: 20, reason: "মাসিক সীমা অতিক্রম - পাসওয়ার্ড রিকভারি"
        });
        fineAdded = true;
      }

      // Generate reset token
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await supabase.from("recovery_tokens").insert({
        user_id: userId, token, expires_at: expiresAt
      });

      return new Response(JSON.stringify({ resetToken: token, newCount, fineAdded }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // === SEND OTP ===
    if (action === "send-otp") {
      const { phone } = params;

      const { data: users } = await supabase.rpc("find_user_for_recovery", { p_phone: phone });
      if (!users || users.length === 0) {
        return new Response(JSON.stringify({ success: false, message: "User not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const userId = users[0].p_user_id;

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await hashOtp(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Store OTP
      await supabase.from("otp_requests").insert({
        user_id: userId,
        otp_hash: otpHash,
        phone,
        expires_at: expiresAt
      });

      // Send via BulkSMSBD
      const apiKey = Deno.env.get("BULKSMSBD_API_KEY");
      const senderId = Deno.env.get("BULKSMSBD_SENDER_ID");

      if (apiKey && senderId) {
        try {
          await fetch("https://bulksmsbd.net/api/smsapi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: apiKey,
              senderid: senderId,
              number: phone,
              message: `Dukan 360 OTP: ${otp}\n১০ মিনিটের জন্য বৈধ।\nকাউকে জানাবেন না।\n- Dukan 360`
            })
          });
        } catch (e) {
          console.error("SMS send failed:", e);
        }
      } else {
        console.log("BulkSMSBD not configured. OTP:", otp);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // === VERIFY OTP ===
    if (action === "verify-otp") {
      const { phone, otp, month } = params;
      const otpHash = await hashOtp(otp);

      // Find matching OTP
      const { data: otpRecords } = await supabase
        .from("otp_requests")
        .select("*")
        .eq("phone", phone)
        .eq("otp_hash", otpHash)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (!otpRecords || otpRecords.length === 0) {
        return new Response(JSON.stringify({ success: false, message: "ভুল বা মেয়াদোত্তীর্ণ OTP" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Mark OTP as used
      await supabase.from("otp_requests").update({ used: true }).eq("id", otpRecords[0].id);

      const userId = otpRecords[0].user_id;

      // Count monthly recoveries
      const { data: count } = await supabase.rpc("get_monthly_recovery_count", { p_phone: phone, p_month: month });
      const currentCount = count || 0;
      const newCount = currentCount + 1;
      const needsFine = currentCount >= 3;

      // Log recovery
      await supabase.from("password_recovery_logs").insert({
        user_id: userId, method: "otp", month, success: true
      });

      // Add fine if over limit
      let fineAdded = false;
      if (needsFine) {
        await supabase.from("fines").insert({
          user_id: userId, amount: 20, reason: "মাসিক সীমা অতিক্রম - পাসওয়ার্ড রিকভারি"
        });
        fineAdded = true;
      }

      // Generate reset token
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await supabase.from("recovery_tokens").insert({
        user_id: userId, token, expires_at: expiresAt
      });

      return new Response(JSON.stringify({ resetToken: token, newCount, fineAdded }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // === RESET PASSWORD ===
    if (action === "reset-password") {
      const { resetToken, newPassword } = params;

      // Verify token
      const { data: tokens } = await supabase
        .from("recovery_tokens")
        .select("*")
        .eq("token", resetToken)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .limit(1);

      if (!tokens || tokens.length === 0) {
        return new Response(JSON.stringify({ success: false, message: "অবৈধ বা মেয়াদোত্তীর্ণ টোকেন" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const userId = tokens[0].user_id;

      // Mark token as used
      await supabase.from("recovery_tokens").update({ used: true }).eq("id", tokens[0].id);

      // Reset password using admin API
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
