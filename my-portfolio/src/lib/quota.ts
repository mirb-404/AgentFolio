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

export async function fetchQuota(): Promise<Quota | null> {
    try {
        const res = await fetch('/api/chat', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        return data.quota ?? null;
    } catch {
        return null;
    }
}

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
        ? "Today's shared AI budget for this site is used up — lots of visitors!"
        : "You've used up your AI allowance for now.";
    return `${who}${reset}\n\nThe topic shortcuts still work in the meantime — try **Projects**, **Experience**, **Skills** or **Résumé**, or reach Mirang directly with **Contact me**.`;
}
