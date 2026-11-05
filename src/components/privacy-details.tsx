import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { LayoutAnimation, Pressable, View } from 'react-native';
import { Card, Stack, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// P9 Data & privacy details. This copy must stay in line with what the API
// actually does (see spool-api README → Privacy model).
export const PRIVACY_SECTIONS = [
  {
    id: 'recording',
    title: 'Session recording',
    subtitle: 'Review how audio is processed',
    body: [
      'Recording only starts when you tap Start session, after everyone present has agreed.',
      'Speech is turned into text on your phone. Audio is never uploaded or saved.',
      'When the session ends, the text transcript is sent securely to Spool to create a summary draft. Summaries are written by an AI model (Claude, by Anthropic), which receives the transcript and your discussion prompts.',
      'The transcript is deleted as soon as the summary draft is created. If creating the summary fails, it is kept only so you can try again, and it is deleted when you discard the session.',
    ],
  },
  {
    id: 'saved',
    title: 'Your saved information',
    subtitle: 'Review what is kept and deleted',
    body: [
      'Kept until you delete it: your account email and name, journal entries, session summaries you choose to keep, goals and check-ins, and appointments.',
      'Never kept: session audio. Transcripts are kept only until the summary draft exists.',
      'You review every summary before it is saved. You can untick “Keep this summary” to keep only the goals.',
    ],
  },
  {
    id: 'choices',
    title: 'Your choices',
    subtitle: 'Manage access and delete your data',
    body: [
      'Use journals without recording: turn session recording off at any time in More → Privacy & data.',
      'Choose which journal notes become discussion prompts. Each entry has its own switch.',
      'Export a copy of everything, delete all your data, or delete your account from More → Privacy & data.',
    ],
  },
] as const;

export function PrivacyDetails({ initiallyOpen }: { initiallyOpen?: string }) {
  const c = useTheme();
  const [open, setOpen] = useState<string | null>(initiallyOpen ?? null);
  return (
    <Stack>
      {PRIVACY_SECTIONS.map((s) => {
        const expanded = open === s.id;
        return (
          <Card key={s.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${s.title}. ${s.subtitle}`}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setOpen(expanded ? null : s.id);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{s.title}</T>
                <T variant="caption" muted>{s.subtitle}</T>
              </View>
              <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={20} color={c.textSecondary} />
            </Pressable>
            {expanded ? (
              <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
                {s.body.map((line) => (
                  <View key={line} style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <T>•</T>
                    <T style={{ flex: 1 }}>{line}</T>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        );
      })}
    </Stack>
  );
}
