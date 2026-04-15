import 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/context/AuthContext';
import { colors } from '@/theme/tokens';

function BackButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.back()} hitSlop={12}>
      <Ionicons name="chevron-back" size={26} color={colors.text} />
    </Pressable>
  );
}

const headerWithBack = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.page },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerLeft: () => <BackButton />,
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="dark" backgroundColor={colors.page} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.page },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" options={{ ...headerWithBack, title: 'Log in' }} />
          <Stack.Screen name="register" options={{ ...headerWithBack, title: 'Sign up' }} />
          <Stack.Screen
            name="forgot-password"
            options={{ ...headerWithBack, title: 'Forgot Password' }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="friend/[friendId]"
            options={{ ...headerWithBack, title: 'Friend' }}
          />
          <Stack.Screen
            name="group/[groupId]"
            options={{ ...headerWithBack, title: 'Group' }}
          />
          <Stack.Screen name="assistant" options={{ ...headerWithBack, title: 'Assistant' }} />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
