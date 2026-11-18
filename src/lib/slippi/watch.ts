import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ConnectionState } from "../../types/ConnectionData";
import type { SlippiEvent } from "../../types/SlippiEvent";

// The folder is typed into a box, and every key changes it. Watching starts once typing has paused this long.
const SETTLE_MS = 400;

/**
 * Has the app watch a replay folder, passing each game's start and end to `onevent` and the state of the watch to
 * `report`. Returns a function that stops watching, which suits being returned from an effect.
 */
export function watchSlippi(folder: string, onevent: (event: SlippiEvent) => void, report: (state: ConnectionState) => void) {
    if (!folder) {
        report("disconnected");
        return () => {};
    }
    report("connecting");

    let stopped = false;
    let unlisten = () => {};

    async function start() {
        const stopListening = await listen<SlippiEvent>("slippi", (event) => onevent(event.payload));
        if (stopped) return stopListening(); // otherwise a watch would be started that nothing is left to stop
        unlisten = stopListening;
        await invoke("watch_slippi", { folder });
        if (!stopped) report("connected");
    }
    const timer = setTimeout(() => start().catch(() => stopped || report("error")), SETTLE_MS);

    return () => {
        stopped = true;
        clearTimeout(timer);
        unlisten();
        invoke("stop_slippi");
    };
}
