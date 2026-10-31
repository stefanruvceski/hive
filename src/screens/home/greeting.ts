// Home header text: the greeting for the time of day and the date line above it.

/** Morning 5–11, afternoon 12–17, evening otherwise (local time). */
export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Saturday, October 31". The header shows it in capitals (`ThemedText type="date"`). */
export function dateLine(now: Date): string {
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
