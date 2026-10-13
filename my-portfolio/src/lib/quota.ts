import { useSyncExternalStore } from 'react';

/** Longest message the server accepts (api/chat.js MAX_LEN.user) */
export const MAX_QUESTION_LENGTH = 1500;

/** A visitor's model-token allowance, as reported by /api/chat */
export type Quota = {
    used: number;
    limit: number;
    exhausted: boolean;
    /** Which budget ran out: this visitor's own, or the site-wide daily one */
    scope: 'visitor' | 'global' | null;
    /** Epoch ms when the allowance refills; null until the window has started */
    resetAt: number | null;
};

export type ChatInfo = { quota: Quota; models: string[] };

// The header badge and the chat both ask on page load; share one request
let pending: { at: number; promise: Promise<ChatInfo | null> } | null = null;

/** Quota plus the models the proxy rotates through (first = primary) */
export function fetchChatInfo(): Promise<ChatInfo | null> {
    if (pending && Date.now() - pending.at < 10_000) return pending.promise;
    const promise = fetch('/api/chat', { cache: 'no-store' })
        .then(res => (res.ok ? res.json() : null))
        .then(data => (data?.quota ? { quota: data.quota, models: data.models ?? [] } : null))
        .catch(() => null);
    pending = { at: Date.now(), promise };
    return promise;
}

export const fetchQuota = async (): Promise<Quota | null> => (await fetchChatInfo())?.quota ?? null;

// The model that wrote the latest answer, for the header badge
let lastModel: string | null = null;
const listeners = new Set<() => void>();
export const setLastModel = (model: string) => { lastModel = model; listeners.forEach(fn => fn()); };
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const useLastModel = () => useSyncExternalStore(subscribe, () => lastModel);

/** "4h 12m", "35m", "under a minute" */
export function formatReset(resetAt: number | null): string | null {
    if (!resetAt) return null;
    const mins = Math.ceil((resetAt - Date.now()) / 60_000);
    if (mins <= 1) return 'under a minute';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

export function exhaustedMessage(quota: Quota): string {
    const when = formatReset(quota.resetAt);
    const reset = when ? ` It refills in **${when}**.` : '';
    const who = quota.scope === 'global'
        ? "Today's shared AI budget for this site is used up. Lots of visitors today!"
        : "You've used up your AI allowance for now.";
    return `${who}${reset}\n\nThe topic shortcuts still work in the meantime: try **Projects**, **Experience**, **Skills** or **Résumé**, or reach Mirang directly with **Contact me**.`;
}
