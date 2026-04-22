import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { BrandHeader } from '@/components/BrandHeader';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useAuth } from '@/context/useAuth';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError('Enter your username and password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Resolve username to email (same as web flow)
      const resolved = await api.resolveUsername({
        username: username.trim().toLowerCase(),
      });

      // Sign in via Supabase Auth (same as web flow)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: resolved.email,
        password,
      });

      if (authError) throw authError;

      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error('No authenticated session was returned');

      // Sync user with backend
      const syncedUser = await api.syncCurrentUser(
        {
          email: data.user.email ?? resolved.email,
          name: String(data.user.user_metadata?.name ?? '').trim() || undefined,
          username:
            String(data.user.user_metadata?.username ?? '').trim() ||
            username.trim().toLowerCase(),
        },
        accessToken,
      );

      await login(accessToken, syncedUser);
      router.replace('/(tabs)/friends');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <SurfaceCard>
        <BrandHeader variant="mark" />
        <Text style={styles.heading}>Log in</Text>
        <Text style={styles.subtext}>Use your username and password to continue.</Text>
        <View style={styles.form}>
          <FormField
            label="Username"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            placeholder="tanujdonkal"
          />
          <FormField
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label="Log in"
            onPress={() => void handleLogin()}
            loading={isSubmitting}
          />
          <Link href="/forgot-password" asChild>
            <Pressable>
              <Text style={styles.link}>Forgot your password?</Text>
            </Pressable>
          </Link>
          <Link href="/register" asChild>
            <Pressable>
              <Text style={styles.secondaryLink}>Need an account? Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.lg,
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
  },
  subtext: {
    marginTop: spacing.xs,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
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
  link: {
    textAlign: 'center',
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryLink: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
