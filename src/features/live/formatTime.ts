const pad = (n: number) => String(n).padStart(2, '0');

/** Magyar formátumú helyi dátum és idő: „2026. 10. 07. 21:30”. */
export function formatDateTime(date: Date): string {
  return (
    `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())}. ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
