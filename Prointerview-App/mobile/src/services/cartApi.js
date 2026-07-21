import { authFetch } from '../utils/mobileAuth';
import { ensureApiBase, apiUrl } from '../utils/api';
import { formatBackendUnreachableMessage, BACKEND_DEV_HINT } from '../utils/backendErrors';
import { generateOrderNum } from '../config/paymentConfig';
import { enrollCourse } from './paymentApi';
import {
  loadLocalCart,
  addToLocalCart,
  removeFromLocalCart,
  clearLocalCart,
  saveLocalCart,
} from '../utils/localCartStorage';

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

let serverCartAvailable = null;

async function ensureBackend() {
  const base = await ensureApiBase();
  if (!base) {
    return {
      success: false,
      error: formatBackendUnreachableMessage(),
    };
  }
  return null;
}

async function detectServerCart() {
  if (serverCartAvailable !== null) return serverCartAvailable;
  try {
    const res = await fetch(apiUrl('/'), { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      serverCartAvailable = false;
      return false;
    }
    const body = await res.json().catch(() => ({}));
    serverCartAvailable = Boolean(body.cart);
  } catch {
    serverCartAvailable = false;
  }
  return serverCartAvailable;
}

async function parseBody(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    return {
      success: false,
      error: body.message || body.error || `Lỗi HTTP ${res.status}`,
      cart: body.cart || null,
      status: res.status,
    };
  }
  return { success: true, ...body, status: res.status };
}

export async function fetchCart() {
  const blocked = await ensureBackend();
  if (blocked) return { ...blocked, cart: await loadLocalCart() };

  const hasServer = await detectServerCart();
  if (!hasServer) {
    return {
      success: true,
      cart: await loadLocalCart(),
      local: true,
      message: 'Giỏ hàng local (backend chưa bật /api/cart).',
    };
  }

  try {
    const res = await authFetch('/api/cart', { method: 'GET', headers: jsonHeaders });
    if (res.status === 404) {
      serverCartAvailable = false;
      return {
        success: true,
        cart: await loadLocalCart(),
        local: true,
        message: 'Giỏ hàng local (API cart chưa có).',
      };
    }
    const out = await parseBody(res);
    if (out.success && out.cart) return out;
    return {
      success: false,
      error: out.error || 'Không tải được giỏ hàng server.',
      cart: await loadLocalCart(),
      local: true,
    };
  } catch (e) {
    console.warn('[cartApi] fetchCart:', e);
    return {
      success: false,
      error: 'Không tải được giỏ hàng.',
      cart: await loadLocalCart(),
      local: true,
    };
  }
}

export async function addToCart({ itemType, itemId, title, price, quantity = 1, thumbnail = '' }) {
  const blocked = await ensureBackend();
  const id = String(itemId || '').trim();
  if (!id) {
    return { success: false, error: 'Thiếu mã khóa học. Tải lại trang khóa học.' };
  }

  const payload = {
    itemType,
    itemId: id,
    title: String(title || 'Khóa học'),
    price: Number(price) || 0,
    quantity,
    thumbnail: thumbnail || '',
  };

  if (blocked) {
    const cart = await addToLocalCart(payload);
    return {
      success: true,
      cart,
      message: 'Đã thêm vào giỏ local (chưa kết nối backend).',
      local: true,
    };
  }

  const hasServer = await detectServerCart();
  if (!hasServer) {
    const cart = await addToLocalCart(payload);
    return {
      success: true,
      cart,
      message: 'Đã thêm vào giỏ local (backend chưa bật cart).',
      local: true,
    };
  }

  try {
    const res = await authFetch('/api/cart/add', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });

    if (res.status === 404) {
      serverCartAvailable = false;
      const cart = await addToLocalCart(payload);
      return {
        success: true,
        cart,
        message: 'Đã thêm vào giỏ local (API cart chưa có).',
        local: true,
      };
    }

    const out = await parseBody(res);
    if (!out.success) {
      console.warn('[cartApi] addToCart failed:', out.error);
    }
    return out;
  } catch (e) {
    console.warn('[cartApi] addToCart:', e);
    const cart = await addToLocalCart(payload);
    return {
      success: true,
      cart,
      message: 'Đã thêm vào giỏ local (offline).',
      local: true,
    };
  }
}

export async function removeFromCart(itemId) {
  const blocked = await ensureBackend();
  const hasServer = !blocked && (await detectServerCart());

  if (!hasServer) {
    const cart = await removeFromLocalCart(itemId);
    return { success: true, cart, local: true };
  }

  try {
    const res = await authFetch(`/api/cart/remove/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      headers: jsonHeaders,
    });
    if (res.status === 404) {
      serverCartAvailable = false;
      const cart = await removeFromLocalCart(itemId);
      return { success: true, cart, local: true };
    }
    return parseBody(res);
  } catch {
    const cart = await removeFromLocalCart(itemId);
    return { success: true, cart, local: true };
  }
}

export async function updateCartItemQty(itemId, quantity) {
  const qty = Math.max(1, Math.min(99, Math.round(Number(quantity) || 1)));
  const blocked = await ensureBackend();
  const hasServer = !blocked && (await detectServerCart());

  if (!hasServer) {
    const cart = await loadLocalCart();
    const items = (cart?.items || []).map((it) =>
      String(it._id) === String(itemId) ? { ...it, quantity: qty } : it,
    );
    const next = { ...(cart || {}), items };
    await saveLocalCart(next);
    return { success: true, cart: next, local: true };
  }

  try {
    const res = await authFetch(`/api/cart/${encodeURIComponent(itemId)}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ quantity: qty }),
    });
    if (res.status === 404) {
      serverCartAvailable = false;
      return updateCartItemQty(itemId, qty);
    }
    return parseBody(res);
  } catch (e) {
    return { success: false, error: e?.message || 'Không cập nhật số lượng.' };
  }
}

export async function clearCart() {
  const hasServer = await detectServerCart();
  if (!hasServer) {
    const cart = await clearLocalCart();
    return { success: true, cart, local: true };
  }
  try {
    const res = await authFetch('/api/cart/clear', {
      method: 'DELETE',
      headers: jsonHeaders,
    });
    if (res.status === 404) {
      serverCartAvailable = false;
      const cart = await clearLocalCart();
      return { success: true, cart, local: true };
    }
    return parseBody(res);
  } catch {
    const cart = await clearLocalCart();
    return { success: true, cart, local: true };
  }
}

/** Checkout: server cart hoặc ghi danh từng khóa (local cart). */
export async function checkoutCart({ orderNum, paymentMethod = 'transfer' }) {
  const blocked = await ensureBackend();
  if (blocked) return blocked;

  const ref = orderNum || generateOrderNum();
  const hasServer = await detectServerCart();

  if (hasServer) {
    try {
      const res = await authFetch('/api/cart/checkout', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ orderNum: ref, paymentMethod }),
      });
      if (res.status !== 404) {
        return parseBody(res);
      }
      serverCartAvailable = false;
    } catch {
      serverCartAvailable = false;
    }
  }

  const cart = await loadLocalCart();
  const courseItems = (cart.items || []).filter((i) => i.itemType === 'Course');
  if (!courseItems.length) {
    return { success: false, error: 'Giỏ hàng trống.' };
  }

  if (courseItems.length > 1) {
    return {
      success: false,
      error: `Thanh toán nhiều khóa cần backend. ${BACKEND_DEV_HINT}`,
    };
  }

  for (const item of courseItems) {
    const enrollRes = await enrollCourse(item.itemId, {
      paymentMethod,
      orderNum: ref,
    });
    if (!enrollRes.success && !String(enrollRes.message || '').includes('đã ghi danh')) {
      return {
        success: false,
        error: enrollRes.error || `Không ghi danh được: ${item.title}`,
      };
    }
  }

  await saveLocalCart({ items: [] });
  return { success: true, orderNum: ref, message: 'Đã tạo đơn thanh toán.', local: true };
}

export function calcCartSummary(cart) {
  const items = cart?.items || [];
  const count = items.reduce((t, i) => t + (i.quantity || 1), 0);
  const total = items.reduce((t, i) => t + (Number(i.price) || 0) * (i.quantity || 1), 0);
  return { count, total, items };
}
