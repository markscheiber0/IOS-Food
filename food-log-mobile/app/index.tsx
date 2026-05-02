import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CalorieRing } from '../src/components/CalorieRing';
import { MacroBreakdown } from '../src/components/MacroBreakdown';
import { MealsList } from '../src/components/MealsList';
import { WeeklyTrend } from '../src/components/WeeklyTrend';
import { COLORS } from '../src/constants/colors';
import { useSheetData } from '../src/hooks/useSheetData';

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
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function HomeScreen() {
  const { data, loading, refreshing, error, onRefresh, dailyGoal } = useSheetData();

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Calorie Tracker</Text>
          <Text style={styles.headerDate}>{formatDate(new Date())}</Text>
        </View>
        <View style={styles.goalBadge}>
          <Text style={styles.goalText}>Goal: {dailyGoal} cal</Text>
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
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {data ? (
            <>
              <Section title="">
                <CalorieRing
                  consumed={data.today.totalCalories}
                  goal={dailyGoal}
                />
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
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
