import { CapacitorConfig } from '@capacitor/cli';

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://192.168.12.223:3000';

const config: CapacitorConfig = {
  appId: 'com.bethesda.track',
  appName: 'Rumah Bethesda',
  webDir: 'out',
  server: {
    url: serverUrl,
    cleartext: true
  }
};

export default config;
