import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bethesda.teacher.scanner',
  appName: 'BethScan Rumah Bethesda',
  webDir: 'out',
  server: {
    url: 'http://192.168.12.223:3000/teacher-scanner',
    cleartext: true,
  },
};

export default config;
