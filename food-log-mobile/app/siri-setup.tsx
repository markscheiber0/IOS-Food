import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { createShortcutToken, fetchLatestSiriLog } from '../src/api/logs';
import { COLORS } from '../src/constants/colors';
import { FoodLogRow } from '../src/types';

const SHORTCUT_URL: string = Constants.expoConfig?.extra?.siriShortcutUrl ?? '';

export default function SiriSetupScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [latestSiriLog, setLatestSiriLog] = useState<FoodLogRow | null>(null);
  const [checking, setChecking] = useState(false);

  const generateToken = async () => {
    setGenerating(true);
    try {
      const raw = await createShortcutToken();
      setToken(raw);
      setCopied(false);
    } catch (e: unknown) {
      Alert.alert('Could not create token', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToken = async () => {
    if (!token) return;
    await Clipboard.setStringAsync(token);
    setCopied(true);
  };

  const openShortcut = () => {
    if (!SHORTCUT_URL) {
      Alert.alert(
        'Shortcut link not configured',
        'The shared shortcut link has not been published yet — see docs/SIRI_SHORTCUT.md.',
      );
      return;
    }
    Linking.openURL(SHORTCUT_URL);
  };

  const checkSiriLog = async () => {
    setChecking(true);
    try {
      setLatestSiriLog(await fetchLatestSiriLog());
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Siri Setup</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Log meals hands-free: “Hey Siri, Log Food” → say what you ate → Siri
          reads back the calories. One-time setup, about a minute.
        </Text>

        {/* Step 1 — token */}
        <View style={styles.card}>
          <Text style={styles.stepLabel}>STEP 1</Text>
          <Text style={styles.cardTitle}>Generate your Siri token</Text>
          <Text style={styles.cardBody}>
            The shortcut uses this token to log meals to your account. It's shown
            once — copy it before leaving this screen. Generating a new token
            doesn't disable old ones.
          </Text>
          {token ? (
            <>
              <View style={styles.tokenBox}>
                <Text style={styles.tokenText} selectable>
                  {token}
                </Text>
              </View>
              <TouchableOpacity style={styles.button} onPress={copyToken}>
                <Text style={styles.buttonText}>{copied ? '✓ Copied' : 'Copy token'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.button} onPress={generateToken} disabled={generating}>
              {generating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Generate my Siri token</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Step 2 — install shortcut */}
        <View style={styles.card}>
          <Text style={styles.stepLabel}>STEP 2</Text>
          <Text style={styles.cardTitle}>Add the “Log Food” shortcut</Text>
          <Text style={styles.cardBody}>
            Opens in the Shortcuts app. When it asks for your token, paste the one
            you copied in Step 1, then tap “Add Shortcut”.
          </Text>
          <TouchableOpacity style={styles.button} onPress={openShortcut}>
            <Text style={styles.buttonText}>Add the Log Food shortcut</Text>
          </TouchableOpacity>
        </View>

        {/* Step 3 — test */}
        <View style={styles.card}>
          <Text style={styles.stepLabel}>STEP 3</Text>
          <Text style={styles.cardTitle}>Try it</Text>
          <Text style={styles.cardBody}>
            Say “Hey Siri, Log Food”, then tell Siri what you ate. Tap below to
            confirm it landed in your account.
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={checkSiriLog} disabled={checking}>
            {checking ? (
              <ActivityIndicator color={COLORS.textSecondary} size="small" />
            ) : (
              <Text style={styles.secondaryButtonText}>Check for Siri logs</Text>
            )}
          </TouchableOpacity>
          {latestSiriLog ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>
                ✓ Last Siri log: {latestSiriLog.food} — {latestSiriLog.calories ?? '?'} cal
              </Text>
              <Text style={styles.resultSub}>
                {new Date(latestSiriLog.logged_at).toLocaleString()}
              </Text>
            </View>
          ) : checking === false && latestSiriLog === null ? null : null}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backText: {
    color: COLORS.secondary,
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  intro: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },
  stepLabel: {
    color: COLORS.cta,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  tokenBox: {
    backgroundColor: COLORS.bgPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
  },
  tokenText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: 'Courier',
  },
  button: {
    backgroundColor: COLORS.cta,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  resultBox: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: '#4ADE80',
    borderRadius: 10,
    padding: 12,
    gap: 2,
  },
  resultText: {
    color: '#4ADE80',
    fontSize: 14,
  },
  resultSub: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  bottomSpacer: {
    height: 32,
  },
});
