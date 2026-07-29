/**
 * Gửi sự kiện hành vi lên POST /api/analytics/events (không chặn UI nếu lỗi).
 */
import { authFetch } from '../utils/mobileAuth';

let clientSessionId = '';

function getSessionId() {
  if (clientSessionId) return clientSessionId;
  clientSessionId = `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return clientSessionId;
}

export async function trackPageView(route, metadata = {}) {
  try {
    await authFetch('/api/analytics/events', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [
          {
            type: 'page_view',
            route: String(route || '/').slice(0, 256),
            clientSessionId: getSessionId(),
            metadata,
          },
        ],
      }),
    });
  } catch {
    /* ignore */
  }
}

export async function trackAction(action, route = '/', metadata = {}) {
  try {
    await authFetch('/api/analytics/events', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [
          {
            type: 'action',
            action: String(action || '').slice(0, 64),
            route: String(route || '/').slice(0, 256),
            clientSessionId: getSessionId(),
            metadata,
          },
        ],
      }),
    });
  } catch {
    /* ignore */
  }
}
