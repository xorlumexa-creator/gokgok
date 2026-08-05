import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.openclaw.dukan360',
  appName: 'Dukan 360',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    // FIX: Enable scroll and touch in Android WebView
    overrideUserAgent: undefined,
    backgroundColor: '#ffffff',
  },
  ios: {
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0d9488',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    // OTA (over-the-air) updates for JS/HTML/CSS changes only — no Play
    // Store, no APK re-download needed for most releases. Native/permission
    // changes still require a new APK built + distributed from the website.
    // Replace <YOUR-PROJECT-REF> with your actual Supabase project ref.
    CapacitorUpdater: {
      updateUrl: 'https://ydnttyhlepxyieemkacu.supabase.co/functions/v1/check-app-update',
      autoUpdate: true,
    },
  },
};

export default config;
