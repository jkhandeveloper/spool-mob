import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { MeditationScript } from '@/components/meditation-script';
import { Button, ErrorState, Gap, Loading, Screen, T } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useScreenAwake } from '@/hooks/use-screen-awake';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/format';
import type { Meditation, MeditationAudio } from '@/lib/types';

/** Index of the last cue whose start time has been reached. */
function cueAt(cueStarts: number[], elapsed: number): number {
  let index = 0;
  cueStarts.forEach((at, i) => {
    if (at <= elapsed) index = i;
  });
  return index;
}

// P3 Meditation player: one continuous narrated track (voice + silences mixed by
// the API and played from a local file), synced written cues, progress and completion.
export default function MeditationPlayer() {
  useScreenAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const q = useQuery({
    queryKey: ['meditation', id],
    queryFn: () => api.meditations.get(id),
    staleTime: Infinity,
  });
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [audio, setAudio] = useState<MeditationAudio | null>(null);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [fallbackPlaying, setFallbackPlaying] = useState(false);
  const [fallbackElapsed, setFallbackElapsed] = useState(0);

  const m = q.data;
  const audioLoaded = audio !== null;
  const total = Math.ceil(Math.max(m?.durationSeconds ?? 0, audio?.durationSeconds ?? 0));
  const elapsed = Math.min(
    total,
    Math.floor(audioLoaded ? status.currentTime : fallbackElapsed),
  );
  const playing = audioLoaded ? status.playing : fallbackPlaying;
  const done = completed || (started && total > 0 && elapsed >= total);

  const cueStarts = useMemo(
    () => audio?.cues.map((cue) => cue.at) ?? m?.steps.map((step) => step.at) ?? [],
    [audio, m],
  );
  // Exact audio position drives the script, so it moves and stops with the voice.
  const position = audioLoaded ? status.currentTime : elapsed;
  const cueIndex = cueAt(cueStarts, position);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    return () => {
      player.pause();
      player.setActiveForLockScreen(false);
    };
  }, [player]);

  useEffect(() => {
    if (!fallbackPlaying || audioLoaded || !total) return;
    const timer = setInterval(() => {
      setFallbackElapsed((current) => {
        const next = Math.min(total, current + 1);
        if (next >= total) {
          setFallbackPlaying(false);
          setCompleted(true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [audioLoaded, fallbackPlaying, total]);

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (update) => {
      if (audioLoaded && update.didJustFinish) {
        setCompleted(true);
        player.setActiveForLockScreen(false);
      }
    });
    return () => subscription.remove();
  }, [audioLoaded, player]);

  const playFromStart = async (meditation: Meditation) => {
    await player.seekTo(0);
    player.setActiveForLockScreen(true, {
      title: meditation.title,
      artist: 'Spool',
      albumTitle: 'Guided meditation',
    });
    player.play();
  };

  const togglePlayback = async () => {
    if (audioLoading || !m) return;

    if (audioLoaded) {
      if (status.playing) player.pause();
      else player.play();
      return;
    }

    if (audioError) {
      setStarted(true);
      setFallbackPlaying((current) => !current);
      return;
    }

    setAudioLoading(true);
    setAudioError(null);
    try {
      const info = await api.meditations.audio(id);
      if (!info.cues.length) throw new Error('Guided audio is empty.');
      // Play the whole session from one local file so nothing buffers mid-way.
      const file = await api.meditations.audioFile(id, info.version);
      player.replace({ uri: file.uri });
      setAudio(info);
      setStarted(true);
      setCompleted(false);
      await playFromStart(m);
    } catch (error) {
      setAudio(null);
      setAudioError(error instanceof Error ? error.message : 'Guided audio is unavailable.');
      setStarted(true);
      setFallbackPlaying(true);
    } finally {
      setAudioLoading(false);
    }
  };

  const startAgain = async () => {
    setCompleted(false);
    setStarted(true);
    if (audioLoaded && m) {
      await playFromStart(m);
    } else {
      setFallbackElapsed(0);
      setFallbackPlaying(true);
    }
  };

  const close = () => {
    player.pause();
    player.setActiveForLockScreen(false);
    router.back();
  };

  if (q.isPending) return <Screen back={close}><Loading /></Screen>;
  if (q.isError) {
    return <Screen back={close}><ErrorState error={q.error} onRetry={() => q.refetch()} /></Screen>;
  }
  if (!m) return <Screen back={close}><Loading /></Screen>;

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
      <MeditationScript
        steps={m.steps}
        cues={audio?.cues ?? null}
        position={position}
        activeIndex={cueIndex}
        started={started}
      />
      <T variant="caption" muted center style={{ marginVertical: Spacing.sm }}>
        {audioLoading
          ? 'Preparing the complete guided audio…'
          : started && !playing
            ? 'Paused'
            : audioLoaded && status.isBuffering
              ? 'Loading…'
              : ' '}
      </T>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: total,
          now: elapsed,
          text: `${formatDuration(elapsed)} of ${formatDuration(total)}`,
        }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface, overflow: 'hidden' }}>
          <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: c.text }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs }}>
          <T variant="caption" muted>{formatDuration(elapsed)}</T>
          <T variant="caption" muted>{formatDuration(total)}</T>
        </View>
      </View>
      <Gap size={Spacing.lg} />
      <View style={{ alignItems: 'center', paddingBottom: Spacing.xxl }}>
        <Pressable
          onPress={() => void togglePlayback()}
          accessibilityRole="button"
          accessibilityLabel={audioLoading ? 'Preparing complete guided audio' : playing ? 'Pause' : 'Play'}
          style={({ pressed }) => ({
            width: 76,
            height: 76,
            borderRadius: Radius.pill,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed || audioLoading ? 0.8 : 1,
          })}>
          <Ionicons name={audioLoading ? 'hourglass-outline' : playing ? 'pause' : 'play'} size={32} color={c.onPrimary} />
        </Pressable>
        {audioError ? (
          <T variant="caption" muted center style={{ marginTop: Spacing.sm }}>
            {audioError} Using the synced written guide instead.
          </T>
        ) : null}
      </View>
    </Screen>
  );
}
