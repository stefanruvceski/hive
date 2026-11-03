// Pure planning of the Habits reminders: no React, no notifications API. Tested in
// reminders.test.ts. One reminder per part of the day, listing what is still waiting then.

import { addDays, isScheduled, scheduleOf } from './schedule';
import type { ScheduleType, TimeOfDay } from '../data/schema';

/** The parts of the day that can have a reminder; Anytime has no time to remind at. */
export const reminderParts = ['morning', 'afternoon', 'evening'] as const;
export type ReminderPart = (typeof reminderParts)[number];

export type ReminderSetting = {
  timeOfDay: ReminderPart;
  enabled: boolean;
  hour: number;
  minute: number;
};

export const defaultReminders: readonly ReminderSetting[] = [
  { timeOfDay: 'morning', enabled: false, hour: 8, minute: 0 },
  { timeOfDay: 'afternoon', enabled: false, hour: 14, minute: 0 },
  { timeOfDay: 'evening', enabled: false, hour: 19, minute: 0 },
];

/** How many days ahead reminders are scheduled; they are renewed whenever the app opens. */
export const reminderDays = 7;
const listLimit = 3;
const stepMinutes = 15;

const greetings: Record<ReminderPart, { title: string; when: string }> = {
  morning: { title: 'Good morning ☀️', when: 'This morning' },
  afternoon: { title: 'Good afternoon 🌤️', when: 'This afternoon' },
  evening: { title: 'Good evening 🌙', when: 'This evening' },
};

/** "Run", "Run and Read", "Run, Read and Stretch", "Run, Read, Stretch and 3 more". */
function naturalList(names: readonly string[]): string {
  if (names.length <= listLimit) {
    return names.length < 2
      ? (names[0] ?? '')
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
  return `${names.slice(0, listLimit).join(', ')} and ${names.length - listLimit} more`;
}

export function reminderMessage(part: ReminderPart, names: readonly string[]) {
  const { title, when } = greetings[part];
  return { title, body: `${when} you have ${naturalList(names)} waiting.` };
}

export const formatTime = (hour: number, minute: number) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/** Moves a time by `steps` quarters of an hour, stopping at the ends of the day. */
export function shiftTime(time: { hour: number; minute: number }, steps: number) {
  const total = Math.min(
    24 * 60 - stepMinutes,
    Math.max(0, time.hour * 60 + time.minute + steps * stepMinutes),
  );
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

type PlanHabit = {
  id: string;
  name: string;
  timeOfDay: TimeOfDay;
  scheduleType: ScheduleType;
  scheduleDays: string | null;
  scheduleTimes: number | null;
};
type PlanTodo = { id: string; title: string; date: string; timeOfDay: TimeOfDay; done: boolean };

export type PlannedReminder = { id: string; at: Date; title: string; body: string };

/** A local ISO date and a time of day, as a moment. */
function momentOf(date: string, hour: number, minute: number): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

/**
 * The reminders to schedule for the next days. A reminder says what is waiting in its part of the
 * day: the habits due that day and its open to-dos. Today leaves out what is already done; a day
 * with nothing waiting gets none, and neither does a time that has passed.
 */
export function planReminders({
  settings,
  habits,
  todos,
  doneToday,
  today,
  now,
}: {
  settings: readonly ReminderSetting[];
  habits: readonly PlanHabit[];
  todos: readonly PlanTodo[];
  /** Ids of the habits already done today. */
  doneToday: ReadonlySet<string>;
  today: string;
  now: Date;
}): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (let offset = 0; offset < reminderDays; offset += 1) {
    const date = addDays(today, offset);
    for (const setting of settings) {
      if (!setting.enabled) continue;
      const at = momentOf(date, setting.hour, setting.minute);
      if (at <= now) continue;
      const names = [
        ...habits
          .filter(
            (habit) =>
              habit.timeOfDay === setting.timeOfDay &&
              isScheduled(scheduleOf(habit), date) &&
              !(offset === 0 && doneToday.has(habit.id)),
          )
          .map((habit) => habit.name),
        ...todos
          .filter(
            (todo) => todo.timeOfDay === setting.timeOfDay && todo.date === date && !todo.done,
          )
          .map((todo) => todo.title),
      ];
      if (names.length === 0) continue;
      planned.push({
        id: `${date}-${setting.timeOfDay}`,
        at,
        ...reminderMessage(setting.timeOfDay, names),
      });
    }
  }
  return planned.sort((a, b) => a.at.getTime() - b.at.getTime());
}
