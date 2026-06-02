import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bethesda.track',
  appName: 'Rumah Bethesda',
  webDir: 'out',
  server: {
    // Menggunakan IP asli laptop Anda agar HP Android bisa terkoneksi
    url: 'http://192.168.12.223:3000',
    cleartext: true
  }
};

export default config;
