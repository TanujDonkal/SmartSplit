import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppScreen } from '@/components/AppScreen';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useAuth } from '@/context/useAuth';
import { colors, spacing } from '@/theme/tokens';

export default function AccountScreen() {
  const { user, logout } = useAuth();

  return (
    <AppScreen>
      <AppHeader />

      <SurfaceCard>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.body}>
          Profile, deletion, privacy, AI consent, and billing controls should all live here for
          app-store readiness.
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <View style={styles.form}>
          <FormField label="Full name" value={user?.name ?? 'Tanuj Kumar'} editable={false} />
          <FormField label="Username" value={user?.username ?? 'tanujdonkal'} editable={false} />
          <FormField
            label="Email address"
            value={user?.email ?? 'tanujdonkal29@gmail.com'}
            editable={false}
          />
          <PrimaryButton label="Save profile" />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Log out</Text>
        <Text style={styles.sectionBody}>
          Sign out of this device and return to the login screen.
        </Text>
        <View style={styles.form}>
          <PrimaryButton label="Log out" tone="ghost" onPress={() => void logout()} />
        </View>
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
  form: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sectionBody: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 24,
    color: colors.textMuted,
  },
});
