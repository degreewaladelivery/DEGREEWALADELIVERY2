/** Small formatting helpers used across the UI. */

/** Indian-style rupee formatting, e.g. 1500 -> "₹1,500". */
export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
