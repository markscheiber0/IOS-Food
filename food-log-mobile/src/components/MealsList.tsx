import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { Meal } from '../types';

interface Props {
  meals: Meal[];
}

function MealCard({ meal }: { meal: Meal }) {
  const timePart = meal.timestamp.split(' ')[1]?.slice(0, 5) ?? '';

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.cardBody}>
        <View style={styles.cardLeft}>
          <Text style={styles.foodName} numberOfLines={1}>
            {meal.food}
          </Text>
          <View style={styles.meta}>
            {timePart ? <Text style={styles.metaText}>{timePart}</Text> : null}
            <Text style={styles.metaText}>{Math.round(meal.protein)}g protein</Text>
            {meal.sugars > 0 ? (
              <Text style={styles.metaText}>{Math.round(meal.sugars)}g sugar</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.calorieBox}>
          <Text style={styles.calorieValue}>{Math.round(meal.calories)}</Text>
          <Text style={styles.calorieLabel}>cal</Text>
        </View>
      </View>
    </View>
  );
}

export function MealsList({ meals }: Props) {
  if (meals.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🍽️</Text>
        <Text style={styles.emptyText}>No meals logged yet today</Text>
      </View>
    );
  }

  const sorted = [...meals].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <View style={styles.list}>
      {sorted.map((meal, idx) => (
        <MealCard key={`${meal.timestamp}-${idx}`} meal={meal} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    backgroundColor: COLORS.cta,
  },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  calorieBox: {
    alignItems: 'flex-end',
  },
  calorieValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.cta,
    lineHeight: 26,
  },
  calorieLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
