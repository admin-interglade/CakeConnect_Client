import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import {
  borderRadius,
  borderWidth,
  colors,
  elevation,
  iconSize,
  layout,
  spacing,
} from '../../constants';

export type DataTableColumn<T> = {
  key: string;
  title: string;
  /** Fixed column width in points; the row scrolls horizontally past the fold. */
  width: number;
  align?: 'left' | 'right';
  /** Return a node for badges, or a string for plain cells. */
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  onRowPress?: (row: T) => void;
  /** Enables the leading checkbox column for bulk actions. */
  selectable?: boolean;
  selectedKeys?: string[];
  onToggleSelect?: (key: string) => void;
  style?: ViewStyle;
};

/**
 * Horizontally scrollable table for the order and ledger lists.
 *
 * It renders rows directly rather than in a `FlatList`: a nested vertical list
 * inside the screen's own scroll view would break scrolling on Android, and
 * these tables are always paginated to a page's worth of rows.
 */
function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  onRowPress,
  selectable = false,
  selectedKeys = [],
  onToggleSelect,
  style,
}: DataTableProps<T>) {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const selected = React.useMemo(() => new Set(selectedKeys), [selectedKeys]);

  return (
    <View style={[styles.container, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: totalWidth + (selectable ? layout.minTouchTarget : 0) }}>
          <View style={styles.headerRow}>
            {selectable ? <View style={styles.checkboxCell} /> : null}

            {columns.map(column => (
              <AppText
                key={column.key}
                variant="inputLabel"
                numberOfLines={1}
                style={[
                  styles.headerCell,
                  { width: column.width },
                  column.align === 'right' && styles.alignRight,
                ]}
              >
                {column.title}
              </AppText>
            ))}
          </View>

          {rows.map(row => {
            const key = keyExtractor(row);
            const isSelected = selected.has(key);

            return (
              <Pressable
                key={key}
                onPress={onRowPress ? () => onRowPress(row) : undefined}
                disabled={!onRowPress}
                accessibilityRole={onRowPress ? 'button' : undefined}
                style={({ pressed }) => [
                  styles.row,
                  isSelected && styles.rowSelected,
                  pressed && onRowPress && styles.pressed,
                ]}
              >
                {selectable ? (
                  <Pressable
                    onPress={() => onToggleSelect?.(key)}
                    hitSlop={layout.hitSlop}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel="Select row"
                    style={styles.checkboxCell}
                  >
                    <Icon
                      name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={iconSize.md}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                ) : null}

                {columns.map(column => {
                  const content = column.render(row);

                  return (
                    <View
                      key={column.key}
                      style={[
                        styles.cell,
                        { width: column.width },
                        column.align === 'right' && styles.cellRight,
                      ]}
                    >
                      {typeof content === 'string' || typeof content === 'number' ? (
                        <AppText
                          variant="bodySecondary"
                          numberOfLines={1}
                          color={colors.textPrimary}
                          align={column.align === 'right' ? 'right' : 'left'}
                        >
                          {content}
                        </AppText>
                      ) : (
                        content
                      )}
                    </View>
                  );
                })}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default React.memo(DataTable) as typeof DataTable;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...(elevation.card as object),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.border,
  },
  headerCell: { paddingRight: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowSelected: { backgroundColor: colors.primarySoft },
  pressed: { backgroundColor: colors.surfaceMuted },
  cell: { paddingRight: spacing.sm, justifyContent: 'center' },
  cellRight: { alignItems: 'flex-end' },
  alignRight: { textAlign: 'right' },
  checkboxCell: {
    width: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
