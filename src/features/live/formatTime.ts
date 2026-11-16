import { getLocale } from '@/ui/locale';

import { formatMonthDay, formatYearText } from './timeTravel';

const pad = (n: number) => String(n).padStart(2, '0');

/** Helyi dátum és idő az aktuális nyelven: hu „2026. 10. 07. 21:30”, en „Oct 7, 2026, 21:30”. */
export function formatDateTime(date: Date): string {
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (getLocale() === 'en') {
    return `${formatMonthDay(date)}, ${formatYearText(date.getFullYear())}, ${time}`;
  }
  return `${formatYearText(date.getFullYear())}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())}. ${time}`;
}
