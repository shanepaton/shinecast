// Lets something happen at most once every `ms`, such as a request that opening a dropdown would otherwise repeat.
// Ask `ready()` each time. It says yes and starts the wait, or no if the last yes was too recent.
export function cooldown(ms: number) {
    let last = 0;
    return {
        ready() {
            if (Date.now() - last < ms) return false;
            last = Date.now();
            return true;
        },
        reset() {
            last = 0;
        },
    };
}
