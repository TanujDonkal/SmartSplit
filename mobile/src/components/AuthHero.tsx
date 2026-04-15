import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';

type AuthHeroProps = {
  eyebrow: string;
  title: string;
  body: string;
  note: string;
};

export function AuthHero({ eyebrow, title, body, note }: AuthHeroProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Image
        source={{ uri: 'https://smart-split-expanse.vercel.app/smartsplit-logo.png' }}
        style={styles.logo}
      />
      <View style={styles.noteCard}>
        <Text style={styles.note}>{note}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    fontSize: 16,
    lineHeight: 28,
    color: colors.textMuted,
  },
  logo: {
    width: 180,
    height: 84,
    marginTop: spacing.sm,
  },
  noteCard: {
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.88)',
    padding: spacing.md,
  },
  note: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
