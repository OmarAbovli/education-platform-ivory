import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.yourplatform.app',
    appName: 'YourPlatform',
    webDir: 'public',
    server: {
        url: 'https://yourplatform-demo.vercel.app',
        cleartext: true
    },
    plugins: {
        CapacitorCookies: {
            enabled: true,
        },
    },
};

export default config;
