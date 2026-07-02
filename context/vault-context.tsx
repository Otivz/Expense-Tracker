import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { sha256 } from '@/utils/hash';
import * as Haptics from 'expo-haptics';

export interface VaultAccount {
  id: string;
  name: string;
  email: string;
  lastActive: string;
  biometricsEnabled: boolean;
}

interface VaultContextType {
  accounts: VaultAccount[];
  currentAccount: VaultAccount | null;
  isUnlocked: boolean;
  needsComboSetup: boolean;
  failedAttempts: number;
  isLockedOut: boolean;
  lockoutRemaining: number;
  hasBiometricsSupport: boolean;
  biometryType: string;
  selectAccount: (account: VaultAccount | null) => void;
  unlockVault: (combination: number[]) => Promise<boolean>;
  verifyCombinationStep: (stepIndex: number, partialCombination: number[]) => Promise<boolean>;
  saveVaultCombination: (combination: number[]) => Promise<void>;
  addAccount: (user: { id: string; email: string; name: string }) => Promise<VaultAccount>;
  deleteAccount: (accountId: string) => Promise<void>;
  enableBiometrics: (accountId: string, enabled: boolean) => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  lockVault: () => void;
  clearAllVaultData: () => Promise<void>; // Utility for resetting
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

const ACCOUNTS_LIST_KEY = 'cvault_accounts_list';
const COMBINATION_PREFIX = 'cvault_combination_';
const LOCKOUT_LIMIT = 5;
const LOCKOUT_DURATION = 30; // seconds

// Secure Storage helpers with fallback for web
const getItemSecure = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.error('SecureStore Read Error:', e);
    return null;
  }
};

const setItemSecure = async (key: string, value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    console.error('SecureStore Write Error:', e);
  }
};

const deleteItemSecure = async (key: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    console.error('SecureStore Delete Error:', e);
  }
};

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<VaultAccount | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [needsComboSetup, setNeedsComboSetup] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Biometrics States
  const [hasBiometricsSupport, setHasBiometricsSupport] = useState(false);
  const [biometryType, setBiometryType] = useState('Fingerprint');

  // Load Accounts & Detect Biometrics on mount
  useEffect(() => {
    loadAccounts();
    checkBiometrics();
  }, []);

  // Handle lockout countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isLockedOut && lockoutRemaining > 0) {
      timer = setInterval(() => {
        setLockoutRemaining((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLockedOut, lockoutRemaining]);

  const loadAccounts = async () => {
    const raw = await getItemSecure(ACCOUNTS_LIST_KEY);
    if (raw) {
      try {
        const list = JSON.parse(raw) as VaultAccount[];
        // Sort by last active descending
        list.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
        setAccounts(list);
      } catch (e) {
        setAccounts([]);
      }
    }
  };

  const checkBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometricsSupport(hasHardware && isEnrolled);

      if (hasHardware) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometryType(Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition');
        } else {
          setBiometryType(Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint');
        }
      }
    } catch (e) {
      setHasBiometricsSupport(false);
    }
  };

  const selectAccount = async (account: VaultAccount | null) => {
    setCurrentAccount(account);
    setFailedAttempts(0);
    setIsLockedOut(false);
    
    if (account) {
      // Auto-set combination 10-20-30-40 for the demo account (ensure it is initialized every selection/redirect)
      if (account.id === 'demo-user-id') {
        const combination = [10, 20, 30, 40];
        const comboString = combination.join(',');
        const hash = sha256(comboString);
        await setItemSecure(`${COMBINATION_PREFIX}${account.id}`, hash);
        for (let i = 1; i <= 4; i++) {
          const subCombo = combination.slice(0, i).join(',');
          const stepHash = sha256(subCombo);
          await setItemSecure(`${COMBINATION_PREFIX}${account.id}_step_${i}`, stepHash);
        }
      }

      // Check if this account has a combination set up
      const comboHash = await getItemSecure(`${COMBINATION_PREFIX}${account.id}`);
      if (!comboHash) {
        setNeedsComboSetup(true);
      } else {
        setNeedsComboSetup(false);
      }
    } else {
      setNeedsComboSetup(false);
    }
  };

  const addAccount = async (user: { id: string; email: string; name: string }): Promise<VaultAccount> => {
    // Check if account already exists
    const existing = accounts.find((a) => a.id === user.id || a.email.toLowerCase() === user.email.toLowerCase());
    
    const nowStr = new Date().toISOString();
    let updatedAccount: VaultAccount;

    if (existing) {
      updatedAccount = {
        ...existing,
        name: user.name,
        lastActive: nowStr,
      };
    } else {
      updatedAccount = {
        id: user.id,
        name: user.name,
        email: user.email.toLowerCase(),
        lastActive: nowStr,
        biometricsEnabled: false,
      };
    }

    // Auto-set combination 10-20-30-40 for the demo account (ensure it is initialized every login)
    if (user.id === 'demo-user-id') {
      const combination = [10, 20, 30, 40];
      const comboString = combination.join(',');
      const hash = sha256(comboString);
      await setItemSecure(`${COMBINATION_PREFIX}${updatedAccount.id}`, hash);
      for (let i = 1; i <= 4; i++) {
        const subCombo = combination.slice(0, i).join(',');
        const stepHash = sha256(subCombo);
        await setItemSecure(`${COMBINATION_PREFIX}${updatedAccount.id}_step_${i}`, stepHash);
      }
    }

    const filteredList = accounts.filter((a) => a.id !== updatedAccount.id);
    const newList = [updatedAccount, ...filteredList];
    
    await setItemSecure(ACCOUNTS_LIST_KEY, JSON.stringify(newList));
    setAccounts(newList);
    setCurrentAccount(updatedAccount);

    // Check combination status
    const comboHash = await getItemSecure(`${COMBINATION_PREFIX}${updatedAccount.id}`);
    setNeedsComboSetup(!comboHash);

    return updatedAccount;
  };

  const deleteAccount = async (accountId: string) => {
    const newList = accounts.filter((a) => a.id !== accountId);
    await setItemSecure(ACCOUNTS_LIST_KEY, JSON.stringify(newList));
    await deleteItemSecure(`${COMBINATION_PREFIX}${accountId}`);
    setAccounts(newList);
    if (currentAccount?.id === accountId) {
      setCurrentAccount(null);
      setNeedsComboSetup(false);
    }
  };

  const enableBiometrics = async (accountId: string, enabled: boolean) => {
    const newList = accounts.map((a) => {
      if (a.id === accountId) {
        return { ...a, biometricsEnabled: enabled };
      }
      return a;
    });
    await setItemSecure(ACCOUNTS_LIST_KEY, JSON.stringify(newList));
    setAccounts(newList);
    if (currentAccount?.id === accountId) {
      setCurrentAccount({ ...currentAccount, biometricsEnabled: enabled });
    }
  };

  const saveVaultCombination = async (combination: number[]) => {
    if (!currentAccount) throw new Error('No account selected.');
    
    // Hash the combination array
    const comboString = combination.join(',');
    const hash = sha256(comboString);
    
    await setItemSecure(`${COMBINATION_PREFIX}${currentAccount.id}`, hash);
    
    // Save progressive hashes for step-by-step validation
    for (let i = 1; i <= 4; i++) {
      const subCombo = combination.slice(0, i).join(',');
      const stepHash = sha256(subCombo);
      await setItemSecure(`${COMBINATION_PREFIX}${currentAccount.id}_step_${i}`, stepHash);
    }
    
    setNeedsComboSetup(false);
  };

  const verifyCombinationStep = async (stepIndex: number, partialCombination: number[]): Promise<boolean> => {
    if (!currentAccount) return false;
    
    const partialString = partialCombination.join(',');
    const hash = sha256(partialString);
    
    const storedStepHash = await getItemSecure(`${COMBINATION_PREFIX}${currentAccount.id}_step_${stepIndex}`);
    return storedStepHash === hash;
  };

  const unlockVault = async (combination: number[]): Promise<boolean> => {
    if (!currentAccount) return false;
    if (isLockedOut) return false;

    const comboString = combination.join(',');
    const hash = sha256(comboString);
    
    const storedHash = await getItemSecure(`${COMBINATION_PREFIX}${currentAccount.id}`);
    
    if (storedHash === hash) {
      // Success!
      setFailedAttempts(0);
      setIsUnlocked(true);
      
      // Update last active
      const nowStr = new Date().toISOString();
      const newList = accounts.map((a) => {
        if (a.id === currentAccount.id) {
          return { ...a, lastActive: nowStr };
        }
        return a;
      });
      await setItemSecure(ACCOUNTS_LIST_KEY, JSON.stringify(newList));
      setAccounts(newList);
      setCurrentAccount({ ...currentAccount, lastActive: nowStr });
      return true;
    } else {
      // Fail
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      
      if (newAttempts >= LOCKOUT_LIMIT) {
        setIsLockedOut(true);
        setLockoutRemaining(LOCKOUT_DURATION);
      }
      
      // Trigger error haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
  };

  const unlockWithBiometrics = async (): Promise<boolean> => {
    if (!currentAccount) return false;
    if (!currentAccount.biometricsEnabled || !hasBiometricsSupport) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Unlock vault for ${currentAccount.name}`,
        fallbackLabel: 'Enter Combination',
        disableDeviceFallback: true,
      });

      if (result.success) {
        setFailedAttempts(0);
        setIsUnlocked(true);
        
        // Update last active time
        const nowStr = new Date().toISOString();
        const newList = accounts.map((a) => {
          if (a.id === currentAccount.id) {
            return { ...a, lastActive: nowStr };
          }
          return a;
        });
        await setItemSecure(ACCOUNTS_LIST_KEY, JSON.stringify(newList));
        setAccounts(newList);
        setCurrentAccount({ ...currentAccount, lastActive: nowStr });
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return true;
      }
    } catch (e) {
      console.error('Biometric Auth Error:', e);
    }
    return false;
  };

  const lockVault = () => {
    setIsUnlocked(false);
    // Keep current account selected or reset depending on flow (we keep it so they can unlock quickly)
  };

  const clearAllVaultData = async () => {
    // Clear list
    await deleteItemSecure(ACCOUNTS_LIST_KEY);
    // Clear individual combos
    for (const a of accounts) {
      await deleteItemSecure(`${COMBINATION_PREFIX}${a.id}`);
      for (let i = 1; i <= 4; i++) {
        await deleteItemSecure(`${COMBINATION_PREFIX}${a.id}_step_${i}`);
      }
    }
    setAccounts([]);
    setCurrentAccount(null);
    setIsUnlocked(false);
    setNeedsComboSetup(false);
    setFailedAttempts(0);
    setIsLockedOut(false);
  };

  return (
    <VaultContext.Provider
      value={{
        accounts,
        currentAccount,
        isUnlocked,
        needsComboSetup,
        failedAttempts,
        isLockedOut,
        lockoutRemaining,
        hasBiometricsSupport,
        biometryType,
        selectAccount,
        unlockVault,
        verifyCombinationStep,
        saveVaultCombination,
        addAccount,
        deleteAccount,
        enableBiometrics,
        unlockWithBiometrics,
        lockVault,
        clearAllVaultData,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) throw new Error('useVault must be used within a VaultProvider');
  return context;
};
