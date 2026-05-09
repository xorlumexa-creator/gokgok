// Updates an auth user's password using the service role.
// Called by the public forgot-password flow (no JWT required).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, temp_password } = await req.json();
    if (!user_id || !temp_password || typeof temp_password !== 'string' || temp_password.length < 6) {
      return new Response(JSON.stringify({ error: 'invalid input' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: updErr } = await admin.auth.admin.updateUserById(user_id, { password: temp_password });
    if (updErr) throw updErr;

    const { error: profErr } = await admin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('user_id', user_id);
    if (profErr) throw profErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
