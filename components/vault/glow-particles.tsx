import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface ParticleProps {
  index: number;
}

const Particle: React.FC<ParticleProps> = ({ index }) => {
  const { width, height } = useWindowDimensions();
  
  // Starting coordinates
  const startX = Math.random() * width;
  const startY = Math.random() * height;
  
  const tx = useSharedValue(startX);
  const ty = useSharedValue(startY);
  const opacity = useSharedValue(0.1 + Math.random() * 0.4);
  const scale = useSharedValue(0.5 + Math.random() * 1.5);

  useEffect(() => {
    // Random ending coordinates computed on mount
    const targetX = startX + (Math.random() - 0.5) * 150;
    const targetY = startY - (100 + Math.random() * 200); // Float upward

    // Animate coordinates
    tx.value = withRepeat(
      withTiming(targetX, { duration: 8000 + Math.random() * 6000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    ty.value = withRepeat(
      withTiming(targetY, { duration: 8000 + Math.random() * 6000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(opacity.value > 0.3 ? 0.1 : 0.6, { duration: 3000 + Math.random() * 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    scale.value = withRepeat(
      withTiming(scale.value * 1.3, { duration: 4000 + Math.random() * 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [startX, startY, tx, ty, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
    };
  });

  // Green/Mint glow dot
  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: index % 2 === 0 ? '#2ED8A5' : '#00684F',
          width: 8 + (index % 4) * 4,
          height: 8 + (index % 4) * 4,
          borderRadius: 8,
        },
        animatedStyle,
      ]}
    />
  );
};

export const GlowParticles: React.FC = () => {
  const particles = Array.from({ length: 12 }, (_, i) => i);
  
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Background dark gradient */}
      <LinearGradient
        colors={['#0B0F10', '#022119', '#0B0F10']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {particles.map((idx) => (
        <Particle key={idx} index={idx} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#2ED8A5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 4,
  },
});
