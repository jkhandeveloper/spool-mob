import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button, Card, Gap, InlineError, Screen, Stack, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { sessionStore } from '@/lib/session-store';

const STEPS = ['Reading through your session', 'Finding the main points', 'Drafting small next steps'];

// P5 Processing / recovery: upload, progress, interrupted upload, failure and retry
export default function Processing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const uploadStarted = useRef(false);

  const q = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.sessions.get(id),
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 2000 : false),
  });

  const upload = useMutation({
    mutationFn: () => {
      const pending = sessionStore.get(id);
      if (!pending) throw new Error('The session notes are no longer on this phone.');
      return api.sessions.submitTranscript(id, pending.transcript, pending.durationSeconds);
    },
    onSuccess: (session) => {
      sessionStore.clear(id);
      qc.setQueryData(['session', id], session);
    },
  });

  const retry = useMutation({
    mutationFn: () => api.sessions.retry(id),
    onSuccess: (session) => qc.setQueryData(['session', id], session),
  });

  const discard = useMutation({
    mutationFn: () => api.sessions.remove(id),
    onSuccess: () => {
      sessionStore.clear(id);
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['today'] });
      router.replace('/sessions');
    },
  });

  const status = q.data?.status;
  const hasLocal = !!sessionStore.get(id);

  // Start the upload once, as soon as we know the server is still waiting for it.
  useEffect(() => {
    if (status === 'recording' && hasLocal && !uploadStarted.current) {
      uploadStarted.current = true;
      upload.mutate();
    }
  }, [status, hasLocal, upload]);

  useEffect(() => {
    if (status === 'draft') {
      qc.invalidateQueries({ queryKey: ['today'] });
      router.replace({ pathname: '/session/[id]/review', params: { id } });
    }
  }, [status, id, qc]);

  useEffect(() => {
    if (status !== 'processing') return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4000);
    return () => clearInterval(t);
  }, [status]);

  const leave = <Button title="Back to sessions" variant="ghost" onPress={() => router.replace('/sessions')} />;

  // ----- Interrupted upload -----
  if (upload.isError || (status === 'recording' && !hasLocal && !upload.isPending)) {
    const recoverable = hasLocal;
    return (
      <Screen
        footer={
          <>
            {recoverable ? <Button title="Try again" onPress={() => upload.mutate()} loading={upload.isPending} /> : null}
            <Button title="Discard session" variant={recoverable ? 'ghost' : 'primary'} onPress={() => discard.mutate()} loading={discard.isPending} />
          </>
        }>
        <T variant="title">Upload interrupted</T>
        <Gap />
        <Card muted>
          <T>
            {recoverable
              ? "We couldn't send your session to Spool. Your notes are still on this phone, so nothing is lost. Check your connection and try again."
              : 'This session was interrupted before it could be sent (for example, the app was closed). Nothing was saved.'}
          </T>
        </Card>
        <Gap />
        <InlineError message={upload.error?.message} />
      </Screen>
    );
  }

  // ----- Failed on the server -----
  if (status === 'failed') {
    return (
      <Screen
        footer={
          <>
            {q.data?.canRetry ? <Button title="Try again" onPress={() => retry.mutate()} loading={retry.isPending} /> : null}
            <Button
              title="Discard session"
              variant={q.data?.canRetry ? 'ghost' : 'primary'}
              onPress={() => discard.mutate()}
              loading={discard.isPending}
            />
            {leave}
          </>
        }>
        <T variant="title">We couldn't finish your summary</T>
        <Gap />
        <Card muted>
          <T>{q.data?.failureReason ?? 'Something went wrong.'}</T>
        </Card>
        <Gap />
        <InlineError message={retry.error?.message ?? discard.error?.message} />
        {!q.data?.canRetry ? (
          <T variant="caption" muted>Nothing from this session has been kept.</T>
        ) : null}
      </Screen>
    );
  }

  // ----- Uploading / processing -----
  return (
    <Screen footer={leave}>
      <T variant="title">Creating your summary</T>
      <T muted>This usually takes less than a minute. You can leave this screen; we'll keep working.</T>
      <Gap size={Spacing.xl} />
      <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }} accessibilityRole="progressbar" accessibilityLabel="Creating your summary">
        <ActivityIndicator size="large" color={c.text} />
      </View>
      <Stack>
        {(status === 'processing' ? STEPS : ['Sending your session securely']).map((s, i) => (
          <T key={s} muted={status === 'processing' && i > step} variant={status === 'processing' && i === step ? 'bodyStrong' : 'body'}>
            {status === 'processing' && i < step ? '✓ ' : '• '}
            {s}
          </T>
        ))}
      </Stack>
      <Gap size={Spacing.xl} />
      <InlineError message={q.isError ? q.error.message : null} />
    </Screen>
  );
}
