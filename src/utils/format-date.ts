const formatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function formatDate(date: Date | string | number): string {
  return formatter.format(new Date(date));
}
