import { useEffect } from 'react';

import { useToday } from '@/hooks/use-today';

import { useCompletions, useHabits } from './queries';
import { hasReminderPermission, scheduleReminders } from './reminder-notifications';
import { useReminderSettings } from './reminder-queries';
import { useTodos } from './todo-queries';
import { doneDatesFor } from '../domain/goal';
import { planReminders } from '../domain/reminders';

/**
 * Keeps the scheduled reminders in step with the habits, to-dos, what is done today and the
 * reminder settings: the next days are re-planned whenever any of them changes, and when the app
 * opens. Mounted once, at the root, so it runs without opening Habits.
 */
export function useReminderSync() {
  const today = useToday();
  const habits = useHabits().data;
  const completions = useCompletions().data;
  const todos = useTodos(today).data;
  const settings = useReminderSettings().data;

  useEffect(() => {
    if (!habits || !completions || !todos || !settings) return;
    const doneToday = new Set(
      [...doneDatesFor(habits, completions)]
        .filter(([, dates]) => dates.has(today))
        .map(([id]) => id),
    );
    const planned = planReminders({ settings, habits, todos, doneToday, today, now: new Date() });
    void (async () => {
      // Without permission nothing can be scheduled; turning a reminder on asks for it.
      if (planned.length > 0 && !(await hasReminderPermission())) return;
      await scheduleReminders(planned);
    })().catch(() => undefined);
  }, [habits, completions, todos, settings, today]);
}
