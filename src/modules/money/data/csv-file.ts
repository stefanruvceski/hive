// The only place in Money that talks to expo-file-system and expo-sharing: the CSV export goes out
// through the share sheet. The text itself comes from domain/search.ts.
import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

/** Writes the CSV to a file and opens the share sheet (Save to Files, AirDrop, Drive…). */
export async function shareCsv(csv: string, today: string): Promise<void> {
  const file = new File(Paths.cache, `hive-money-${today}.csv`);
  file.create({ overwrite: true });
  await file.write(csv);
  await shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
}
