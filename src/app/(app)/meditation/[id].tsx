import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useQuery } from '@tanstack/react-query';
import { useScreenAwake } from '@/hooks/use-screen-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, ErrorState, Gap, Loading, Screen, T } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/format';

// P3 Meditation player: play/pause, progress, duration, completion, return to Today
export default function MeditationPlayer() {
  useScreenAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const q = useQuery({ queryKey: ['meditation', id], queryFn: () => api.meditations.get(id), staleTime: Infinity });
  const [playRequested, setPlaying] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const audioStatus = useAudioPlayerStatus(player);

  const total = q.data?.durationSeconds ?? 0;
  const audioDone =
    audioLoaded &&
    audioStatus.isLoaded &&
    (audioStatus.didJustFinish ||
      (audioStatus.duration > 0 &&
        !audioStatus.playing &&
        audioStatus.currentTime >= audioStatus.duration - 0.1));
  const elapsed =
    audioLoaded && audioStatus.isLoaded
      ? audioDone
        ? total
        : Math.floor(audioStatus.currentTime)
      : timerElapsed;
  const done = total > 0 && elapsed >= total;
  const playing = playRequested && !done;

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  const togglePlayback = async () => {
    if (audioLoading) return;

    if (audioLoaded) {
      if (playing) {
        player.pause();
        setPlaying(false);
      } else {
        player.play();
        setPlaying(true);
      }
      return;
    }

    if (!playRequested) {
      setAudioLoading(true);
      setAudioError(null);
      try {
        const audio = await api.meditations.audio(id);
        player.replace({ uri: `data:${audio.mimeType};base64,${audio.audioBase64}` });
        player.play();
        setAudioLoaded(true);
        setPlaying(true);
      } catch (error) {
        setAudioError(error instanceof Error ? error.message : 'Guided audio is unavailable.');
        setPlaying(true);
      } finally {
        setAudioLoading(false);
      }
    } else {
      setPlaying((p) => !p);
    }
  };

  useEffect(() => {
    if (!playing || audioLoaded) return;
    const t = setInterval(() => setTimerElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [audioLoaded, playing]);

  const startAgain = async () => {
    setTimerElapsed(0);
    if (audioLoaded) {
      await player.seekTo(0);
      player.play();
    }
    setPlaying(true);
  };

  const close = () => router.back();

  if (q.isPending) return <Screen back={close}><Loading /></Screen>;
  if (q.isError) return <Screen back={close}><ErrorState error={q.error} onRetry={() => q.refetch()} /></Screen>;
  const m = q.data;
  const cue = [...m.steps].reverse().find((s) => s.at <= elapsed) ?? m.steps[0];
  const progress = total ? Math.min(1, elapsed / total) : 0;

  if (done) {
    return (
      <Screen back={close} footer={<Button title="Back to Today" onPress={() => router.dismissTo('/')} />}>
        <View style={{ alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md }}>
          <Ionicons name="leaf-outline" size={56} color={c.text} />
          <T variant="title" center>Well done</T>
          <T center muted>You took {Math.round(total / 60)} minutes for yourself. Carry that calm with you.</T>
        </View>
        <Button title="Start again" variant="ghost" onPress={() => void startAgain()} />
      </Screen>
    );
  }

  return (
    <Screen back={close} scroll={false}>
      <T variant="title" center>{m.title}</T>
      <T center muted>{m.subtitle}</T>
      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: Spacing.xl }}>
        <T variant="heading" center accessibilityLiveRegion="polite" style={{ fontWeight: '500' }}>
          {playing || elapsed > 0 ? cue.text : 'Find a quiet spot. Press play when you are ready.'}
        </T>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: elapsed, text: `${formatDuration(elapsed)} of ${formatDuration(total)}` }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface, overflow: 'hidden' }}>
          <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: c.text }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs }}>
          <T variant="caption" muted>{formatDuration(elapsed)}</T>
          <T variant="caption" muted>{formatDuration(total)}</T>
        </View>
      </View>
      <Gap size={Spacing.xl} />
      <View style={{ alignItems: 'center', paddingBottom: Spacing.xxl }}>
        <Pressable
          onPress={() => void togglePlayback()}
          accessibilityRole="button"
          accessibilityLabel={audioLoading ? 'Loading guided audio' : playing ? 'Pause' : 'Play'}
          style={({ pressed }) => ({
            width: 76,
            height: 76,
            borderRadius: Radius.pill,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
          })}>
          <Ionicons name={audioLoading ? 'hourglass-outline' : playing ? 'pause' : 'play'} size={32} color={c.onPrimary} />
        </Pressable>
        {audioError ? <T variant="caption" muted center style={{ marginTop: Spacing.sm }}>{audioError} Using the written timer instead.</T> : null}
      </View>
    </Screen>
  );
}
