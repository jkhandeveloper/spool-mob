import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useScreenAwake } from '@/hooks/use-screen-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { Button, Card, Field, Gap, InlineError, Screen, Stack, T } from '@/components/ui';
import { Waveform } from '@/components/waveform';
import { Radius, Spacing } from '@/constants/theme';
import { useRecorder } from '@/hooks/use-recorder';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { formatDuration } from '@/lib/format';
import { sessionStore } from '@/lib/session-store';

// 03 Live session, plus P5 recording states (permission denied, paused,
// interrupted, typed-notes fallback when on-device transcription isn't available).
export default function LiveSession() {
  useScreenAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const qc = useQueryClient();
  const rec = useRecorder();
  const prompts = sessionStore.getPrompts(id);
  const [typedNotes, setTypedNotes] = useState('');
  const [typedStartedAt] = useState(() => Date.now());
  const [ending, setEnding] = useState(false);
  const leaving = useRef(false);

  const discard = () =>
    confirm({
      title: 'Stop and discard?',
      message: 'Nothing from this session will be kept.',
      confirmText: 'Discard',
      cancelText: 'Keep going',
      onConfirm: async () => {
        leaving.current = true;
        rec.discard();
        sessionStore.clear(id);
        await api.sessions.remove(id).catch(() => undefined);
        qc.invalidateQueries({ queryKey: ['sessions'] });
        router.back();
      },
    });

  // Android back button: confirm instead of silently leaving a live session.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (leaving.current) return false;
      discard();
      return true;
    });
    return () => sub.remove();
  });

  const end = async () => {
    setEnding(true);
    const typed = rec.state === 'unsupported' || rec.state === 'denied';
    const transcript = typed ? typedNotes.trim() : await rec.finish();
    const durationSeconds = typed ? Math.round((Date.now() - typedStartedAt) / 1000) : rec.elapsed;
    sessionStore.stash(id, { transcript, durationSeconds });
    leaving.current = true;
    router.replace({ pathname: '/session/[id]/processing', params: { id } });
  };

  const typedMode = rec.state === 'unsupported' || rec.state === 'denied';
  const listening = rec.state === 'listening';

  return (
    <Screen
      footer={
        <>
          <Button
            title="End session"
            onPress={end}
            loading={ending}
            disabled={typedMode ? !typedNotes.trim() : rec.state === 'starting'}
          />
          <Button title="Stop and discard" variant="ghost" onPress={discard} disabled={ending} />
        </>
      }>
      <T variant="title">Your session</T>
      {!typedMode ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }} accessibilityLiveRegion="polite">
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: listening ? c.danger : c.textSecondary }} />
          <T variant="caption">
            {listening ? 'Listening' : rec.state === 'starting' ? 'Getting ready' : rec.state === 'interrupted' ? 'Interrupted' : 'Paused'}
            {' · '}
            {formatDuration(rec.elapsed)}
          </T>
        </View>
      ) : null}
      <Gap />

      {!typedMode ? (
        <T center>
          <T style={{ fontWeight: '800' }}>Take your time.</T> {listening ? "I'm listening." : 'Tap resume when you are ready.'}
        </T>
      ) : null}
      <Gap />

      {prompts.length ? (
        <Card>
          <T variant="heading">Discussion prompts</T>
          <T variant="caption" muted>From your journal this week</T>
          <Gap size={Spacing.sm} />
          <Stack gap={Spacing.xs}>
            {prompts.map((p) => (
              <View key={p} style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <T>•</T>
                <T style={{ flex: 1 }}>{p}</T>
              </View>
            ))}
          </Stack>
        </Card>
      ) : null}
      <Gap size={Spacing.xl} />

      {rec.state === 'denied' ? (
        <Card muted>
          <T variant="bodyStrong">Microphone access is off</T>
          <T variant="caption" muted>
            To transcribe your session, allow Microphone and Speech Recognition for Spool in Settings. Or write your own
            notes below and Spool will summarize them.
          </T>
          <Gap size={Spacing.sm} />
          <Button title="Open Settings" variant="secondary" onPress={rec.openSettings} />
        </Card>
      ) : null}

      {rec.state === 'unsupported' ? (
        <Card muted>
          <T variant="bodyStrong">On-device transcription isn't available</T>
          <T variant="caption" muted>
            {rec.errorMessage ??
              "Spool only transcribes on your phone so audio never leaves it, and this device (or Expo Go) doesn't support that."}{' '}
            Write notes about the session instead and Spool will summarize them.
          </T>
        </Card>
      ) : null}

      {typedMode ? (
        <>
          <Gap />
          <Field
            label="Session notes"
            value={typedNotes}
            onChangeText={setTypedNotes}
            multiline
            placeholder="What did you talk about? What felt important?"
            style={{ minHeight: 180 }}
          />
        </>
      ) : (
        <>
          <Waveform levels={rec.levels} active={listening} />
          {rec.interim ? (
            <T variant="caption" muted center numberOfLines={2} style={{ marginTop: Spacing.sm }}>
              {rec.interim}
            </T>
          ) : null}
          <Gap />
          <InlineError
            message={
              rec.state === 'interrupted'
                ? (rec.errorMessage ?? 'Listening was interrupted (for example by a call). Everything so far is kept.')
                : null
            }
          />
          <View style={{ alignItems: 'center', marginTop: Spacing.md }}>
            <Pressable
              onPress={listening ? rec.pause : rec.resume}
              disabled={rec.state === 'starting' || ending}
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Pause' : 'Resume'}
              style={({ pressed }) => ({
                width: 64,
                height: 64,
                borderRadius: Radius.pill,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}>
              <Ionicons name={listening ? 'pause' : 'play'} size={28} color={c.text} />
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}
