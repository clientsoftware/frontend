export function formatCurrency(amount) {
  const n = Number(amount) || 0;
  const formatted = new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
  return `Rs. ${formatted}`;
}

export function formatNumber(n, decimals = 2) {
  return new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(Number(n) || 0);
}

export function formatDate(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getErrorMessage(err, fallback = 'Something went wrong') {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function openWhatsAppShare(phone, text) {
  const clean = String(phone || '').replace(/\D/g, '');
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
