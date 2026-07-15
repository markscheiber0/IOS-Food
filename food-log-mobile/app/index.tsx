import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CalorieRing } from '../src/components/CalorieRing';
import { MacroBreakdown } from '../src/components/MacroBreakdown';
import { MealsList } from '../src/components/MealsList';
import { WeeklyTrend } from '../src/components/WeeklyTrend';
import { COLORS } from '../src/constants/colors';
import { useFoodLogs } from '../src/hooks/useFoodLogs';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export default function HomeScreen() {
  const { data, loading, refreshing, error, onRefresh, dailyGoal, submitFood } =
    useFoodLogs();
  const router = useRouter();
  const [foodText, setFoodText] = useState('');
  const [logging, setLogging] = useState(false);
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  const handleLog = async () => {
    const text = foodText.trim();
    if (!text || logging) return;
    setLogging(true);
    setLastSummary(null);
    try {
      const summary = await submitFood(text);
      setFoodText('');
      setLastSummary(summary);
    } catch (e: unknown) {
      Alert.alert('Could not log that', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setLogging(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Food Log</Text>
          <Text style={styles.headerDate}>{formatDate(new Date())}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.goalBadge}>
            <Text style={styles.goalText}>Goal: {dailyGoal} cal</Text>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/settings')}
            accessibilityLabel="Settings"
          >
            <Text style={styles.iconText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading && !data ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.cta} />
          <Text style={styles.loadingText}>Loading your food log…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.cta}
              colors={[COLORS.cta]}
            />
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Log input — the primary action, and the App Review demo path */}
          <View style={styles.logCard}>
            <Text style={styles.logLabel}>What did you eat?</Text>
            <View style={styles.logRow}>
              <TextInput
                style={styles.logInput}
                placeholder="e.g. 2 eggs and toast"
                placeholderTextColor={COLORS.textMuted}
                value={foodText}
                onChangeText={setFoodText}
                onSubmitEditing={handleLog}
                returnKeyType="send"
                editable={!logging}
              />
              <TouchableOpacity
                style={[styles.logButton, logging && styles.logButtonDisabled]}
                onPress={handleLog}
                disabled={logging}
              >
                {logging ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.logButtonText}>Log</Text>
                )}
              </TouchableOpacity>
            </View>
            {lastSummary ? <Text style={styles.summaryText}>✓ {lastSummary}</Text> : null}
            <TouchableOpacity onPress={() => router.push('/siri-setup')}>
              <Text style={styles.siriLink}>Set up “Hey Siri, Log Food” →</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {data ? (
            <>
              <Section title="">
                <CalorieRing consumed={data.today.totalCalories} goal={dailyGoal} />
              </Section>

              <Section title="Macronutrient Breakdown">
                <MacroBreakdown
                  protein={data.today.totalProtein}
                  carbs={data.today.totalCarbs}
                  fat={data.today.totalFat}
                />
              </Section>

              <Section title="Weekly Calorie Trend">
                <WeeklyTrend weekly={data.weekly} goal={dailyGoal} />
              </Section>

              <Section title="Today's Meals">
                <MealsList meals={data.today.meals} />
              </Section>
            </>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.cta,
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalBadge: {
    backgroundColor: COLORS.bgPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  goalText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  iconButton: {
    padding: 4,
  },
  iconText: {
    fontSize: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  logCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  logLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  logRow: {
    flexDirection: 'row',
    gap: 10,
  },
  logInput: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  logButton: {
    backgroundColor: COLORS.cta,
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  logButtonDisabled: {
    opacity: 0.6,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  summaryText: {
    color: '#4ADE80',
    fontSize: 13,
  },
  siriLink: {
    color: COLORS.secondary,
    fontSize: 13,
  },
  section: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.cta,
    letterSpacing: -0.3,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
  },
  bottomSpacer: {
    height: 32,
  },
});
