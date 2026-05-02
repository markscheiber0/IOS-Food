import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { COLORS } from '../constants/colors';

interface Props {
  protein: number;
  carbs: number;
  fat: number;
}

function MacroRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.macroRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.macroInfo}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>{Math.round(value)}g</Text>
      </View>
    </View>
  );
}

export function MacroBreakdown({ protein, carbs, fat }: Props) {
  const total = protein + carbs + fat;
  const hasData = total > 0;

  const pieData = hasData
    ? [
        { value: protein, color: COLORS.protein },
        { value: carbs, color: COLORS.carbs },
        { value: fat, color: COLORS.fat },
      ]
    : [{ value: 1, color: COLORS.border }];

  return (
    <View style={styles.container}>
      <PieChart
        data={pieData}
        donut
        radius={75}
        innerRadius={52}
        innerCircleColor={COLORS.bgSecondary}
        centerLabelComponent={() => (
          <View style={styles.centerLabel}>
            <Text style={styles.centerValue}>{Math.round(total)}g</Text>
            <Text style={styles.centerSub}>total</Text>
          </View>
        )}
      />

      <View style={styles.legend}>
        <MacroRow label="Protein" value={protein} color={COLORS.protein} />
        <MacroRow label="Carbs" value={carbs} color={COLORS.carbs} />
        <MacroRow label="Fat" value={fat} color={COLORS.fat} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 16,
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  centerSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  legend: {
    flex: 1,
    gap: 12,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.bgPrimary,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  macroInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
