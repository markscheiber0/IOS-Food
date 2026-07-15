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
      buildNumber: '1',
      deploymentTarget: '16.2',
      usesAppleSignIn: true,
      entitlements: {
        'com.apple.security.application-groups': [APP_GROUP],
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    plugins: [
      'expo-router',
      'expo-apple-authentication',
      [
        '@bacons/apple-targets',
        {
          // [MARK] Read from Xcode → Settings → Accounts or developer.apple.com → Membership
          appleTeamId: process.env.APPLE_TEAM_ID || 'REPLACE_WITH_TEAM_ID',
        },
      ],
      [
        'expo-background-fetch',
        {
          backgroundModesEnabled: true,
        },
      ],
    ],
    extra: {
      // Safe to embed — RLS is the security boundary, the anon key is public by design.
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
      // iCloud link to the published "Log Food" shortcut (Phase 4)
      siriShortcutUrl: process.env.SIRI_SHORTCUT_URL || '',
      appGroup: APP_GROUP,
    },
  },
};
