// Settings that are remembered between launches. A saved value fills in whatever the defaults leave out, so adding a
// field later doesn't break what's already saved, and a corrupt entry just falls back to the defaults.
export function loadSaved<T extends object>(key: string, defaults: T): T {
    try {
        return { ...defaults, ...JSON.parse(localStorage.getItem(key) ?? "{}") };
    } catch {
        return defaults;
    }
}

export const save = (key: string, value: object) => localStorage.setItem(key, JSON.stringify(value));
