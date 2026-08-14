export function todayDateString() {
  return toDateString(new Date());
}

export function toDateString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function monthRange(year: number, month: number) {
  const first = toDateString(new Date(year, month, 1));
  const last = toDateString(new Date(year, month + 1, 0));
  return { first, last };
}
