import React, { Component, ErrorInfo, ReactNode, createContext, useContext, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Context to allow child components to report successful database connection
const DatabaseResetContext = createContext<(() => void) | null>(null);

/**
 * Component to place inside SQLiteProvider to notify the boundary that the DB connection is active and stable.
 */
export function DatabaseSuccessTracker() {
  const reset = useContext(DatabaseResetContext);
  useEffect(() => {
    if (reset) {
      reset();
    }
  }, [reset]);
  return null;
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class DatabaseErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
  };

  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DatabaseErrorBoundary caught an error:', error, errorInfo);
    
    const errorMsg = error.message || '';
    const isLockError = 
      errorMsg.includes('createSyncAccessHandle') || 
      errorMsg.includes('NoModificationAllowedError') || 
      errorMsg.includes('Access Handles cannot be created');

    // Auto-retry on locking/concurrency errors up to 3 times
    if (isLockError && this.state.retryCount < 3) {
      const nextAttempt = this.state.retryCount + 1;
      console.log(`Database is locked. Retrying connection in 2000ms... (Attempt ${nextAttempt}/3)`);
      
      this.retryTimer = setTimeout(() => {
        this.setState({
          hasError: false,
          error: null,
          retryCount: nextAttempt,
        });
      }, 2000);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  private resetRetryCount = () => {
    if (this.state.retryCount > 0) {
      console.log('Database connected successfully. Resetting retry count.');
      this.setState({ retryCount: 0 });
    }
  };

  private handleReload = () => {
    if (Platform.OS === 'web') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || '';
      const isLockError = 
        errorMsg.includes('createSyncAccessHandle') || 
        errorMsg.includes('NoModificationAllowedError') || 
        errorMsg.includes('Access Handles cannot be created');

      const isRetrying = isLockError && this.state.retryCount < 3;

      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              {isRetrying ? (
                <ActivityIndicator size="large" color="#00684F" />
              ) : (
                <Ionicons 
                  name={isLockError ? "lock-closed-outline" : "alert-circle-outline"} 
                  size={48} 
                  color={isLockError ? "#FFA216" : "#FF6B6B"} 
                />
              )}
            </View>
            <Text style={styles.title}>
              {isRetrying 
                ? `Reconnecting to Database...` 
                : (isLockError ? "Database Connection Locked" : "Database Error")}
            </Text>
            <Text style={styles.description}>
              {isRetrying
                ? `Attempting to automatically release file lock and reconnect. Please wait (Attempt ${this.state.retryCount + 1}/3)...`
                : isLockError 
                  ? "The application's local database is currently locked by another tab or an active connection from a previous reload.\n\nOn web browsers, SQLite (OPFS) permits only one active connection. Please close other open tabs of this app or click below to reload."
                  : "An unexpected error occurred while initializing the database."}
            </Text>
            
            {!isRetrying && Platform.OS === 'web' && (
              <TouchableOpacity style={styles.button} onPress={this.handleReload} activeOpacity={0.8}>
                <Ionicons name="refresh" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Reload App</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.technicalTitle}>Technical Details</Text>
            <View style={styles.technicalCard}>
              <ScrollView style={styles.technicalScroll} nestedScrollEnabled>
                <Text style={styles.technicalText}>{errorMsg || 'No error details available.'}</Text>
              </ScrollView>
            </View>
          </View>
        </View>
      );
    }

    return (
      <DatabaseResetContext.Provider value={this.resetRetryCount}>
        {this.props.children}
      </DatabaseResetContext.Provider>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAF8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9FBFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8ECEB',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C2A27',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7B77',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00684F',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  technicalTitle: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: '#8A9A96',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  technicalCard: {
    width: '100%',
    backgroundColor: '#F9FBFB',
    borderColor: '#E8ECEB',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    maxHeight: 120,
  },
  technicalScroll: {
    flexGrow: 0,
  },
  technicalText: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontSize: 11,
    color: '#A30000',
    lineHeight: 16,
  },
});
