// Shared loan/EMI math — mirrors the server (PaymentPlanModel.computePlan) so
// the admin sees a live, accurate preview while typing.

export const FREQ_LABEL = { 1: 'Every month', 2: 'Every 2 months', 3: 'Every 3 months (quarterly)', 6: 'Every 6 months' };
export const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');

export function computePreview({ totalAmount, downpayment, monthlyAmount, gapMonths, firstDueDate }) {
  const total = Number(totalAmount) || 0;
  const down = Number(downpayment) || 0;
  const balance = Math.max(0, Math.round((total - down) * 100) / 100);
  const G = [1, 2, 3, 6].includes(Number(gapMonths)) ? Number(gapMonths) : 1;
  const monthly = Number(monthlyAmount) || 0;
  let count = 0, per = 0, months = 0;
  if (monthly > 0 && balance > 0) {
    months = Math.min(600, Math.ceil(balance / monthly));
    count = Math.max(1, Math.ceil(months / G));
    per = Math.round(monthly * G * 100) / 100;
    if (per > balance) { count = 1; per = balance; }
  }
  let endDate = '';
  let payDay = null;
  if (firstDueDate) {
    const [y, m, d] = String(firstDueDate).slice(0, 10).split('-').map(Number);
    payDay = d;
    if (count > 0) {
      const dt = new Date(Date.UTC(y, m - 1, d));
      const day = dt.getUTCDate();
      dt.setUTCMonth(dt.getUTCMonth() + (count - 1) * G);
      if (dt.getUTCDate() < day) dt.setUTCDate(0);
      endDate = dt.toISOString().slice(0, 10);
    }
  }
  return { balance, months, count, per, endDate, payDay, gap: G };
}
