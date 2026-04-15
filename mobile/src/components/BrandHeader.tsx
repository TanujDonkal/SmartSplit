import { Image, StyleSheet, View } from 'react-native';

type BrandHeaderProps = {
  variant?: 'full' | 'mark';
};

export function BrandHeader({ variant = 'full' }: BrandHeaderProps) {
  if (variant === 'mark') {
    return (
      <View style={styles.row}>
        <Image source={require('../../assets/icon.png')} style={styles.mark} />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Image
        source={{ uri: 'https://smart-split-expanse.vercel.app/smartsplit-logo.png' }}
        style={styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'flex-start',
  },
  logo: {
    width: 172,
    height: 64,
  },
  mark: {
    width: 44,
    height: 44,
  },
});
