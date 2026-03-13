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

    const { action, ...params } = await req.json();

    // === FACE LOGIN: auto-login user after face match ===
    if (action === "face-login") {
      const { phone } = params;

      const { data: users } = await supabase.rpc("find_user_for_recovery", { p_phone: phone });
      if (!users || users.length === 0) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const userId = users[0].p_user_id;

      // Generate a temporary password, set it on the user, and return it for auto-login
      const tempPassword = crypto.randomUUID() + "A1!";

      // Get user email for login
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      if (authError || !authUser?.user?.email) {
        return new Response(JSON.stringify({ error: "User auth not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Set temporary password
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: tempPassword
      });
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Log recovery
      const month = new Date().toISOString().slice(0, 7);
      await supabase.from("password_recovery_logs").insert({
        user_id: userId, method: "face", month, success: true
      });

      return new Response(JSON.stringify({
        email: authUser.user.email,
        tempPassword
      }), {
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
