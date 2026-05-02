/** @type {import('expo-apple-targets').XcodeTargetConfig} */
module.exports = {
  type: 'widget',
  name: 'FoodLogWidget',
  deploymentTarget: '16.2',
  infoPlist: {
    // These values are injected at prebuild time from app.config.js
    // Override them manually in ios/FoodLogWidget/Info.plist after prebuild if needed
    NSExtension: {
      NSExtensionPointIdentifier: 'com.apple.widgetkit-extension',
    },
    SHEETS_API_KEY: '$(SHEETS_API_KEY)',
    SHEETS_ID: '$(SHEETS_ID)',
    DAILY_GOAL: '$(DAILY_GOAL)',
  },
};
