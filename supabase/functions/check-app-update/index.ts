// Self-hosted update endpoint for @capgo/capacitor-updater (auto-update mode).
// The plugin POSTs device/app info here every time the app opens; this
// function looks up the latest published release row and tells the plugin
// whether a newer JS/HTML/CSS bundle is available to download.
//
// This does NOT publish updates by itself — after building a new bundle
// with `npx @capgo/cli bundle zip`, upload the zip to the `app-bundles`
// storage bucket and insert/update a row in `app_releases` with its
// version, public URL, and checksum. That's the "publish" step.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Minimal semver compare (major.minor.patch) — good enough for this use case.
function isNewer(remote: string, local: string): boolean {
  const a = remote.split('.').map(n => parseInt(n, 10) || 0);
  const b = local.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    // version_name = the bundle version currently running on the device
    // ("builtin" the very first time, before any OTA update has landed).
    const currentVersion: string = body?.version_name && body.version_name !== 'builtin'
      ? body.version_name
      : '0.0.0';
    const platform: string = body?.platform || 'android';

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: release, error } = await admin
      .from('app_releases')
      .select('version, bundle_url, checksum')
      .eq('platform', platform)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !release) {
      return new Response(JSON.stringify({ message: 'no release published yet' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isNewer(release.version, currentVersion)) {
      return new Response(JSON.stringify({ message: 'up to date' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      version: release.version,
      url: release.bundle_url,
      checksum: release.checksum,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ message: 'update check failed', error: String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
    
