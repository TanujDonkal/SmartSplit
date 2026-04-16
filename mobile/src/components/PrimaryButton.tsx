import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { ReactNode } from 'react';
import { colors, radii } from '@/theme/tokens';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  icon?: ReactNode;
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = 'primary',
  loading,
  icon,
}: PrimaryButtonProps) {
  const toneStyle =
    tone === 'secondary'
      ? styles.secondary
      : tone === 'ghost'
        ? styles.ghost
        : tone === 'danger'
          ? styles.danger
          : styles.primary;

  const textStyle =
    tone === 'ghost'
      ? styles.ghostText
      : tone === 'secondary'
        ? styles.secondaryText
        : styles.primaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        toneStyle,
        (disabled || loading) && styles.disabled,
        pressed && !(disabled || loading) ? styles.pressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone === 'ghost' ? colors.primary : '#ffffff'} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, textStyle]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  ghost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#ffffff',
  },
  ghostText: {
    color: colors.text,
  },
});
