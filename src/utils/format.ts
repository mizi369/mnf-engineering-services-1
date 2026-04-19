/**
 * Converts a number to its word representation in English.
 * This is a simplified version for common currency amounts.
 */
export function numberToWords(num: number): string {
  if (num === 0) return 'ZERO';

  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];

  function convert(n: number): string {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 !== 0 ? ' AND ' + convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' THOUSAND' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    return n.toString();
  }

  const parts = num.toString().split('.');
  const whole = parseInt(parts[0]);
  const cents = parts[1] ? parseInt(parts[1].padEnd(2, '0').substring(0, 2)) : 0;

  let result = convert(whole) + ' RINGGIT';
  if (cents > 0) {
    result += ' AND ' + convert(cents) + ' CENTS';
  }
  result += ' ONLY';

  return result;
}
