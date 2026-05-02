const path = require('path');

// Load .env manually so it works before expo's own env loading
const fs = require('fs');
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .forEach(line => {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    });
}

const APP_GROUP = 'group.com.markscheiber.foodlog';
const BUNDLE_ID = 'com.markscheiber.foodlog';

module.exports = {
  expo: {
    name: 'Food Log',
    slug: 'food-log',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'foodlog',
    userInterfaceStyle: 'dark',
    splash: {
      backgroundColor: '#0f172a',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: BUNDLE_ID,
      deploymentTarget: '16.0',
      entitlements: {
        'com.apple.security.application-groups': [APP_GROUP],
      },
    },
    plugins: [
      'expo-router',
      'expo-apple-targets',
      [
        'expo-background-fetch',
        {
          backgroundModesEnabled: true,
        },
      ],
    ],
    extra: {
      googleSheetsApiKey: process.env.GOOGLE_SHEETS_API_KEY || '',
      googleSheetsId: process.env.GOOGLE_SHEETS_ID || '',
      dailyGoal: parseInt(process.env.DAILY_GOAL || '2000', 10),
      appGroup: APP_GROUP,
    },
  },
};
