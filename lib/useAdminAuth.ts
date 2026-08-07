'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  getIdTokenResult,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';

import { hasAdminPermission, normalizePermissions } from '@/lib/adminPermissions';
import type {
  AdminPermission,
  AdminRole,
  AdminSessionUser,
  AdminStatus,
} from '@/lib/adminTypes';
import { auth, db } from '@/lib/firebase';

type MeResponse = {
  ok?: boolean;
  message?: string;
  code?: string;
  user?: AdminSessionUser;
};

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return {} as MeResponse;
  try {
    return JSON.parse(text) as MeResponse;
  } catch {
    return {} as MeResponse;
  }
}

export function useAdminAuth() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AdminSessionUser | null>(null);

  const endSession = useCallback(
    async (reason: 'disabled' | 'expired' = 'expired') => {
      await Promise.allSettled([
        signOut(auth),
        fetch('/api/admin/session', { method: 'DELETE' }),
      ]);
      setReady(false);
      setUser(null);
      router.replace(`/admin/login?error=${reason}`);
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;

      try {
        if (!firebaseUser) {
          throw new Error('Missing Firebase administrator session.');
        }

        const [tokenResult, response] = await Promise.all([
          getIdTokenResult(firebaseUser, true),
          fetch('/api/admin/me', {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          }),
        ]);
        const data = await readResponse(response);

        if (!response.ok || !data.user) {
          await endSession(data.code === 'ACCOUNT_DISABLED' ? 'disabled' : 'expired');
          return;
        }

        if (tokenResult.claims.admin !== true) {
          throw new Error('The Firebase account is not an administrator.');
        }

        if (cancelled) return;
        setUser(data.user);
        setReady(true);

        unsubscribeProfile = onSnapshot(
          doc(db, 'adminUsers', firebaseUser.uid),
          async (snapshot) => {
            if (!snapshot.exists()) {
              await endSession('disabled');
              return;
            }

            const profile = snapshot.data();
            const status = String(profile.status || 'disabled') as AdminStatus;
            if (status !== 'active') {
              await endSession('disabled');
              return;
            }

            const role = String(profile.role || data.user?.role || 'staff') as AdminRole;
            setUser((current) =>
              current
                ? {
                    ...current,
                    fullName: String(profile.fullName || current.fullName),
                    email: String(profile.email || current.email),
                    role,
                    status,
                    permissions: normalizePermissions(
                      role,
                      Array.isArray(profile.permissions)
                        ? profile.permissions
                        : current.permissions,
                    ),
                  }
                : current,
            );
          },
          (error) => {
            console.error('Admin profile listener failed:', error);
          },
        );
      } catch (error) {
        console.error('Admin authentication failed:', error);
        if (!cancelled) await endSession('expired');
      }
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
      unsubscribeProfile?.();
    };
  }, [endSession]);

  useEffect(() => {
    if (!ready) return;

    const updatePresence = (online: boolean) => {
      void fetch('/api/admin/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ online }),
        keepalive: !online,
      }).catch(() => undefined);
    };

    updatePresence(true);
    const interval = window.setInterval(() => updatePresence(true), 60_000);
    const onVisibility = () => updatePresence(document.visibilityState === 'visible');
    const onPageHide = () => updatePresence(false);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [ready]);

  const can = useCallback(
    (permission: AdminPermission) =>
      Boolean(user && hasAdminPermission(user, permission)),
    [user],
  );

  return useMemo(
    () => ({ ready, user, can, endSession }),
    [ready, user, can, endSession],
  );
}
