import { useState } from 'react';
import { Button, Checkbox, Gap, InlineError, Screen, T } from '@/components/ui';
import { PrivacyDetails } from '@/components/privacy-details';
import { Spacing } from '@/constants/theme';
import { useAction } from '@/hooks/use-action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// 09 Privacy & setup
export default function PrivacySetup() {
  const { setUser, signOut } = useAuth();
  const [reviewed, setReviewed] = useState(false);

  const action = useAction(async (journalOnly: boolean) => {
    if (!reviewed) throw new Error('Please review the privacy information and tick the box to continue.');
    setUser(await api.me.privacyReview(journalOnly));
  });

  return (
    <Screen
      back={() => void signOut()}
      footer={
        <>
          <InlineError message={action.error} />
          <Button title="Continue" onPress={() => action.run(false)} loading={action.pending} disabled={!reviewed} />
          <Button
            title="Use journals without recording"
            variant="ghost"
            onPress={() => action.run(true)}
            disabled={action.pending}
          />
        </>
      }>
      <T variant="title">Before you begin</T>
      <T muted>Choose how Spool supports your sessions.</T>
      <Gap size={Spacing.lg} />
      <PrivacyDetails />
      <Gap size={Spacing.lg} />
      <T variant="caption">
        Recording starts only when you choose. Ask everyone present before each session.
      </T>
      <Gap size={Spacing.sm} />
      <Checkbox checked={reviewed} onChange={setReviewed} label="I've reviewed the privacy information" />
    </Screen>
  );
}
