/**
 * Convert currency amount to cents (minor units)
 * @param amount - Amount in major currency units (e.g., dollars, rupees)
 * @returns Amount in cents (minor units)
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert cents to currency amount
 * @param cents - Amount in cents (minor units)
 * @returns Amount in major currency units
 */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Format currency amount for display
 * @param cents - Amount in cents
 * @param currency - Currency code (default: INR)
 * @returns Formatted currency string
 */
export function formatCurrency(cents: number, currency: string = 'INR'): string {
  const amount = fromCents(cents);
  
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Calculate transaction impact on balance
 * @param type - Transaction type
 * @param amountCents - Amount in cents
 * @returns Signed amount (positive for income, negative for expense)
 */
export function getTransactionSign(type: string): number {
  switch (type) {
    case 'income':
    case 'refund':
      return 1;
    case 'expense':
      return -1;
    case 'transfer':
      // Transfer impact depends on source/destination account
      // This should be handled at the transaction level
      return 0;
    case 'adjustment':
      // Adjustment can be positive or negative based on amount
      return 1;
    default:
      return 0;
  }
}

/**
 * Calculate balance from opening balance and transactions
 * @param openingBalanceCents - Opening balance in cents
 * @param transactions - Array of transactions
 * @returns Current balance in cents
 */
export function calculateBalance(
  openingBalanceCents: number,
  transactions: Array<{ type: string; amountCents: number }>
): number {
  return transactions.reduce((balance, transaction) => {
    const sign = getTransactionSign(transaction.type);
    return balance + (sign * transaction.amountCents);
  }, openingBalanceCents);
}

/**
 * Validate money amount
 * @param amount - Amount to validate
 * @returns True if valid money amount
 */
export function isValidAmount(amount: number): boolean {
  return !isNaN(amount) && isFinite(amount) && amount >= 0;
}
