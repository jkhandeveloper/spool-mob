import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Field, Stack, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A summary section the user can correct (12 Review summary). Items are edited
 * one per line so it's quick on a phone.
 */
export function EditableCard({
  title,
  items,
  onSave,
  saving,
  maxItems = 6,
  renderItem,
}: {
  title: string;
  items: string[];
  onSave: (items: string[]) => Promise<unknown> | void;
  saving?: boolean;
  maxItems?: number;
  renderItem?: (item: string, index: number) => React.ReactNode;
}) {
  const c = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    setDraft(items.join('\n'));
    setEditing(true);
  };

  const save = async () => {
    const next = draft.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, maxItems);
    await onSave(next);
    setEditing(false);
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T variant="bodyStrong">{title}</T>
        {!editing ? (
          <Pressable onPress={startEdit} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Edit ${title}`}>
            <Ionicons name="pencil-outline" size={20} color={c.text} />
          </Pressable>
        ) : null}
      </View>
      {editing ? (
        <View style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
          <Field value={draft} onChangeText={setDraft} multiline autoFocus hint="One item per line" accessibilityLabel={title} />
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Done" onPress={save} loading={saving} />
            </View>
          </View>
        </View>
      ) : (
        <Stack gap={Spacing.xs}>
          {items.length === 0 ? <T variant="caption" muted>Nothing yet. Tap the pencil to add.</T> : null}
          {items.map((item, i) =>
            renderItem ? (
              <View key={`${i}-${item}`}>{renderItem(item, i)}</View>
            ) : (
              <T key={`${i}-${item}`} variant="caption">{items.length > 1 ? `• ${item}` : item}</T>
            ),
          )}
        </Stack>
      )}
    </Card>
  );
}

/** Two-field goals editor (daily + weekly). */
export function GoalsCard({
  daily,
  weekly,
  onSave,
  saving,
}: {
  daily: string | null;
  weekly: string | null;
  onSave: (g: { dailyGoal: string; weeklyGoal: string }) => Promise<unknown> | void;
  saving?: boolean;
}) {
  const c = useTheme();
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState('');
  const [w, setW] = useState('');

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T variant="bodyStrong">Your goals</T>
        {!editing ? (
          <Pressable
            onPress={() => {
              setD(daily ?? '');
              setW(weekly ?? '');
              setEditing(true);
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Edit your goals">
            <Ionicons name="pencil-outline" size={20} color={c.text} />
          </Pressable>
        ) : null}
      </View>
      {editing ? (
        <View style={{ marginTop: Spacing.sm, gap: Spacing.md }}>
          <Field label="Daily" value={d} onChangeText={setD} maxLength={280} />
          <Field label="Weekly" value={w} onChangeText={setW} maxLength={280} />
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Done"
                loading={saving}
                onPress={async () => {
                  await onSave({ dailyGoal: d.trim(), weeklyGoal: w.trim() });
                  setEditing(false);
                }}
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={{ gap: Spacing.xs }}>
          <T variant="caption"><T variant="caption" style={{ fontWeight: '700' }}>Daily: </T>{daily || '—'}</T>
          <T variant="caption"><T variant="caption" style={{ fontWeight: '700' }}>Weekly: </T>{weekly || '—'}</T>
        </View>
      )}
    </Card>
  );
}
