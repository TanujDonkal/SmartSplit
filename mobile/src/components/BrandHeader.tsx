import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/tokens';

export function BrandHeader() {
  return (
    <View style={styles.row}>
      <Image
        source={{ uri: 'https://smart-split-expanse.vercel.app/smartsplit-logo.png' }}
        style={styles.logo}
      />
      <View>
        <Text style={styles.title}>SmartSplit</Text>
        <Text style={styles.caption}>Split bills simply</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  caption: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
