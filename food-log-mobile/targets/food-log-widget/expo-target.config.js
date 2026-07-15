/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'FoodLogWidget',
  deploymentTarget: '16.2',
  // Same App Group as the main app — the app writes Supabase credentials and a
  // cached payload here; the widget reads them via UserDefaults(suiteName:).
  entitlements: {
    'com.apple.security.application-groups': ['group.com.markscheiber.foodlog'],
  },
};
