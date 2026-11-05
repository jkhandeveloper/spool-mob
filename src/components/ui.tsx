import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useFontScale, useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------- Typography ----------

type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label';

const SIZES: Record<TextVariant, { size: number; weight: TextStyle['fontWeight']; line: number }> = {
  display: { size: 32, weight: '800', line: 38 },
  title: { size: 26, weight: '800', line: 32 },
  heading: { size: 19, weight: '700', line: 25 },
  body: { size: 16, weight: '400', line: 23 },
  bodyStrong: { size: 16, weight: '700', line: 23 },
  caption: { size: 13, weight: '400', line: 18 },
  label: { size: 12, weight: '600', line: 16 },
};

export function T({
  variant = 'body',
  muted,
  center,
  style,
  children,
  ...rest
}: {
  variant?: TextVariant;
  muted?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
} & Omit<ComponentProps<typeof Text>, 'style'>) {
  const c = useTheme();
  const scale = useFontScale();
  const s = SIZES[variant];
  return (
    <Text
      {...rest}
      accessibilityRole={variant === 'title' || variant === 'display' ? 'header' : rest.accessibilityRole}
      style={[
        {
          color: muted ? c.textSecondary : c.text,
          fontSize: s.size * scale,
          lineHeight: s.line * scale,
          fontWeight: s.weight,
          textAlign: center ? 'center' : undefined,
          letterSpacing: variant === 'label' ? 0.6 : undefined,
          textTransform: variant === 'label' ? 'uppercase' : undefined,
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

/** The "Spool" wordmark shown at the top of every screen in the mockups. */
export function Wordmark({ onBack }: { onBack?: () => void }) {
  const c = useTheme();
  return (
    <View style={styles.wordmarkRow}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
      ) : null}
      <Text
        accessibilityRole="header"
        style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>
        Spool
      </Text>
    </View>
  );
}

// ---------- Layout ----------

export function Screen({
  children,
  scroll = true,
  back,
  footer,
  refreshing,
  onRefresh,
  edges = ['top', 'left', 'right'],
}: {
  children: ReactNode;
  scroll?: boolean;
  /** true = router.back(); a function = custom back action. */
  back?: boolean | (() => void);
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
}) {
  const c = useTheme();
  const onBack = back === true ? () => router.back() : back || undefined;
  const content = (
    <View style={styles.content}>
      <Wordmark onBack={onBack} />
      {children}
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={edges}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: Spacing.xl }}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.text} /> : undefined
            }>
            {content}
          </ScrollView>
        ) : (
          content
        )}
        {footer ? <View style={[styles.footer, { backgroundColor: c.background }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Gap({ size = Spacing.md }: { size?: number }) {
  return <View style={{ height: size }} />;
}

export function Divider() {
  const c = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: Spacing.lg }} />;
}

export function Section({ title, subtitle, children, action }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <View style={{ marginTop: Spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T variant="heading">{title}</T>
          {subtitle ? <T variant="caption" muted>{subtitle}</T> : null}
        </View>
        {action}
      </View>
      <Gap size={Spacing.sm} />
      {children}
    </View>
  );
}

// ---------- Cards & rows ----------

export function Card({
  children,
  onPress,
  inverted,
  muted,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  inverted?: boolean;
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const c = useTheme();
  const base: ViewStyle = {
    borderRadius: Radius.md,
    borderWidth: inverted || muted ? 0 : 1,
    borderColor: c.border,
    backgroundColor: inverted ? c.primary : muted ? c.surface : c.background,
    padding: Spacing.lg,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, { opacity: pressed ? 0.75 : 1 }, style]}>
      {children}
    </Pressable>
  );
}

/** A tappable list row with optional icon, subtitle and chevron (e.g. "Therapy appointment >"). */
export function ListRow({
  icon,
  title,
  subtitle,
  eyebrow,
  onPress,
  right,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string | null;
  eyebrow?: string;
  onPress?: () => void;
  right?: ReactNode;
}) {
  const c = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={[eyebrow, title, subtitle].filter(Boolean).join(', ')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        {icon ? <Ionicons name={icon} size={24} color={c.text} /> : null}
        <View style={{ flex: 1 }}>
          {eyebrow ? <T variant="label" muted>{eyebrow}</T> : null}
          <T variant="bodyStrong">{title}</T>
          {subtitle ? <T variant="caption" muted numberOfLines={3}>{subtitle}</T> : null}
        </View>
        {right ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={c.textSecondary} /> : null)}
      </View>
    </Card>
  );
}

export function Stack({ children, gap = Spacing.md }: { children: ReactNode; gap?: number }) {
  return <View style={{ gap }}>{children}</View>;
}

// ---------- Controls ----------

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const c = useTheme();
  const scale = useFontScale();
  const isDisabled = disabled || loading;
  const bg =
    variant === 'primary' ? c.primary : variant === 'danger' ? c.danger : variant === 'secondary' ? c.background : 'transparent';
  const fg = variant === 'primary' ? c.onPrimary : variant === 'danger' ? '#FFFFFF' : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: variant === 'secondary' ? c.text : 'transparent',
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          opacity: isDisabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
          <Text style={{ color: fg, fontSize: 16 * scale, fontWeight: '700' }}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  hint,
  multiline,
  style,
  ...input
}: TextInputProps & { label?: string; error?: string | null; hint?: string }) {
  const c = useTheme();
  const scale = useFontScale();
  return (
    <View style={{ gap: Spacing.xs }}>
      {label ? <T variant="bodyStrong">{label}</T> : null}
      <TextInput
        placeholderTextColor={c.textSecondary}
        accessibilityLabel={label ?? input.placeholder}
        multiline={multiline}
        {...input}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? c.danger : c.border,
            borderRadius: Radius.sm,
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.md,
            fontSize: 16 * scale,
            color: c.text,
            backgroundColor: c.background,
            minHeight: multiline ? 140 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
      />
      {error ? <T variant="caption" style={{ color: c.danger }}>{error}</T> : hint ? <T variant="caption" muted>{hint}</T> : null}
    </View>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: c.text,
          backgroundColor: checked ? c.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {checked ? <Ionicons name="checkmark" size={18} color={c.onPrimary} /> : null}
      </View>
      <T style={{ flex: 1 }}>{label}</T>
    </Pressable>
  );
}

export function ToggleRow({ label, value, onChange, hint }: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm }}>
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong">{label}</T>
        {hint ? <T variant="caption" muted>{hint}</T> : null}
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      style={{
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: selected ? c.primary : c.border,
        backgroundColor: selected ? c.primary : c.background,
      }}>
      <T variant="caption" style={{ color: selected ? c.onPrimary : c.text, fontWeight: '600' }}>{label}</T>
    </Pressable>
  );
}

// ---------- States (P10) ----------

export function Loading({ label = 'Loading' }: { label?: string }) {
  const c = useTheme();
  return (
    <View style={styles.center} accessible accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator color={c.text} />
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const c = useTheme();
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <View style={[styles.center, { gap: Spacing.md }]} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={36} color={c.textSecondary} />
      <T center muted>{message}</T>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function InlineError({ message }: { message?: string | null }) {
  const c = useTheme();
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ backgroundColor: c.dangerSurface, borderRadius: Radius.sm, padding: Spacing.md }}>
      <T variant="caption" style={{ color: c.danger }}>{message}</T>
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  const c = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm }}>
      <Ionicons name={icon} size={40} color={c.textSecondary} />
      <T variant="heading" center>{title}</T>
      {body ? <T center muted>{body}</T> : null}
      {action ? <View style={{ marginTop: Spacing.md, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function OrDivider() {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.lg }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      <T variant="caption" muted>or</T>
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
  },
  wordmarkRow: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  back: { position: 'absolute', left: -6, padding: 4 },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  button: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, minHeight: 200 },
});
