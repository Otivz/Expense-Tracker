import { useVault, VaultAccount } from '@/context/vault-context';
import { isSupabaseConfigured, sendOtpCode, signInWithEmail, signUpWithEmail, verifyOtpCode } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CombinationDial } from './combination-dial';
import { GlowParticles } from './glow-particles';

export const VaultScreen: React.FC = () => {
  const {
    accounts,
    currentAccount,
    needsComboSetup,
    hasBiometricsSupport,
    biometryType,
    isLockedOut,
    lockoutRemaining,
    selectAccount,
    verifyCombinationStep,
    saveVaultCombination,
    addAccount,
    unlockVault,
    unlockWithBiometrics,
    enableBiometrics,
    deleteAccount,
  } = useVault();

  // Navigation / State of the Vault flows
  // 'select' | 'auth' | 'loading' | 'combo' | 'setup' | 'success' | 'forgot'
  const [viewState, setViewState] = useState<'select' | 'auth' | 'loading' | 'combo' | 'setup' | 'success' | 'forgot'>('select');

  // Auth Form States
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Combination State
  const [dialNumber, setDialNumber] = useState(0);
  const [enteredCombo, setEnteredCombo] = useState<number[]>([]);
  const [comboError, setComboError] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Rotate to the correct number');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isDialActive, setIsDialActive] = useState(false);
  const hasAutoRedirected = useRef(false);
  const wrongAttempts = useRef(0);

  // Shared Animation Values
  const dialRotation = useSharedValue(0);
  const dialShake = useSharedValue(0);
  const liveNumberShake = useSharedValue(0);
  const dialGlowColor = useSharedValue(0); // 0 = standard, 1 = success green, 2 = error red
  const dialScale = useSharedValue(1);
  const loadingRotation = useSharedValue(0);

  const attemptBiometrics = useCallback(async () => {
    const success = await unlockWithBiometrics();
    if (success) {
      setViewState('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        // Vault context triggers isUnlocked internally
      }, 1000);
    } else {
      // Fallback to combination lock
      setViewState('combo');
    }
  }, [unlockWithBiometrics]);

  const handleSelectAccount = useCallback(async (account: VaultAccount) => {
    const needsSetup = await selectAccount(account);
    setViewState('loading');

    // Run loading animation (800ms - 1200ms)
    // Rotate dial automatically
    dialRotation.value = 0;
    dialRotation.value = withRepeat(
      withTiming(720, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      1,
      false
    );

    setTimeout(() => {
      // Check biometrics or combo screen
      if (account.biometricsEnabled && hasBiometricsSupport) {
        // Automatically attempt biometric unlock
        attemptBiometrics();
      } else {
        setViewState(needsSetup ? 'setup' : 'combo');
      }
      setEnteredCombo([]);
      setDialNumber(0);
      dialRotation.value = 0;
    }, 1200);
  }, [selectAccount, dialRotation, hasBiometricsSupport, attemptBiometrics]);



  // Sync viewState when locked out or account changes
  useEffect(() => {
    if (currentAccount) {
      if (viewState === 'select') {
        setViewState(needsComboSetup ? 'setup' : 'combo');
      }
    } else {
      if (viewState !== 'auth') {
        setViewState('select');
      }
    }
  }, [currentAccount, needsComboSetup, viewState]);

  // Infinite mechanical spin for loading dial
  useEffect(() => {
    if (viewState === 'loading') {
      loadingRotation.value = 0;
      loadingRotation.value = withRepeat(
        withTiming(360, { duration: 6500, easing: Easing.linear }),
        -1, // Infinite repeat
        false // Spin forward continuously
      );
    }
  }, [viewState]);

  const handleNumberStabilized = useCallback(async (num: number) => {
    if (viewState === 'setup') {
      // Setup combination mode
      const newCombo = [...enteredCombo, num];
      setEnteredCombo(newCombo);

      // Visual feedback
      dialScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1.05, { duration: 150 }),
        withTiming(1, { duration: 100 })
      );
      dialGlowColor.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 300 })
      );

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }

      if (newCombo.length === 4) {
        // Complete combination setup
        await saveVaultCombination(newCombo);
        setViewState('success');
        if (currentAccount) {
          // Ask if they want to enable biometrics
          if (hasBiometricsSupport) {
            enableBiometrics(currentAccount.id, true);
          }
        }
        setTimeout(() => {
          // Directly unlock
          unlockVault(newCombo);
        }, 1200);
      } else {
        setStatusMessage(`Number ${newCombo.length} accepted. Rotate to next.`);
        setHasInteracted(false);
      }
    } else if (viewState === 'combo') {
      // Unlock combination mode
      const nextStepIndex = enteredCombo.length + 1;
      const testCombo = [...enteredCombo, num];

      const isStepCorrect = await verifyCombinationStep(nextStepIndex, testCombo);

      if (isStepCorrect) {
        // Step correct!
        const newCombo = [...enteredCombo, num];
        setEnteredCombo(newCombo);
        wrongAttempts.current = 0;

        // Haptic & Visual glow
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
        }
        dialScale.value = withSequence(
          withTiming(0.95, { duration: 100 }),
          withTiming(1.05, { duration: 150 }),
          withTiming(1, { duration: 100 })
        );
        dialGlowColor.value = withSequence(
          withTiming(1, { duration: 150 }),
          withTiming(0, { duration: 300 })
        );

        if (newCombo.length === 4) {
          // Fully Unlocked!
          setViewState('success');
          setStatusMessage('Vault Unlocked');
          dialRotation.value = withTiming(dialRotation.value + 45, { duration: 800 });

          setTimeout(() => {
            unlockVault(newCombo);
          }, 1200);
        } else {
          setStatusMessage('Number Accepted. Rotate to next.');
          setHasInteracted(false);
        }
      } else {
        // Increment wrong attempts counter
        wrongAttempts.current += 1;

        // Play error haptic
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
        }

        // Shake the live number container
        liveNumberShake.value = withSequence(
          withTiming(-10, { duration: 60 }),
          withTiming(10, { duration: 60 }),
          withTiming(-10, { duration: 60 }),
          withTiming(10, { duration: 60 }),
          withTiming(0, { duration: 60 })
        );

        // Flash red glow around dial border
        dialGlowColor.value = withSequence(
          withTiming(2, { duration: 150 }),
          withTiming(0, { duration: 800 })
        );

        setStatusMessage('Incorrect Number');
        setComboError(true);

        setTimeout(() => {
          // Immediately reset back to the beginning on wrong number
          setEnteredCombo([]);
          setDialNumber(0);
          dialRotation.value = 0;
          setComboError(false);
          setHasInteracted(false);
          setStatusMessage(currentAccount?.id === 'demo-user-id'
            ? 'Demo Combination: 10 - 20 - 30 - 40'
            : 'Rotate the dial to enter the security combination.');
        }, 1200);
      }
    }
  }, [
    viewState,
    enteredCombo,
    currentAccount,
    hasBiometricsSupport,
    enableBiometrics,
    saveVaultCombination,
    unlockVault,
    verifyCombinationStep,
    dialRotation,
    dialScale,
    dialGlowColor,
    dialShake,
  ]);

  // Handle dial pause verification (500ms)
  useEffect(() => {
    if (viewState !== 'combo' && viewState !== 'setup') return;
    if (!hasInteracted) return;
    if (isDialActive) return; // Wait until they stop dragging

    const timer = setTimeout(() => {
      handleNumberStabilized(dialNumber);
    }, 500);

    return () => clearTimeout(timer);
  }, [dialNumber, viewState, handleNumberStabilized, hasInteracted, isDialActive]);

  const handleAuthSubmit = async () => {
    setAuthError('');
    if (!email || !password || (isSignUp && !name)) {
      setAuthError('Please fill in all fields.');
      return;
    }
    setAuthLoading(true);
    try {
      let user;
      if (isSignUp) {
        user = await signUpWithEmail(email, password, name);
      } else {
        user = await signInWithEmail(email, password);
      }
      const account = await addAccount(user);

      // Clear inputs
      setEmail('');
      setPassword('');
      setName('');

      // Select new account and check combo setup status
      handleSelectAccount(account);
    } catch (e: any) {
      setAuthError(e.message || 'Authentication failed.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAuthLoading(false);
    }
  };



  const handleForgotCombination = () => {
    setResetEmail('');
    setResetError('');
    setOtpCode('');
    setOtpSent(false);
    setOtpLoading(false);
    setViewState('forgot');
  };

  const handleResetSubmit = async () => {
    setResetError('');
    if (!resetEmail.trim()) {
      setResetError('Email address is required.');
      return;
    }

    if (!currentAccount) return;

    if (resetEmail.trim().toLowerCase() !== currentAccount.email.toLowerCase()) {
      setResetError('Email address does not match this vault owner.');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
      }
      return;
    }

    if (!isSupabaseConfigured) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }
      Alert.alert(
        'Offline Reset',
        'Offline Mode: Ownership verified. Press OK to configure a new combination.',
        [
          {
            text: 'OK',
            onPress: () => {
              setEnteredCombo([]);
              setDialNumber(0);
              dialRotation.value = 0;
              setViewState('setup');
            },
          },
        ]
      );
      return;
    }

    setOtpLoading(true);
    try {
      await sendOtpCode(resetEmail);
      setOtpSent(true);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }
    } catch (e: any) {
      const msg: string = e.message || '';
      if (msg.startsWith('ACCOUNT_NOT_FOUND:')) {
        setResetError(
          'This account was not signed up through Supabase. ' +
          'Forgot Combination via email is only available for accounts created while connected to the internet.'
        );
      } else {
        setResetError(msg || 'Failed to send verification code. Please try again.');
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyResetOtp = async () => {
    setResetError('');
    if (otpCode.length < 6) {
      setResetError('Please enter the verification code sent to your email.');
      return;
    }

    setOtpLoading(true);
    try {
      await verifyOtpCode(resetEmail, otpCode);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }
      Alert.alert(
        'Identity Verified',
        'Your identity has been verified via Supabase. Press OK to configure a new vault combination.',
        [
          {
            text: 'OK',
            onPress: () => {
              setEnteredCombo([]);
              setDialNumber(0);
              dialRotation.value = 0;
              setViewState('setup');
            },
          },
        ]
      );
    } catch (e: any) {
      setResetError(e.message || 'Incorrect verification code. Please try again.');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // Animated styles
  const animatedDialWrapperStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: dialShake.value },
        { scale: dialScale.value }
      ],
    };
  });

  const animatedLiveNumberStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: liveNumberShake.value }
      ],
    };
  });

  const glowBorderColorStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      dialGlowColor.value,
      [0, 1, 2],
      ['transparent', '#2ED8A5', '#FF6B6B']
    );
    return {
      borderColor,
      borderWidth: 2,
    };
  });

  // Render sub-views
  const renderAccountSelection = () => {
    return (
      <View style={styles.selectionContainer}>
        <View style={styles.headerArea}>
          <Text style={styles.brandTitle}>C-VAULT</Text>
          <Text style={styles.mainTitle}>Choose Your Vault</Text>
          <Text style={styles.subtitle}>Select an account to unlock.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.accountList} showsVerticalScrollIndicator={false}>
          {accounts.map((account) => {
            const isSelected = currentAccount?.id === account.id;
            return (
              <TouchableOpacity
                key={account.id}
                activeOpacity={0.8}
                onPress={() => handleSelectAccount(account)}
                style={[
                  styles.accountCard,
                  isSelected && styles.accountCardSelected,
                ]}
              >
                <View style={styles.accountCardInner}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>{account.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountEmail}>{account.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      Alert.alert(
                        'Remove Account',
                        `Remove "${account.name}" from this device? This only removes the local vault entry — your data stays safe.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: () => deleteAccount(account.id),
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.removeAccountText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.addAccountButton}
            activeOpacity={0.7}
            onPress={() => setViewState('auth')}
          >
            <Ionicons name="add" size={20} color="#2ED8A5" style={{ marginRight: 8 }} />
            <Text style={styles.addAccountButtonText}>Add Another Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderAuthForm = () => {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.authContainer}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setViewState(accounts.length > 0 ? 'select' : 'auth')}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 16 }}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerArea}>
          <Text style={styles.brandTitle}>C-VAULT</Text>
          <Text style={styles.mainTitle}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
          <Text style={styles.subtitle}>Protect your assets with encrypted lock technology.</Text>
        </View>

        <View style={styles.formContainer}>
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#A8B3AF"
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#A8B3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#A8B3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.submitButton}
            activeOpacity={0.8}
            onPress={handleAuthSubmit}
            disabled={authLoading}
          >
            <Text style={styles.submitButtonText}>
              {authLoading ? 'Verifying...' : isSignUp ? 'Create Account' : 'Unlock Access'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchAuthType}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchAuthTypeText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </Text>
          </TouchableOpacity>


        </View>
      </KeyboardAvoidingView>
    );
  };

  const renderLoadingScreen = () => {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.brandTitleLoading}>C-VAULT</Text>
        <Text style={styles.loadingText}>Loading Your Vault...</Text>

        <View style={[styles.dialWrapper, { marginBottom: 30 }]}>
          <CombinationDial
            onNumberChange={() => { }}
            isLockedOut={true}
            value={loadingRotation}
          />
        </View>

        <Text style={styles.secureConnectionText}>Establishing secure Postgres session...</Text>
      </View>
    );
  };

  const renderCombinationSetup = () => {
    return (
      <ScrollView
        style={styles.scrollViewContainer}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerArea, { marginTop: Platform.OS === 'ios' ? 70 : 50, marginBottom: 12 }]}>
          <Text style={styles.brandTitle}>C-VAULT</Text>
          <Text style={styles.mainTitle}>Setup Combination</Text>
          <Text style={styles.subtitle}>Choose 4 numbers to secure your mechanical safe.</Text>
        </View>

        {/* Combination Setup Progress Dots */}
        <View style={[styles.progressDotsRow, { marginVertical: 12 }]}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <View
              key={`dot-${idx}`}
              style={[
                styles.progressDot,
                enteredCombo.length > idx && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        <View style={[styles.liveNumberContainer, { marginBottom: 10 }]}>
          <Text style={styles.liveNumberLabel}>Current Setting</Text>
          <Text style={styles.liveNumber}>{dialNumber.toString().padStart(2, '0')}</Text>
        </View>

        <Text style={styles.hintText}>{statusMessage}</Text>

        <Animated.View style={[styles.dialWrapper, { marginBottom: 30 }, animatedDialWrapperStyle, glowBorderColorStyle]}>
          <CombinationDial
            onNumberChange={(num) => {
              setDialNumber(num);
              if (isDialActive) {
                setHasInteracted(true);
              }
            }}
            onInteractionChange={setIsDialActive}
            isLockedOut={false}
            value={dialRotation}
          />
        </Animated.View>
      </ScrollView>
    );
  };

  const renderCombinationLock = () => {
    const isLocked = isLockedOut;

    return (
      <ScrollView
        style={styles.scrollViewContainer}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topNavigationRow}>
          <TouchableOpacity
            style={styles.backToAccountsButtonNonAbsolute}
            onPress={() => selectAccount(null)}
          >
            <Ionicons name="arrow-back" size={20} color="#A8B3AF" />
            <Text style={styles.backToAccountsText}>Switch Account</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.headerArea, { marginTop: 12, marginBottom: 12 }]}>
          <Text style={styles.brandTitle}>C-VAULT</Text>
          <Text style={styles.mainTitle}>Unlock Your Vault</Text>
          <Text style={styles.subtitle}>
            Rotate the dial to enter the security combination.
          </Text>
        </View>

        {/* Combination Dots */}
        <View style={[styles.progressDotsRow, { marginVertical: 12 }]}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <View
              key={`dot-${idx}`}
              style={[
                styles.progressDot,
                enteredCombo.length > idx && styles.progressDotActive,
                comboError && styles.progressDotError,
              ]}
            />
          ))}
        </View>

        <Animated.View style={[styles.liveNumberContainer, { marginBottom: 10 }, animatedLiveNumberStyle]}>
          <Text style={styles.liveNumberLabel}>Dial Number</Text>
          <Text style={[styles.liveNumber, comboError && styles.liveNumberError]}>
            {dialNumber.toString().padStart(2, '0')}
          </Text>
        </Animated.View>

        <Text style={[styles.hintText, comboError && styles.hintTextError]}>
          {isLocked ? 'Vault access frozen' : statusMessage}
        </Text>

        {isLocked ? (
          <View style={styles.lockoutOverlay}>
            <Ionicons name="lock-closed" size={48} color="#FF6B6B" />
            <Text style={styles.lockoutTitle}>Vault Lockout Active</Text>
            <Text style={styles.lockoutSubtitle}>
              Too many failed combination attempts. Please wait {lockoutRemaining} seconds.
            </Text>
          </View>
        ) : (
          <Animated.View style={[styles.dialWrapper, { marginBottom: 10 }, animatedDialWrapperStyle, glowBorderColorStyle]}>
            <CombinationDial
              onNumberChange={(num) => {
                setDialNumber(num);
                if (isDialActive) {
                  setHasInteracted(true);
                }
              }}
              onInteractionChange={setIsDialActive}
              isLockedOut={isLocked}
              value={dialRotation}
            />
          </Animated.View>
        )}

        {currentAccount?.biometricsEnabled && hasBiometricsSupport && (
          <TouchableOpacity
            style={[styles.biometricsShortcut, { marginTop: 12 }]}
            onPress={() => attemptBiometrics()}
          >
            <Ionicons name="finger-print" size={24} color="#2ED8A5" style={{ marginRight: 8 }} />
            <Text style={styles.biometricsShortcutText}>Unlock with {biometryType}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => handleForgotCombination()}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotButtonText}>Forgot Combination?</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderForgotScreen = () => {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.authContainer}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (otpSent) {
              setOtpSent(false);
              setOtpCode('');
              setResetError('');
            } else {
              setViewState('combo');
            }
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 16 }}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerArea}>
          <Text style={styles.brandTitle}>C-VAULT</Text>
          <Text style={styles.mainTitle}>{otpSent ? 'Enter Code' : 'Verify Owner'}</Text>
          <Text style={styles.subtitle}>
            {otpSent
              ? `Enter the verification code sent to ${resetEmail}.`
              : 'Enter the email linked to this vault to reset combination.'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {resetError ? <Text style={styles.errorText}>{resetError}</Text> : null}

          {!otpSent ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Registered Email Address"
                placeholderTextColor="#A8B3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={resetEmail}
                onChangeText={setResetEmail}
                editable={!otpLoading}
              />

              <TouchableOpacity
                style={styles.submitButton}
                activeOpacity={0.8}
                onPress={handleResetSubmit}
                disabled={otpLoading}
              >
                <Text style={styles.submitButtonText}>
                  {otpLoading ? 'Sending...' : 'Send Verification Code'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Verification Code"
                placeholderTextColor="#A8B3AF"
                keyboardType="number-pad"
                maxLength={8}
                value={otpCode}
                onChangeText={setOtpCode}
                editable={!otpLoading}
              />

              <TouchableOpacity
                style={styles.submitButton}
                activeOpacity={0.8}
                onPress={handleVerifyResetOtp}
                disabled={otpLoading}
              >
                <Text style={styles.submitButtonText}>
                  {otpLoading ? 'Verifying...' : 'Verify & Reset Dial'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchAuthType}
                onPress={() => {
                  setOtpSent(false);
                  setOtpCode('');
                  setResetError('');
                }}
                disabled={otpLoading}
              >
                <Text style={styles.switchAuthTypeText}>Change Email Address</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  };
  const renderUnlockSuccess = () => {
    return (
      <View style={styles.successContainer}>
        <Ionicons name="shield-checkmark" size={80} color="#2ED8A5" style={styles.successIcon} />
        <Text style={styles.successBrand}>C-VAULT</Text>
        <Text style={styles.successTitle}>Vault Unlocked</Text>
        <Text style={styles.successSubtitle}>Welcome Back, {currentAccount?.name || 'User'}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <GlowParticles />
      {viewState === 'select' && renderAccountSelection()}
      {viewState === 'auth' && renderAuthForm()}
      {viewState === 'loading' && renderLoadingScreen()}
      {viewState === 'setup' && renderCombinationSetup()}
      {viewState === 'combo' && renderCombinationLock()}
      {viewState === 'success' && renderUnlockSuccess()}
      {viewState === 'forgot' && renderForgotScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F10',
  },
  selectionContainer: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 50,
  },
  brandTitle: {
    color: '#2ED8A5',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
  },
  mainTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#A8B3AF',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  accountList: {
    paddingBottom: 40,
  },
  accountCard: {
    backgroundColor: '#0F1816',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E2F2B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  accountCardSelected: {
    borderColor: '#2ED8A5',
    shadowColor: '#2ED8A5',
    shadowOpacity: 0.2,
  },
  accountCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00684F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  accountEmail: {
    color: '#A8B3AF',
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  removeAccountText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2ED8A5',
    marginTop: 8,
  },
  addAccountButtonText: {
    color: '#2ED8A5',
    fontSize: 16,
    fontWeight: '600',
  },
  authContainer: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0F1816',
    borderWidth: 1,
    borderColor: '#1E2F2B',
    borderRadius: 16,
    color: '#FFF',
    fontSize: 16,
    padding: 16,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#00684F',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#00684F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchAuthType: {
    alignItems: 'center',
    marginTop: 24,
  },
  switchAuthTypeText: {
    color: '#2ED8A5',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brandTitleLoading: {
    color: '#2ED8A5',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 6,
    marginBottom: 12,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  loadingSpinnerContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingSpinnerOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#2ED8A5',
    borderTopColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSpinnerInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0F1816',
    borderWidth: 2,
    borderColor: '#00684F',
  },
  secureConnectionText: {
    color: '#A8B3AF',
    fontSize: 12,
  },
  lockContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  scrollViewContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollViewContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  topNavigationRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: Platform.OS === 'ios' ? 64 : 55,
    marginBottom: 8,
  },
  backToAccountsButtonNonAbsolute: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backToAccountsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 60,
    left: 20,
  },
  backToAccountsText: {
    color: '#A8B3AF',
    marginLeft: 8,
    fontSize: 14,
  },
  progressDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#A8B3AF',
    backgroundColor: 'transparent',
    marginHorizontal: 8,
  },
  progressDotActive: {
    borderColor: '#2ED8A5',
    backgroundColor: '#2ED8A5',
  },
  progressDotError: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B',
  },
  liveNumberContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  liveNumberLabel: {
    color: '#A8B3AF',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  liveNumber: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '900',
  },
  liveNumberError: {
    color: '#FF6B6B',
  },
  dialWrapper: {
    borderRadius: 150,
    padding: 10,
    marginBottom: 30,
  },
  hintText: {
    color: '#A8B3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  hintTextError: {
    color: '#FF6B6B',
  },
  lockoutOverlay: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#1C1616',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginBottom: 30,
  },
  lockoutTitle: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  lockoutSubtitle: {
    color: '#A8B3AF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  biometricsShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  biometricsShortcutText: {
    color: '#2ED8A5',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  forgotButton: {
    marginTop: 12,
    marginBottom: 100,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  forgotButtonText: {
    color: '#A8B3AF',
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  miniDialContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 30,
  },
  miniPointer: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#2ED8A5',
  },
  miniDialOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#014134',
    borderWidth: 4,
    borderColor: '#022119',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2ED8A5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  miniDialInner: {
    width: 122,
    height: 122,
    borderRadius: 61,
    backgroundColor: '#111A18',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#00684F',
  },
  miniDialCenterCap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0A1211',
    borderWidth: 1.5,
    borderColor: '#014134',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  miniDialKnob: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C2E2A',
    borderWidth: 1,
    borderColor: '#2ED8A5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniDialRidge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0B0F10',
    borderWidth: 1,
    borderColor: '#014134',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 24,
    shadowColor: '#2ED8A5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
  },
  successBrand: {
    color: '#2ED8A5',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
  },
  successTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  successSubtitle: {
    color: '#A8B3AF',
    fontSize: 16,
  },
});
