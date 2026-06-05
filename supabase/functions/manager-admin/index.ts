import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const action = body.action as string;

  if (action === 'purge_expired_trials_cron') {
    return await runPurge(admin);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const { data: userRes } = await admin.auth.getUser(token);
  const callerId = userRes?.user?.id;
  if (!callerId) return j({ ok: false, error: 'not authenticated' }, 401);
  const { data: callerProfile } = await admin.from('profiles').select('role').eq('user_id', callerId).maybeSingle();
  if (callerProfile?.role !== 'manager') return j({ ok: false, error: 'manager only' }, 403);

  if (action === 'delete_user') {
    const target = body.user_id as string;
    if (!target) return j({ ok: false, error: 'user_id required' }, 400);
    if (target === callerId) return j({ ok: false, error: 'cannot delete yourself' }, 400);
    await admin.from('subscription_requests').delete().eq('user_id', target);
    await admin.from('password_reset_requests').delete().eq('user_id', target);
    await admin.from('daily_usage').delete().eq('user_id', target);
    await admin.from('monthly_usage').delete().eq('user_id', target);
    await admin.from('profiles').delete().eq('user_id', target);
    const { error } = await admin.auth.admin.deleteUser(target);
    if (error) return j({ ok: false, error: error.message }, 500);
    return j({ ok: true });
  }

  if (action === 'purge_expired_trials') {
    return await runPurge(admin);
  }

  return j({ ok: false, error: 'unknown action' }, 400);
});

async function runPurge(admin: any) {
  const cutoff = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
  const { data: stale } = await admin
    .from('profiles')
    .select('user_id, role, subscription_status, plan, temporary_access, created_at')
    .neq('role', 'manager')
    .neq('subscription_status', 'active')
    .lt('created_at', cutoff);
  const toDelete = (stale || []).filter((p: any) => !p.temporary_access && !p.plan);
  let deleted = 0;
  for (const p of toDelete) {
    await admin.from('subscription_requests').delete().eq('user_id', p.user_id);
    await admin.from('password_reset_requests').delete().eq('user_id', p.user_id);
    await admin.from('daily_usage').delete().eq('user_id', p.user_id);
    await admin.from('monthly_usage').delete().eq('user_id', p.user_id);
    await admin.from('profiles').delete().eq('user_id', p.user_id);
    const { error } = await admin.auth.admin.deleteUser(p.user_id);
    if (!error) deleted++;
  }
  return j({ ok: true, deleted, scanned: toDelete.length });
}

function j(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
