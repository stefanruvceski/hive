import { HabitForm } from './components/habit-form';
import { useCreateHabit } from '../../data/queries';

/** Add habit: name, emoji, part of the day. Saves and goes back to the list. */
export function HabitsNew() {
  const create = useCreateHabit();

  return (
    <HabitForm
      testID="habits-new"
      title="New habit"
      onSave={(draft, callbacks) => create.mutate(draft, callbacks)}
      isPending={create.isPending}
      isError={create.isError}
    />
  );
}
