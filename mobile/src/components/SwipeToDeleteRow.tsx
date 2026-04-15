import { ReactNode, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme/tokens';

type SwipeToDeleteRowProps = {
  children: ReactNode;
  onDelete: () => void;
  disabled?: boolean;
};

export function SwipeToDeleteRow({
  children,
  onDelete,
  disabled = false,
}: SwipeToDeleteRowProps) {
  const swipeableRef = useRef<Swipeable | null>(null);

  function handleDelete() {
    swipeableRef.current?.close();
    onDelete();
  }

  return (
    <Swipeable
      ref={swipeableRef}
      enabled={!disabled}
      friction={2}
      rightThreshold={36}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.actionsWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete item"
            disabled={disabled}
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteAction,
              pressed && !disabled ? styles.deleteActionPressed : null,
              disabled ? styles.deleteActionDisabled : null,
            ]}
          >
            <Ionicons name="trash-outline" size={18} color="#ffffff" />
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
      )}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionsWrap: {
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  deleteAction: {
    width: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingHorizontal: spacing.md,
  },
  deleteActionPressed: {
    opacity: 0.9,
  },
  deleteActionDisabled: {
    backgroundColor: '#fca5a5',
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
