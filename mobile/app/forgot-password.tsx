import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { AuthHero } from '@/components/AuthHero';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestReset() {
    if (!username.trim()) {
      setError('Enter your username first.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const resolved = await api.resolveUsername({ username: username.trim().toLowerCase() });
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resolved.email, {
        redirectTo: 'smartsplit://update-password',
      });

      if (resetError) {
        throw resetError;
      }

      setMessage(`Reset link sent to ${resolved.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request reset');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppScreen safeTop={false}>
      <AuthHero
        eyebrow="Recovery"
        title="Regain access securely without breaking your account flow."
        body="SmartSplit keeps reset requests tied to the account username, then delivers the secure reset email through the registered address."
        note="We can extend this with the same cooldown and rate-limit UX the web app already uses."
      />

      <SurfaceCard>
        <Text style={styles.heading}>Forgot password</Text>
        <View style={styles.form}>
          <FormField
            label="Username"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            placeholder="friend_username"
          />
          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label="Send reset link"
            onPress={() => void handleRequestReset()}
            loading={isSubmitting}
          />
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
  success: {
    color: colors.primaryDark,
    fontSize: 14,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 22,
  },
});
