import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set up the foreground notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const REMINDER_IDENTIFIER = 'cvault_daily_expense_reminder';

/**
 * Checks if the app has notification permissions.
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
}

/**
 * Requests notification permissions.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    // On Android, we need to create a default channel for local notifications
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00684F',
      });
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedules a daily recurring notification.
 * @param hour Hour of the day (0-23)
 * @param minute Minute of the hour (0-59)
 */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<string | null> {
  try {
    // First, cancel any existing daily reminder to prevent duplicate schedules
    await cancelDailyReminder();

    // Verify permissions first
    let hasPermission = await checkNotificationPermissions();
    if (!hasPermission) {
      hasPermission = await requestNotificationPermissions();
    }

    if (!hasPermission) {
      console.warn('Cannot schedule reminder: Notification permissions not granted.');
      return null;
    }

    // Schedule the new daily notification
    const identifier = await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_IDENTIFIER,
      content: {
        title: 'C-Vault Reminder ⏰',
        body: "Don't forget to record your expenses today to keep your budget on track!",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    console.log(`Daily reminder scheduled successfully for ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    return identifier;
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    return null;
  }
}

/**
 * Cancels the daily reminder notification.
 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
    console.log('Daily reminder cancelled successfully');
  } catch (error) {
    console.error('Error cancelling daily reminder:', error);
  }
}

/**
 * Checks all currently scheduled notifications (helper for verification).
 */
export async function getScheduledNotifications() {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Triggers a local push notification immediately.
 */
export async function sendLocalNotification(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // trigger immediately
    });
  } catch (error) {
    console.error('Error sending local notification:', error);
  }
}
