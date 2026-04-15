import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { AuthHero } from '@/components/AuthHero';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useAuth } from '@/context/useAuth';
import { api } from '@/lib/api';
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
      const response = await api.login({
        username: username.trim().toLowerCase(),
        password,
      });
      await login(response.token, response.user);
      router.replace('/(tabs)/groups');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <AuthHero
        eyebrow="Welcome Back"
        title="Pick up your friends, groups, and balances exactly where you left them."
        body="SmartSplit keeps everyday direct splits and group workflows in one clean space, now ready to grow into a real mobile app."
        note="This mobile client uses the same backend and auth project as the web app, so the workflows stay aligned."
      />

      <SurfaceCard>
        <Text style={styles.heading}>Log in</Text>
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
  link: {
    textAlign: 'center',
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '600',
  },
});
