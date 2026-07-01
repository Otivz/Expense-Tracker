import { useSidebar } from '@/context/sidebar-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  onMenuPress?: () => void;
  onSearchPress?: () => void;
}

export function Header({ title, onMenuPress, onSearchPress }: HeaderProps) {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const handleMenuPress = onMenuPress || openSidebar;
  const handleSearchPress = onSearchPress || (() => router.push('/(tabs)/search'));

  return (
    <LinearGradient
      colors={['#014134', '#00684F']}
      style={styles.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleMenuPress} style={styles.iconButton} activeOpacity={0.7}>
              <Ionicons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View pointerEvents="none">
              <Image
                source={require('@/assets/images/header-logo.png')}
                style={styles.headerLogoImage}
                resizeMode="contain"
              />
            </View>
          </View>
          <TouchableOpacity onPress={handleSearchPress} style={styles.iconButton} activeOpacity={0.7}>
            <Ionicons name="search" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 28,
    paddingBottom: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogoImage: {
    width: 80,
    height: 40,
    transform: [{ scale: 1.50 }],
    marginLeft: 20,
  },
  iconButton: {
    padding: 4,
  },
});
