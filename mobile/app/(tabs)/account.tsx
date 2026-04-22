import { useEffect, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppScreen } from '@/components/AppScreen';
import { FormField } from '@/components/FormField';
import { NoticeText } from '@/components/NoticeText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SelectField } from '@/components/SelectField';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useAuth } from '@/context/useAuth';
import { api, SUPPORTED_CURRENCIES } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme/tokens';

export default function AccountScreen() {
  const router = useRouter();
  const privacyHref = '/privacy' as Href;
  const supportHref = '/support' as Href;
  const deleteAccountHref = '/delete-account-info' as Href;
  const { token, user, updateUser, logout } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: '',
    username: '',
    email: '',
    default_currency: 'CAD',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    setProfileForm({
      name: user?.name ?? '',
      username: user?.username ?? '',
      email: user?.email ?? '',
      default_currency: user?.default_currency ?? 'CAD',
    });
  }, [user?.default_currency, user?.email, user?.name, user?.username]);

  async function handleSaveProfile() {
    if (!token) {
      setError('Log in first to update your profile.');
      return;
    }

    if (
      !profileForm.name.trim() ||
      !profileForm.username.trim() ||
      !profileForm.email.trim() ||
      !profileForm.default_currency
    ) {
      setError('Name, username, email, and currency are required.');
      return;
    }

    setIsSavingProfile(true);
    setError('');
    setMessage('');

    try {
      const normalizedEmail = profileForm.email.trim().toLowerCase();
      const normalizedUsername = profileForm.username.trim().toLowerCase();
      const trimmedName = profileForm.name.trim();
      const emailChanged = normalizedEmail !== user?.email?.trim().toLowerCase();

      const { data: authUpdate, error: authError } = await supabase.auth.updateUser({
        ...(emailChanged ? { email: normalizedEmail } : {}),
        data: {
          name: trimmedName,
          username: normalizedUsername,
        },
      });

      if (authError) {
        throw authError;
      }

      const syncedUser = await api.syncCurrentUser({
        email: authUpdate.user?.email?.trim().toLowerCase() ?? normalizedEmail,
        name: trimmedName,
        username: normalizedUsername,
      });

      const updated = await api.updateProfile({
        name: syncedUser.name,
        username: syncedUser.username,
        email: syncedUser.email,
        default_currency: profileForm.default_currency,
      });

      await updateUser(updated);
      setMessage(
        emailChanged &&
          (authUpdate.user?.email?.trim().toLowerCase() ?? '') !== normalizedEmail
          ? 'Profile saved. Confirm the new email from Supabase if required.'
          : 'Profile saved successfully.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleDeleteAccount() {
    setIsDeletingAccount(true);
    setError('');
    setMessage('');

    try {
      await api.deleteAccount();
      await logout();
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <AppScreen>
      <AppHeader />

      <SurfaceCard>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.body}>
          Profile, deletion, privacy, AI consent, and billing controls should live here for
          app-store readiness.
        </Text>
      </SurfaceCard>

      {message ? <NoticeText tone="success" message={message} /> : null}
      {error ? <NoticeText tone="error" message={error} /> : null}

      {!token ? (
        <SurfaceCard>
          <Text style={styles.body}>Log in first to manage your account.</Text>
        </SurfaceCard>
      ) : (
        <>
          <SurfaceCard>
            <View style={styles.form}>
              <FormField
                label="Full name"
                value={profileForm.name}
                onChangeText={(value) => setProfileForm((current) => ({ ...current, name: value }))}
              />
              <FormField
                label="Username"
                autoCapitalize="none"
                autoCorrect={false}
                value={profileForm.username}
                onChangeText={(value) =>
                  setProfileForm((current) => ({ ...current, username: value }))
                }
              />
              <FormField
                label="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={profileForm.email}
                onChangeText={(value) => setProfileForm((current) => ({ ...current, email: value }))}
              />
              <SelectField
                label="Default currency"
                value={profileForm.default_currency}
                options={SUPPORTED_CURRENCIES.map((c) => ({ label: c, value: c }))}
                onChange={(value) =>
                  setProfileForm((current) => ({
                    ...current,
                    default_currency: value,
                  }))
                }
              />
              <PrimaryButton
                label="Save profile"
                onPress={() => void handleSaveProfile()}
                loading={isSavingProfile}
              />
            </View>
          </SurfaceCard>

          <SurfaceCard>
            <Text style={styles.sectionTitle}>Log out</Text>
            <Text style={styles.sectionBody}>
              Sign out of this device and return to the login screen.
            </Text>
            <View style={styles.form}>
              <PrimaryButton
                label="Log out"
                tone="ghost"
                onPress={() =>
                  void (async () => {
                    await logout();
                    router.replace('/login');
                  })()
                }
              />
            </View>
          </SurfaceCard>

          <SurfaceCard>
            <Text style={styles.sectionTitle}>Privacy and support</Text>
            <Text style={styles.sectionBody}>
              Review SmartSplit privacy details, support contact information, and deletion guidance.
            </Text>
            <View style={styles.form}>
              <PrimaryButton
                label="Privacy policy"
                tone="ghost"
                onPress={() => router.push(privacyHref)}
              />
              <PrimaryButton label="Support" tone="ghost" onPress={() => router.push(supportHref)} />
              <PrimaryButton
                label="Deletion help"
                tone="ghost"
                onPress={() => router.push(deleteAccountHref)}
              />
            </View>
          </SurfaceCard>

          <SurfaceCard>
            <Text style={styles.sectionTitle}>Delete account</Text>
            <Text style={styles.sectionBody}>
              Your account and related SmartSplit data will be permanently deleted.
            </Text>
            <View style={styles.form}>
              <PrimaryButton
                label="Delete account"
                tone="danger"
                onPress={() => void handleDeleteAccount()}
                loading={isDeletingAccount}
              />
            </View>
          </SurfaceCard>
        </>
      )}
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
