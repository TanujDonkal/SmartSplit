import { Link, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { AuthHero } from '@/components/AuthHero';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { api } from '@/lib/api';
import { colors, spacing } from '@/theme/tokens';

export default function RegisterScreen() {
  const router = useRouter();
  const privacyHref = '/privacy' as Href;
  const supportHref = '/support' as Href;
  const deleteAccountHref = '/delete-account-info' as Href;
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    if (
      !form.name.trim() ||
      !form.username.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError('Complete every field first.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.register({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppScreen safeTop={false}>
      <AuthHero
        eyebrow="Join SmartSplit"
        title="Create one account for direct splits, group trips, receipts, and account control."
        body="The same account gives you friend balances, group expenses, AI-assisted receipts, and clean account management across web and mobile."
        note="This screen starts with the same structure as the web app, then we can extend it with store-ready onboarding, consent, and subscriptions."
      />

      <SurfaceCard>
        <Text style={styles.heading}>Sign up</Text>
        <View style={styles.form}>
          <FormField
            label="Full name"
            value={form.name}
            onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="Tanuj Kumar"
          />
          <FormField
            label="Username"
            autoCapitalize="none"
            autoCorrect={false}
            value={form.username}
            onChangeText={(value) => setForm((current) => ({ ...current, username: value }))}
            placeholder="tanujdonkal"
          />
          <FormField
            label="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={form.email}
            onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
            placeholder="tanujdonkal29@gmail.com"
          />
          <FormField
            label="Password"
            secureTextEntry
            hint="Minimum 6 characters"
            value={form.password}
            onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
            placeholder="Create a password"
          />
          <FormField
            label="Confirm password"
            secureTextEntry
            value={form.confirmPassword}
            onChangeText={(value) =>
              setForm((current) => ({ ...current, confirmPassword: value }))
            }
            placeholder="Confirm password"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label="Create account"
            onPress={() => void handleRegister()}
            loading={isSubmitting}
          />
          <Text style={styles.helper}>
            By creating an account, you can review the Privacy Policy, Support details, and
            account deletion steps at any time.
          </Text>
          <View style={styles.linkRow}>
            <Link href={privacyHref} asChild>
              <Pressable>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </Pressable>
            </Link>
            <Link href={supportHref} asChild>
              <Pressable>
                <Text style={styles.legalLink}>Support</Text>
              </Pressable>
            </Link>
            <Link href={deleteAccountHref} asChild>
              <Pressable>
                <Text style={styles.legalLink}>Delete Account</Text>
              </Pressable>
            </Link>
          </View>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.link}>Already have an account? Log in</Text>
            </Pressable>
          </Link>
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
  },
  form: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 22,
  },
  helper: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  legalLink: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  link: {
    textAlign: 'center',
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '600',
  },
});
