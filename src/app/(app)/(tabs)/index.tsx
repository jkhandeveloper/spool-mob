import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Card, ErrorState, Gap, ListRow, Loading, Screen, Section, Stack, T } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { appointmentSubtitle, formatAppointmentWhen } from '@/lib/format';
import type { TherapySession } from '@/lib/types';

function pendingHref(s: TherapySession): Href {
  if (s.status === 'draft') return `/session/${s.id}/review`;
  return `/session/${s.id}/processing`;
}

// 01 Today
export default function TodayScreen() {
  const c = useTheme();
  const q = useQuery({ queryKey: ['today'], queryFn: api.today });

  if (q.isPending) return <Screen><Loading /></Screen>;
  if (q.isError) return <Screen><ErrorState error={q.error} onRetry={() => q.refetch()} /></Screen>;

  const t = q.data;
  const daily = t.goals.find((g) => g.cadence === 'daily');
  const weekly = t.goals.find((g) => g.cadence === 'weekly');
  const minutes = Math.round(t.meditation.durationSeconds / 60);

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <T variant="title">Today</T>
      <Gap />

      <Card inverted>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <T variant="caption" style={{ color: c.onPrimary }}>A reminder for this moment</T>
            <T variant="title" style={{ color: c.onPrimary }}>{t.reminder}</T>
          </View>
          <Ionicons name="heart-outline" size={28} color={c.onPrimary} />
        </View>
      </Card>
      <Gap />

      <Card
        onPress={() => router.push(`/meditation/${t.meditation.id}`)}
        accessibilityLabel={`${t.meditation.label}: ${t.meditation.title}, ${minutes} minutes. Play`}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{t.meditation.label}</T>
            <T variant="caption" muted>{t.meditation.title} · {minutes} min</T>
          </View>
          <View style={{ width: 40, height: 40, borderRadius: Radius.pill, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="play" size={18} color={c.text} />
          </View>
        </View>
      </Card>

      {t.pendingSession ? (
        <>
          <Gap />
          <ListRow
            icon={t.pendingSession.status === 'failed' ? 'alert-circle-outline' : 'document-text-outline'}
            title={t.pendingSession.status === 'draft' ? 'Your summary is ready to review' : t.pendingSession.status === 'failed' ? "Your summary didn't finish" : 'Creating your summary…'}
            subtitle="Pick up where you left off"
            onPress={() => router.push(pendingHref(t.pendingSession!))}
          />
        </>
      ) : null}

      <Section title="This week">
        <Stack>
          {t.nextAppointment ? (
            <ListRow
              icon="calendar-clear-outline"
              title={t.nextAppointment.title}
              subtitle={`${formatAppointmentWhen(t.nextAppointment.startsAt)} · ${appointmentSubtitle(t.nextAppointment)}`}
              onPress={() => router.push(`/appointment/${t.nextAppointment!.id}`)}
            />
          ) : t.user.graduatedAt ? null : (
            <ListRow
              icon="calendar-clear-outline"
              title="Plan your next appointment"
              subtitle="Add a date so Spool can remind you"
              onPress={() => router.push('/appointment/new')}
            />
          )}
          <ListRow
            icon="document-text-outline"
            title="Thought journal"
            subtitle={
              t.journalThisWeek
                ? `${t.journalThisWeek} ${t.journalThisWeek === 1 ? 'note' : 'notes'} for your next session`
                : 'Notes for your next session'
            }
            onPress={() => router.push('/journal')}
          />
        </Stack>
      </Section>

      {daily || weekly ? (
        <Section title="Your goals" subtitle="Small steps create meaningful change.">
          <Stack>
            {[daily, weekly].filter((g) => !!g).map((g) => (
              <ListRow
                key={g.id}
                icon={g.cadence === 'daily' ? 'radio-button-on-outline' : 'calendar-outline'}
                title={g.cadence === 'daily' ? 'Daily goal' : 'Weekly goal'}
                subtitle={g.text}
                onPress={() => router.push(`/goal/${g.id}`)}
                right={
                  g.doneThisPeriod ? (
                    <Pressable accessibilityLabel="Done for now" accessible>
                      <Ionicons name="checkmark-circle" size={24} color={c.success} />
                    </Pressable>
                  ) : undefined
                }
              />
            ))}
          </Stack>
        </Section>
      ) : null}

      {t.user.graduatedAt ? (
        <>
          <Gap size={Spacing.xl} />
          <Card muted>
            <T variant="bodyStrong">You've graduated 🎓</T>
            <T variant="caption" muted>Your journal, summaries and goals are still here whenever you need them.</T>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
