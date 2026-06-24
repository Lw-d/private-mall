export const adminAuthExpiredEventName = 'admin-auth-expired';

export function emitAdminAuthExpired() {
  window.dispatchEvent(new Event(adminAuthExpiredEventName));
}
