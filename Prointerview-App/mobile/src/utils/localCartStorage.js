import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CART_KEY = 'prointerview_mobile_cart';

const Storage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* ignore */
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
};

export function emptyCart() {
  return { items: [], local: true };
}

export async function loadLocalCart() {
  const raw = await Storage.getItem(CART_KEY);
  if (!raw) return emptyCart();
  try {
    const parsed = JSON.parse(raw);
    return { items: Array.isArray(parsed.items) ? parsed.items : [], local: true };
  } catch {
    return emptyCart();
  }
}

export async function saveLocalCart(cart) {
  await Storage.setItem(CART_KEY, JSON.stringify({ items: cart?.items || [] }));
  return { ...cart, local: true };
}

export function createLocalCartItem({ itemType, itemId, title, price, quantity = 1, thumbnail = '' }) {
  return {
    _id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    itemType,
    itemId: String(itemId),
    title: String(title || 'Khóa học'),
    price: Number(price) || 0,
    quantity: quantity || 1,
    thumbnail: thumbnail || '',
  };
}

export async function addToLocalCart(payload) {
  const cart = await loadLocalCart();
  const itemId = String(payload.itemId || '').trim();
  const idx = cart.items.findIndex(
    (i) => i.itemId === itemId && i.itemType === payload.itemType,
  );
  if (idx >= 0) {
    cart.items[idx].quantity += payload.quantity || 1;
  } else {
    cart.items.push(createLocalCartItem(payload));
  }
  return saveLocalCart(cart);
}

export async function removeFromLocalCart(itemId) {
  const cart = await loadLocalCart();
  cart.items = cart.items.filter((i) => i._id !== itemId);
  return saveLocalCart(cart);
}

export async function clearLocalCart() {
  return saveLocalCart(emptyCart());
}
