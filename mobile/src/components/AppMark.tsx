import { Image, StyleSheet, View } from 'react-native';

type AppMarkProps = {
  size?: number;
};

export function AppMark({ size = 44 }: AppMarkProps) {
  return (
    <View style={styles.wrap}>
      <Image
        source={require('../../assets/icon.png')}
        style={{ width: size, height: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
  },
});
