/** Cấu hình chuyển khoản — khớp web (VITE_BANK_TRANSFER_*). */
export const BANK_TRANSFER = {
  bankName: process.env.EXPO_PUBLIC_BANK_TRANSFER_NAME?.trim() || 'TPBank',
  accountNumber: process.env.EXPO_PUBLIC_BANK_TRANSFER_ACCOUNT?.trim() || '',
  accountOwner: process.env.EXPO_PUBLIC_BANK_TRANSFER_OWNER?.trim() || '',
};

export function inferVietQrBankId() {
  const explicit = process.env.EXPO_PUBLIC_VIETQR_BANK_ID?.trim();
  if (explicit) return explicit.toUpperCase();
  const name = (BANK_TRANSFER.bankName || '').toLowerCase();
  if (
    name.includes('tiên phong') ||
    name.includes('tien phong') ||
    name.includes('tpbank') ||
    name.includes('tp bank')
  ) {
    return 'TPB';
  }
  return '';
}

export function buildVietQrImageUrl(bankId, accountDigits, amountVnd, addInfo) {
  const bid = String(bankId || '').trim().toUpperCase();
  const acc = String(accountDigits || '').replace(/\D/g, '');
  const amt = Math.round(Number(amountVnd) || 0);
  if (!bid || !acc || amt <= 0) return null;
  const add = encodeURIComponent(String(addInfo || '').slice(0, 50));
  return `https://img.vietqr.io/image/${bid}-${acc}-compact2.png?amount=${amt}&addInfo=${add}`;
}

export function generateOrderNum() {
  return `PI${Math.floor(Math.random() * 900000 + 100000)}`;
}

export function formatVnd(amount) {
  const n = Math.round(Number(amount) || 0);
  return `${n.toLocaleString('vi-VN')}đ`;
}

/** Phương thức thanh toán — khớp backend ProInterview (web ưu tiên transfer). */
export const PAYMENT_METHODS = [
  {
    id: 'transfer',
    label: 'Chuyển khoản ngân hàng',
    subtitle: 'Quét VietQR · SePay tự xác nhận',
    icon: 'business-outline',
    color: '#8037f4',
    available: true,
    recommended: true,
  },
  {
    id: 'vnpay',
    label: 'VNPay',
    subtitle: 'Thẻ ATM / Visa / Mastercard',
    icon: 'card-outline',
    color: '#3b82f6',
    available: true,
  },
  {
    id: 'momo',
    label: 'Ví MoMo',
    subtitle: 'Thanh toán qua ứng dụng MoMo',
    icon: 'wallet-outline',
    color: '#d946ef',
    available: false,
    badge: 'Sắp có',
  },
  {
    id: 'zalopay',
    label: 'ZaloPay',
    subtitle: 'Thanh toán qua ZaloPay',
    icon: 'phone-portrait-outline',
    color: '#06b6d4',
    available: false,
    badge: 'Sắp có',
  },
];

/** Phương thức mặc định — chuyển khoản (khớp ProInterview web Checkout). */
export function getDefaultPaymentMethod() {
  return 'transfer';
}

/** Lọc phương thức khả dụng (CK ưu tiên như web; VNPay phụ). */
export function getAvailablePaymentMethods() {
  const hasBank = Boolean(BANK_TRANSFER.accountNumber?.trim());
  return PAYMENT_METHODS.map((m) => {
    if (m.id === 'transfer') {
      return {
        ...m,
        available: true,
        recommended: true,
        badge: hasBank ? 'Khuyến nghị' : 'Cấu hình STK trong .env',
      };
    }
    if (m.id === 'vnpay') {
      return { ...m, available: true, recommended: false };
    }
    return m;
  });
}
