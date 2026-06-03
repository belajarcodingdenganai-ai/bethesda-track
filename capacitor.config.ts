import { CapacitorConfig } from '@capacitor/cli';

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://bethesda-track.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.bethesda.track',
  appName: 'SmartHub',
  webDir: 'out',
  server: {
    url: serverUrl.replace(/\/$/, ''),
    cleartext: false
  }
};

export default config;
