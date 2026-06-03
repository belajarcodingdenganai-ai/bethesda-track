import { CapacitorConfig } from '@capacitor/cli';

const serverUrl = (
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://192.168.12.223:3000'
).replace(/\/$/, '');

const config: CapacitorConfig = {
  appId: 'com.bethesda.teacher.scanner',
  appName: 'BethScan Rumah Bethesda',
  webDir: 'out',
  server: {
    url: `${serverUrl}/teacher-scanner`,
    cleartext: true,
  },
};

export default config;
