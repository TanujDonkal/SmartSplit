import { StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/tokens';

export function NoticeText({
  tone,
  message,
}: {
  tone: 'error' | 'success' | 'info';
  message: string;
}) {
  return (
    <Text
      style={[
        styles.base,
        tone === 'error'
          ? styles.error
          : tone === 'success'
            ? styles.success
            : styles.info,
      ]}
    >
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: 14,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
  },
  success: {
    color: colors.primaryDark,
  },
  info: {
    color: colors.textMuted,
  },
});
