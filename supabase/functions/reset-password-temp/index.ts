// Public endpoint for forgot-password by phone.
// 1. Looks up user by phone (service role).
// 2. Generates a temp password, updates auth user.
// 3. Inserts a password_reset_requests row for the manager queue.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function genTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'DK';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== 'string' || phone.length < 6) {
      return new Response(JSON.stringify({ error: 'invalid phone' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: profile, error: pErr } = await admin
      .from('profiles')
      .select('user_id, shop_name')
      .eq('phone', phone)
      .maybeSingle();
    if (pErr) throw pErr;

    if (!profile) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tempPassword = genTempPassword();

    const { error: updErr } = await admin.auth.admin.updateUserById(profile.user_id, { password: tempPassword });
    if (updErr) throw updErr;

    await admin.from('profiles').update({ must_change_password: true }).eq('user_id', profile.user_id);

    const { error: insErr } = await admin.from('password_reset_requests').insert({
      user_id: profile.user_id,
      user_phone: phone,
      temp_password: tempPassword,
      status: 'pending',
    });
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
