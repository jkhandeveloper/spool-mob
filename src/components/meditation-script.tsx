import { type ComponentRef, useEffect, useMemo, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useFontScale, useTheme } from '@/hooks/use-theme';
import type { MeditationAudioCue, MeditationStep } from '@/lib/types';

interface Word {
  text: string;
  /** Share of the cue's spoken time (0–1) at which the voice reaches this word. */
  startsAt: number;
}

/**
 * Splits a cue into words with estimated end times. The narration has no
 * word timestamps, so speaking time is shared by character count, with extra
 * weight after punctuation where the voice naturally pauses.
 */
function timeWords(text: string): Word[] {
  const parts = text.split(/\s+/).filter(Boolean);
  const weights = parts.map((part) => {
    const pause = /[….]$/.test(part) ? 6 : /[,;:—–-]$/.test(part) ? 3 : 0;
    return part.length + 1 + pause;
  });
  const total = weights.reduce((sum, w) => sum + w, 0) || 1;
  let running = 0;
  return parts.map((part, i) => {
    const word = { text: part, startsAt: running / total };
    running += weights[i];
    return word;
  });
}

/**
 * The full written script of a meditation, following the narration: the cue
 * being spoken is highlighted word by word, finished cues stay readable,
 * upcoming cues are faint, and the view scrolls to keep the voice in sight.
 * Everything is driven by `position`, so it stops exactly when the audio stops.
 */
export function MeditationScript({
  steps,
  cues,
  position,
  activeIndex,
  started,
}: {
  steps: MeditationStep[];
  /** Exact cue timing in the audio track; null when following the text-only timer. */
  cues: MeditationAudioCue[] | null;
  /** Current playback position in seconds. */
  position: number;
  activeIndex: number;
  started: boolean;
}) {
  const c = useTheme();
  const scale = useFontScale();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const offsets = useRef<number[]>([]);
  const words = useMemo(() => steps.map((step) => timeWords(step.text)), [steps]);

  useEffect(() => {
    if (!started) return;
    const y = offsets.current[activeIndex];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - Spacing.xl), animated: true });
  }, [activeIndex, started]);

  const spokenShare = (index: number) => {
    if (!started || index > activeIndex) return 0;
    if (index < activeIndex) return 1;
    const cue = cues?.[index];
    if (!cue) return 1; // text-only mode: show the whole current cue
    if (cue.durationSeconds <= 0) return 1;
    return Math.min(1, Math.max(0, (position - cue.at) / cue.durationSeconds));
  };

  const fontSize = 19 * scale;
  const lineHeight = 28 * scale;

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: Spacing.lg, gap: Spacing.lg }}
      showsVerticalScrollIndicator={false}>
      {!started ? (
        <T variant="heading" center style={{ fontWeight: '500', marginBottom: Spacing.sm }}>
          Find a quiet spot. Press play when you are ready.
        </T>
      ) : null}
      {steps.map((step, index) => {
        const active = started && index === activeIndex;
        const share = spokenShare(index);
        const upcoming = !started || index > activeIndex;
        return (
          <View
            key={`${step.at}-${index}`}
            onLayout={(e) => {
              offsets.current[index] = e.nativeEvent.layout.y;
            }}
            accessible
            accessibilityLabel={step.text}
            accessibilityState={{ selected: active }}
            style={{ opacity: upcoming ? 0.35 : 1 }}>
            <Text
              style={{
                fontSize,
                lineHeight,
                textAlign: 'center',
                fontWeight: active ? '600' : '400',
              }}>
              {words[index].map((word, w) => {
                // In the cue being spoken, each word lights up as the voice reaches it.
                const lit = active && share > word.startsAt;
                return (
                  <Text key={w} style={{ color: lit ? c.text : c.textSecondary }}>
                    {w > 0 ? ' ' : ''}
                    {word.text}
                  </Text>
                );
              })}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
