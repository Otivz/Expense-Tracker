import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  useDerivedValue,
  SharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface CombinationDialProps {
  onNumberChange: (num: number) => void;
  onInteractionChange?: (active: boolean) => void;
  isLockedOut: boolean;
  value: SharedValue<number>; // Shared value for current angle of dial
}

const DIAL_SIZE = 260;
const CENTER_X = DIAL_SIZE / 2;
const CENTER_Y = DIAL_SIZE / 2;
const DEG_PER_NUMBER = 3.6; // 360 deg / 100 numbers

export const CombinationDial: React.FC<CombinationDialProps> = ({
  onNumberChange,
  onInteractionChange,
  isLockedOut,
  value: rotation,
}) => {
  const lastNumber = useSharedValue(0);
  const lastAngle = useSharedValue(0);
  const velocity = useSharedValue(0);
  const lastTime = useSharedValue(0);

  // Trigger haptic feedback
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  // Callback to parent when number changes
  const handleNumberChange = (num: number) => {
    onNumberChange(num);
  };

  // Convert current rotation to a dial number (00-99) with hysteresis
  useDerivedValue(() => {
    // Top pointer is fixed at 0 degrees.
    // As the wheel rotates clockwise, the numbers passing the pointer decrease: 0 -> 99 -> 98...
    const rawNumberFloat = -rotation.value / DEG_PER_NUMBER;
    const normalizedFloat = ((rawNumberFloat % 100) + 100) % 100;

    const currentInt = lastNumber.value;
    let diff = normalizedFloat - currentInt;

    // Handle wrap around boundary logic
    if (diff < -50) diff += 100;
    if (diff > 50) diff -= 100;

    // Apply symmetric hysteresis threshold (0.55) to prevent rapid boundary vibrations
    if (Math.abs(diff) > 0.55) {
      const targetNum = Math.round(normalizedFloat) % 100;
      if (targetNum !== lastNumber.value) {
        let current = lastNumber.value;
        // Step through each intermediate number to ensure all ticks are registered
        while (current !== targetNum) {
          let diffToTarget = targetNum - current;
          if (diffToTarget < -50) diffToTarget += 100;
          if (diffToTarget > 50) diffToTarget -= 100;

          const step = diffToTarget > 0 ? 1 : -1;
          current = (current + step + 100) % 100;

          runOnJS(triggerHaptic)();
          runOnJS(handleNumberChange)(current);
        }
        lastNumber.value = targetNum;
      }
    }
  });

  const panGesture = Gesture.Pan()
    .enabled(!isLockedOut)
    .onBegin((e) => {
      // Cancel active deceleration/snapping animation on touch down
      rotation.value = rotation.value;

      const dx = e.x - CENTER_X;
      const dy = e.y - CENTER_Y;
      lastAngle.value = Math.atan2(dy, dx) * (180 / Math.PI);
      lastTime.value = Date.now();
      velocity.value = 0;

      if (onInteractionChange) {
        runOnJS(onInteractionChange)(true);
      }
    })
    .onUpdate((e) => {
      const dx = e.x - CENTER_X;
      const dy = e.y - CENTER_Y;
      const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      let delta = currentAngle - lastAngle.value;
      // Handle coordinate system wraparound boundary
      if (delta < -180) delta += 360;
      if (delta > 180) delta -= 360;

      // Heavy mechanical drag resistance (friction) for precision dialing
      const mechanicalResistance = 0.45;
      rotation.value += delta * mechanicalResistance;

      const now = Date.now();
      const dt = now - lastTime.value;
      if (dt > 0) {
        // Average the velocity to smooth out sudden changes
        velocity.value = velocity.value * 0.7 + (delta / dt) * 0.3;
      }

      lastAngle.value = currentAngle;
      lastTime.value = now;
    })
    .onEnd(() => {
      // Calculate inertial slide on finger release
      const v = velocity.value; // deg/ms
      
      // Only apply inertia if velocity is high enough (fast flick/spin)
      // If velocity is low, the user was deliberately pinpointing a number, so snap directly without sliding
      const isFlick = Math.abs(v) > 0.15;
      const decayDuration = 120; // duration of decay effect in ms
      const displacement = isFlick ? v * decayDuration : 0;

      // Predict stopping position and snap to closest tick mark (multiple of 3.6 degrees)
      let targetRotation = rotation.value + displacement;
      const closestNumber = Math.round(targetRotation / DEG_PER_NUMBER);
      targetRotation = closestNumber * DEG_PER_NUMBER;

      // Heavy mechanical deceleration snap
      rotation.value = withTiming(targetRotation, {
        duration: isFlick ? Math.max(200, Math.min(600, Math.abs(displacement) * 4)) : 150,
        easing: Easing.out(Easing.cubic),
      });

      if (onInteractionChange) {
        runOnJS(onInteractionChange)(false);
      }
    });

  const animatedDialStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  // Render dial tick marks and numbers (00-99)
  const renderTicks = () => {
    const ticks = [];
    const innerRadius = (DIAL_SIZE - 12) / 2; // Center of dialInner is 124px
    
    // Render tick marks for all 100 units
    for (let i = 0; i < 100; i++) {
      const angle = i * DEG_PER_NUMBER; // 0 degrees is straight up by default in 2D transform space
      
      // Multiples of 10 are major labeled ticks. Multiples of 5 are medium unlabeled ticks.
      // All other units are minor ticks.
      const isMajor = i % 10 === 0;
      const isMedium = i % 5 === 0 && !isMajor;

      const W = isMajor ? 2 : 1;
      const H = isMajor ? 12 : isMedium ? 8 : 5;
      
      // Calculate distance from center to outer border (with padding)
      const borderOffset = 4;
      const translateY = -(innerRadius - H / 2 - borderOffset);

      ticks.push(
        <View
          key={`tick-${i}`}
          style={[
            styles.tick,
            {
              left: innerRadius - W / 2,
              top: innerRadius - H / 2,
              width: W,
              height: H,
              backgroundColor: isMajor ? '#2ED8A5' : isMedium ? '#1EA881' : '#A8B3AF',
              opacity: isMajor ? 1 : isMedium ? 0.8 : 0.6,
              transform: [
                { rotate: `${angle}deg` },
                { translateY: translateY }
              ],
            },
          ]}
        />
      );

      // Render text labels only for major multiples of 10
      if (isMajor) {
        const textW = 28;
        const textH = 20;
        const textTranslateY = -(innerRadius - 30); // Position inside the tick marks

        ticks.push(
          <Text
            key={`num-${i}`}
            style={[
              styles.dialNumberText,
              {
                left: innerRadius - textW / 2,
                top: innerRadius - textH / 2,
                width: textW,
                height: textH,
                color: '#FFFFFF', // High contrast white
                transform: [
                  { rotate: `${angle}deg` },
                  { translateY: textTranslateY }
                ],
              },
            ]}
          >
            {i.toString().padStart(2, '0')}
          </Text>
        );
      }
    }
    return ticks;
  };

  return (
    <View style={styles.container}>
      {/* Top pointer indicator */}
      <View style={styles.pointerContainer}>
        <View style={styles.pointerTriangle} />
        <View style={styles.pointerLine} />
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={styles.dialGestureContainer}>
          <Animated.View style={[styles.dialOuter, animatedDialStyle]}>
            {/* Inner mechanical shadow dial */}
            <View style={styles.dialInner}>
              <View style={styles.dialCenterCap}>
                {/* Metallic center knob */}
                <View style={styles.dialKnob}>
                  <View style={styles.dialKnobRidge} />
                </View>
              </View>
              {renderTicks()}
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: DIAL_SIZE + 40,
    height: DIAL_SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dialGestureContainer: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointerContainer: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#2ED8A5',
    shadowColor: '#2ED8A5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  pointerLine: {
    width: 2,
    height: 12,
    backgroundColor: '#2ED8A5',
  },
  dialOuter: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    backgroundColor: '#014134',
    borderWidth: 6,
    borderColor: '#022119',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialInner: {
    width: DIAL_SIZE - 12,
    height: DIAL_SIZE - 12,
    borderRadius: (DIAL_SIZE - 12) / 2,
    backgroundColor: '#111A18',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#00684F',
  },
  dialCenterCap: {
    width: DIAL_SIZE - 120,
    height: DIAL_SIZE - 120,
    borderRadius: (DIAL_SIZE - 120) / 2,
    backgroundColor: '#0A1211',
    borderWidth: 2,
    borderColor: '#014134',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  dialKnob: {
    width: DIAL_SIZE - 160,
    height: DIAL_SIZE - 160,
    borderRadius: (DIAL_SIZE - 160) / 2,
    backgroundColor: '#1C2E2A',
    borderWidth: 1,
    borderColor: '#2ED8A5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2ED8A5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dialKnobRidge: {
    width: DIAL_SIZE - 200,
    height: DIAL_SIZE - 200,
    borderRadius: (DIAL_SIZE - 200) / 2,
    backgroundColor: '#0B0F10',
    borderWidth: 1,
    borderColor: '#014134',
  },
  tick: {
    position: 'absolute',
  },
  dialNumberText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    width: 28,
    height: 20,
    textAlign: 'center',
  },
});
