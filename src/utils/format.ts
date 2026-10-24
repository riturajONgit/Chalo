/**
 * Formats a numeric fare as Indian Rupees, e.g. ₹1,234
 */
export function formatRupees(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹--';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Validates whether an Indian mobile number is valid (10 digits starting with 6, 7, 8, 9).
 */
export function isValidIndianPhone(phone: string): boolean {
  const cleaned = cleanPhone(phone);
  return /^[6-9]\d{9}$/.test(cleaned);
}

/**
 * Cleans user phone input, stripping spaces, dashes, parentheses and +91 prefix.
 */
export function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Format date for friendly human display
 */
export function formatFriendlyDate(isoOrDateString: string): string {
  if (!isoOrDateString) return '';
  const date = new Date(isoOrDateString);
  if (isNaN(date.getTime())) return isoOrDateString;

  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats bookings.scheduled_at as "Sun, 25 Oct 2026, 08:00 am" in Indian Standard Time (IST).
 */
export function formatISTSchedule(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return String(isoString);

  const dtf = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const parts = dtf.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const dayPeriod = (partMap.dayPeriod || '').toLowerCase();
  return `${partMap.weekday}, ${partMap.day} ${partMap.month} ${partMap.year}, ${partMap.hour}:${partMap.minute} ${dayPeriod}`;
}
