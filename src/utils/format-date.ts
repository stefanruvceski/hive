const formatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function formatDate(date: Date | string | number): string {
  return formatter.format(new Date(date));
}

/**
 * `YYYY-MM-DD` in the phone's time zone: the format dates are stored in. Never a display format, so
 * a display preference can't change what is saved.
 */
export function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
