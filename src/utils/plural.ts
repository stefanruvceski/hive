/** "1 app", "3 apps". Regular English plurals only (add -s); English is the only UI language. */
export function countLabel(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}
