import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { COLORS } from '../constants/colors';
import { WeeklyData } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Props {
  weekly: WeeklyData;
  goal: number;
}

function formatLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function WeeklyTrend({ weekly, goal }: Props) {
  const sortedDates = Object.keys(weekly).sort();

  const calorieData = sortedDates.map(d => ({
    value: Math.round(weekly[d]),
    label: formatLabel(d),
    labelTextStyle: { color: COLORS.textMuted, fontSize: 9, width: 48, textAlign: 'center' as const },
    dataPointColor: weekly[d] > 0 ? COLORS.cta : COLORS.border,
  }));

  const goalData = sortedDates.map(() => ({
    value: goal,
  }));

  const chartWidth = SCREEN_WIDTH - 72;

  return (
    <View style={styles.container}>
      <LineChart
        data={calorieData}
        data2={goalData}
        width={chartWidth}
        height={160}
        color1={COLORS.cta}
        color2={COLORS.primary}
        dataPointsColor1={COLORS.cta}
        dataPointsColor2="transparent"
        dataPointsRadius1={5}
        startFillColor1="rgba(249,115,22,0.25)"
        endFillColor1="rgba(249,115,22,0)"
        startOpacity1={0.8}
        endOpacity1={0}
        areaChart
        curved
        dashPattern2={[6, 4]}
        thickness1={3}
        thickness2={2}
        noOfSections={4}
        yAxisColor={COLORS.border}
        xAxisColor={COLORS.border}
        yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
        rulesColor={COLORS.bgTertiary}
        initialSpacing={20}
        spacing={(chartWidth - 60) / Math.max(sortedDates.length - 1, 1)}
        backgroundColor={COLORS.bgSecondary}
        hideYAxisText={false}
        yAxisLabelWidth={36}
        xAxisLabelsHeight={28}
        xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 9 }}
        pointerConfig={{
          pointerStripColor: COLORS.border,
          pointerColor: COLORS.cta,
          radius: 6,
          pointerLabelComponent: (items: { value: number }[]) => (
            <View style={styles.tooltip}>
              <Text style={styles.tooltipText}>{items[0]?.value} cal</Text>
            </View>
          ),
        }}
      />

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: COLORS.cta }]} />
          <Text style={styles.legendLabel}>Daily Calories</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, styles.dashed, { borderColor: COLORS.primary }]} />
          <Text style={styles.legendLabel}>Goal ({goal})</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  tooltip: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tooltipText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendLine: {
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  dashed: {
    backgroundColor: 'transparent',
    borderTopWidth: 2,
    borderStyle: 'dashed',
    height: 0,
  },
  legendLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
