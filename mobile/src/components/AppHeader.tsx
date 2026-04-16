import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandHeader } from './BrandHeader';
import { colors, radii, spacing } from '@/theme/tokens';

export function AppHeader() {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <BrandHeader variant="mark" />
      <Pressable style={styles.askButton} onPress={() => router.push('/assistant')}>
        <Text style={styles.askText}>Ask AI</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  askButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  askText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
});
