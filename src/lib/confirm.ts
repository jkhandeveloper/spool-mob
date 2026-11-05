import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog. React Native Web's Alert.alert is a
 * no-op, so fall back to window.confirm there.
 */
export function confirm({
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  destructive = true,
  onConfirm,
}: {
  title: string;
  message?: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(message ? `${title}\n\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
