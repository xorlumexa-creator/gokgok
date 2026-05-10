// Manager-only admin operations: delete users, set manager password, purge expired trials.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MANAGER_PHONES = ['+8801920051662', '01920051662', '8801920051662'];
const MANAGER_PASSWORD = 'BAFShaheenCollege2@';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const action = body.action as string;

  // 1) bootstrap_manager_password — public, sets manager pw idempotently
  if (action === 'bootstrap_manager_password') {
    const { data: profs } = await admin
      .from('profiles')
      .select('user_id, phone')
      .in('phone', MANAGER_PHONES);
    if (!profs || profs.length === 0) {
      return j({ ok: false, error: 'manager profile not found — sign up first with phone 01920051662' }, 404);
    }
    const results: any[] = [];
    for (const p of profs) {
      const { error } = await admin.auth.admin.updateUserById(p.user_id, { password: MANAGER_PASSWORD });
      results.push({ user_id: p.user_id, ok: !error, error: error?.message });
      await admin.from('profiles').update({ role: 'manager', must_change_password: false }).eq('user_id', p.user_id);
    }
    return j({ ok: true, results });
  }

  // The remaining actions require an authenticated manager.
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
    // Wipe app data
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
    // Delete users who: not active, no plan, no temporary_access, created >35 days ago, role != manager
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

  return j({ ok: false, error: 'unknown action' }, 400);
});

function j(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
