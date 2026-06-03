import { CapacitorConfig } from '@capacitor/cli';

const serverUrl = (
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://bethesda-track.vercel.app'
).replace(/\/$/, '');

const config: CapacitorConfig = {
  appId: 'com.bethesda.teacher.scanner',
  appName: 'SmartHub',
  webDir: 'out',
  server: {
    url: `${serverUrl}/teacher-scanner`,
    cleartext: false,
  },
};

export default config;
