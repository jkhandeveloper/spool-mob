import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlaylist, useAudioPlaylistStatus } from 'expo-audio';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, ErrorState, Gap, Loading, Screen, T } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useScreenAwake } from '@/hooks/use-screen-awake';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/format';
import type { Meditation, MeditationAudio } from '@/lib/types';

interface TimedTrack {
  uri: string;
  startsAt: number;
  duration: number;
  cueIndex: number;
}

const audioUri = (mimeType: string, audioBase64: string) =>
  `data:${mimeType};base64,${audioBase64}`;

/**
 * Builds one continuous playlist. Spoken cues start at their written cue times;
 * reusable silent WAV tracks fill the breathing/reflection time between them.
 */
function buildTimedTracks(meditation: Meditation, audio: MeditationAudio): TimedTrack[] {
  const tracks: TimedTrack[] = [];
  const fiveSeconds = audioUri(audio.silence.mimeType, audio.silence.fiveSecondBase64);
  const oneSecond = audioUri(audio.silence.mimeType, audio.silence.oneSecondBase64);
  const quarterSecond = audioUri(audio.silence.mimeType, audio.silence.quarterSecondBase64);
  let timeline = 0;

  const addTrack = (uri: string, duration: number, cueIndex: number) => {
    tracks.push({ uri, startsAt: timeline, duration, cueIndex });
    timeline += duration;
  };

  const addSilenceUntil = (target: number, cueIndex: number) => {
    let quarters = Math.max(0, Math.round((target - timeline) * 4));
    while (quarters >= 20) {
      addTrack(fiveSeconds, 5, cueIndex);
      quarters -= 20;
    }
    while (quarters >= 4) {
      addTrack(oneSecond, 1, cueIndex);
      quarters -= 4;
    }
    while (quarters > 0) {
      addTrack(quarterSecond, 0.25, cueIndex);
      quarters -= 1;
    }
  };

  audio.segments.forEach((segment, index) => {
    addSilenceUntil(segment.at, Math.max(0, index - 1));
    addTrack(
      audioUri(segment.mimeType, segment.audioBase64),
      segment.durationSeconds,
      Math.min(index, meditation.steps.length - 1),
    );
  });

  addSilenceUntil(meditation.durationSeconds, Math.max(0, meditation.steps.length - 1));
  return tracks;
}

// P3 Meditation player: timed narration, synced written cues, progress and completion.
export default function MeditationPlayer() {
  useScreenAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const q = useQuery({
    queryKey: ['meditation', id],
    queryFn: () => api.meditations.get(id),
    staleTime: Infinity,
  });
  const playlist = useAudioPlaylist({ sources: [], loop: 'none', updateInterval: 250 });
  const playlistStatus = useAudioPlaylistStatus(playlist);
  const [tracks, setTracks] = useState<TimedTrack[]>([]);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [fallbackPlaying, setFallbackPlaying] = useState(false);
  const [fallbackElapsed, setFallbackElapsed] = useState(0);

  const m = q.data;
  const activeTrack = tracks[playlistStatus.currentIndex];
  const playlistElapsed = activeTrack
    ? activeTrack.startsAt + Math.min(playlistStatus.currentTime, activeTrack.duration)
    : 0;
  const trackTotal = tracks.length
    ? tracks[tracks.length - 1].startsAt + tracks[tracks.length - 1].duration
    : 0;
  const total = Math.max(m?.durationSeconds ?? 0, Math.ceil(trackTotal));
  const elapsed = Math.min(
    total,
    Math.floor(audioLoaded ? playlistElapsed : fallbackElapsed),
  );
  const playing = audioLoaded ? playlistStatus.playing : fallbackPlaying;
  const done = completed || (started && total > 0 && elapsed >= total);

  const fallbackCueIndex = useMemo(() => {
    if (!m) return 0;
    const index = [...m.steps].reverse().findIndex((step) => step.at <= elapsed);
    return index < 0 ? 0 : m.steps.length - 1 - index;
  }, [elapsed, m]);
  const cueIndex = activeTrack?.cueIndex ?? fallbackCueIndex;

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    return () => {
      playlist.pause();
      playlist.setActiveForLockScreen(false);
    };
  }, [playlist]);

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
    const subscription = playlist.addListener('playlistStatusUpdate', (status) => {
      const onLastTrack = tracks.length > 0 && status.currentIndex === tracks.length - 1;
      if (audioLoaded && onLastTrack && status.didJustFinish) {
        setCompleted(true);
        playlist.setActiveForLockScreen(false);
      }
    });
    return () => subscription.remove();
  }, [audioLoaded, playlist, tracks.length]);

  const startPlaylist = async (meditation: Meditation, timedTracks: TimedTrack[]) => {
    playlist.clear();
    timedTracks.forEach((track) => playlist.add({ uri: track.uri }));
    playlist.skipTo(0);
    await playlist.seekTo(0);
    playlist.setActiveForLockScreen(
      true,
      {
        title: meditation.title,
        artist: 'Spool',
        albumTitle: 'Guided meditation',
      },
      { isLiveStream: true },
    );
    playlist.play();
  };

  const togglePlayback = async () => {
    if (audioLoading || !m) return;

    if (audioLoaded) {
      if (playlistStatus.playing) playlist.pause();
      else playlist.play();
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
      const audio = await api.meditations.audio(id);
      const timedTracks = buildTimedTracks(m, audio);
      if (!timedTracks.length) throw new Error('Guided audio is empty.');
      setTracks(timedTracks);
      setStarted(true);
      setCompleted(false);
      await startPlaylist(m, timedTracks);
      setAudioLoaded(true);
    } catch (error) {
      playlist.clear();
      setTracks([]);
      setAudioLoaded(false);
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
    if (audioLoaded && m && tracks.length) {
      playlist.skipTo(0);
      await playlist.seekTo(0);
      playlist.setActiveForLockScreen(
        true,
        {
          title: m.title,
          artist: 'Spool',
          albumTitle: 'Guided meditation',
        },
        { isLiveStream: true },
      );
      playlist.play();
    } else {
      setFallbackElapsed(0);
      setFallbackPlaying(true);
    }
  };

  const close = () => {
    playlist.pause();
    playlist.setActiveForLockScreen(false);
    router.back();
  };

  if (q.isPending) return <Screen back={close}><Loading /></Screen>;
  if (q.isError) {
    return <Screen back={close}><ErrorState error={q.error} onRetry={() => q.refetch()} /></Screen>;
  }
  if (!m) return <Screen back={close}><Loading /></Screen>;

  const cue = m.steps[cueIndex] ?? m.steps[0];
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
        {started ? (
          <T variant="caption" muted center style={{ marginBottom: Spacing.sm }}>
            Cue {cueIndex + 1} of {m.steps.length}
          </T>
        ) : null}
        <T variant="heading" center accessibilityLiveRegion="polite" style={{ fontWeight: '500' }}>
          {started ? cue.text : 'Find a quiet spot. Press play when you are ready.'}
        </T>
        {audioLoading ? (
          <T variant="caption" muted center style={{ marginTop: Spacing.md }}>
            Preparing the complete guided audio…
          </T>
        ) : null}
      </View>
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
      <Gap size={Spacing.xl} />
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
        <T variant="caption" muted center style={{ marginTop: Spacing.sm }}>
          Guided voice is AI-generated.
        </T>
      </View>
    </Screen>
  );
}
