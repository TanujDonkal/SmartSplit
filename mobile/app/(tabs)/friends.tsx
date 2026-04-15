import { StyleSheet, Text } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppScreen } from '@/components/AppScreen';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { colors, spacing } from '@/theme/tokens';

export default function FriendsScreen() {
  return (
    <AppScreen>
      <AppHeader />

      <SurfaceCard>
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.body}>
          This mobile screen starts with the same username-based friend flow as the web app.
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <FormField
          label="Friend username"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="friend_username"
        />
        <PrimaryButton label="Add friend" />
        <Text style={styles.help}>
          Use the exact username your friend chose when signing up.
        </Text>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 24,
    color: colors.textMuted,
  },
  help: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
