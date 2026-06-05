import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.openclaw.dukan360',
  appName: 'Dukan 360',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
