import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { COLORS } from '../constants/colors';

interface Props {
  consumed: number;
  goal: number;
}

export function CalorieRing({ consumed, goal }: Props) {
  const remaining = Math.max(0, goal - consumed);
  const safeConsumed = Math.min(consumed, goal);
  const percentage = goal > 0 ? Math.round((consumed / goal) * 100) : 0;
  const overGoal = consumed > goal;

  const pieData = [
    { value: safeConsumed, color: overGoal ? '#EF4444' : COLORS.cta },
    { value: remaining, color: COLORS.border },
  ];

  // When over goal, show full red ring
  const displayData =
    overGoal
      ? [{ value: 1, color: '#EF4444' }]
      : pieData;

  return (
    <View style={styles.container}>
      <PieChart
        data={displayData}
        donut
        radius={90}
        innerRadius={65}
        innerCircleColor={COLORS.bgSecondary}
        centerLabelComponent={() => (
          <View style={styles.centerLabel}>
            <Text style={styles.percentText}>{percentage}%</Text>
            <Text style={styles.percentSub}>of goal</Text>
          </View>
        )}
      />

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(consumed)}</Text>
          <Text style={styles.statLabel}>CONSUMED</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, overGoal && styles.overGoal]}>
            {overGoal ? `+${Math.round(consumed - goal)}` : Math.round(remaining)}
          </Text>
          <Text style={styles.statLabel}>{overGoal ? 'OVER GOAL' : 'REMAINING'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{goal}</Text>
          <Text style={styles.statLabel}>GOAL</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 24,
  },
  centerLabel: {
    alignItems: 'center',
  },
  percentText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.cta,
  },
  percentSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.cta,
    lineHeight: 32,
  },
  overGoal: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: COLORS.border,
  },
});
