import { useState, useEffect, useCallback } from 'react';
import type { Event } from '../types';

const PERM_ASKED_KEY = 'irl_notif_perm_asked';
const NOTIF_ENABLED_KEY = 'irl_notif_enabled';
const LAST_DIGEST_KEY = 'irl_notif_last_digest';

export type NotifPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function useNotifications(savedEventIds: string[], allEvents: Event[]) {
  const [permission, setPermission] = useState<NotifPermission>('default');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as NotifPermission);
    setEnabled(localStorage.getItem(NOTIF_ENABLED_KEY) === 'true');
  }, []);

  const requestPermission = useCallback(async (): Promise<NotifPermission> => {
    if (!('Notification' in window)) return 'unsupported';
    localStorage.setItem(PERM_ASKED_KEY, 'true');
    const result = await Notification.requestPermission();
    setPermission(result as NotifPermission);
    if (result === 'granted') {
      setEnabled(true);
      localStorage.setItem(NOTIF_ENABLED_KEY, 'true');
    }
    return result as NotifPermission;
  }, []);

  const toggleEnabled = useCallback((val: boolean) => {
    setEnabled(val);
    localStorage.setItem(NOTIF_ENABLED_KEY, val ? 'true' : 'false');
  }, []);

  // Daily digest: on app open, notify about saved events today
  useEffect(() => {
    if (!enabled || permission !== 'granted') return;
    if (!savedEventIds.length || !allEvents.length) return;

    const todayKey = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(LAST_DIGEST_KEY) === todayKey) return;

    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const todaysSaved = allEvents.filter((e) => {
      if (!savedEventIds.includes(e.id)) return false;
      const start = new Date(e.startAt);
      return start >= now && start <= endOfDay;
    });

    if (!todaysSaved.length) return;

    localStorage.setItem(LAST_DIGEST_KEY, todayKey);

    const show = () => {
      if (todaysSaved.length === 1) {
        const ev = todaysSaved[0];
        const time = new Date(ev.startAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/New_York',
        });
        new Notification(`Tonight: ${ev.title}`, {
          body: `${time} · ${ev.venueName || ev.neighborhood || ''}`.trim().replace(/\s·\s$/, ''),
          icon: '/irl/icons/icon-192.png',
          badge: '/irl/icons/icon-96.png',
          tag: 'irl-digest',
        });
      } else {
        new Notification(`You have ${todaysSaved.length} events saved for today`, {
          body: todaysSaved
            .slice(0, 3)
            .map((e) => e.title)
            .join(', '),
          icon: '/irl/icons/icon-192.png',
          badge: '/irl/icons/icon-96.png',
          tag: 'irl-digest',
        });
      }
    };

    // Small delay so app has time to render first
    const timer = setTimeout(show, 2000);
    return () => clearTimeout(timer);
  }, [enabled, permission, savedEventIds, allEvents]);

  const hasAskedPermission = localStorage.getItem(PERM_ASKED_KEY) === 'true';

  return {
    permission,
    enabled,
    hasAskedPermission,
    requestPermission,
    toggleEnabled,
    isSupported: 'Notification' in window,
  };
}
