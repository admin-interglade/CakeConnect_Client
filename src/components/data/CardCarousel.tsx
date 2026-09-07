import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '../ui/AppText';
import { colors, spacing } from '../../constants';

type CardCarouselProps<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Card width, so the scroll can snap card-to-card. */
  itemWidth: number;
  gap?: number;
  emptyMessage?: string;
  /**
   * The scroll view itself — a negative horizontal margin here lets a strip
   * bleed past the screen gutter so cards run off the edge rather than
   * stopping short of it.
   */
  style?: ViewStyle;
  /** Padding inside the strip; pairs with a bleeding `style` to re-inset. */
  contentContainerStyle?: ViewStyle;
};

/**
 * Horizontally snapping card strip for glanceable dashboard sections.
 *
 * Deliberately only used where the list is short and capped: a carousel hides
 * everything past the second card, so anything meant to be scanned or totalled
 * belongs in a vertical list instead.
 */
export default function CardCarousel<T>({
  data,
  keyExtractor,
  renderItem,
  itemWidth,
  gap = spacing.md,
  emptyMessage,
  style,
  contentContainerStyle,
}: CardCarouselProps<T>) {
  if (data.length === 0) {
    return emptyMessage ? (
      <AppText variant="bodySecondary" align="center" style={styles.empty}>
        {emptyMessage}
      </AppText>
    ) : null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Snapping stops a card being left half-cut at rest, which is what makes
      // a carousel feel unfinished.
      snapToInterval={itemWidth + gap}
      snapToAlignment="start"
      decelerationRate="fast"
      style={style}
      contentContainerStyle={[styles.content, { gap }, contentContainerStyle]}
    >
      {data.map((item, index) => (
        <View key={keyExtractor(item)}>{renderItem(item, index)}</View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Vertical breathing room so the cards' drop shadows are not clipped by the
  // scroll view's bounds.
  content: { paddingVertical: spacing.xs, paddingRight: spacing.lg },
  empty: { paddingVertical: spacing.lg, color: colors.textSecondary },
});
