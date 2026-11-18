import type { SceneSwitch } from "../../types/SceneSwitching";
import { request } from "./client";

// OBS returns scenes bottom to top (not yet checked against a real OBS), so they're flipped to match the order in its own
// scene list.
export async function fetchScenes(): Promise<string[]> {
    const { scenes } = await request<{ scenes: { sceneName: string }[] }>("GetSceneList");
    return scenes.map((scene) => scene.sceneName).reverse();
}

let pending: ReturnType<typeof setTimeout> | undefined;

/**
 * Goes to a scene once its delay has passed. Does nothing when no scene is chosen. A switch still waiting is dropped, so
 * a slow one for the end of a game can't pull the stream away from the game that has started since.
 */
export function switchAfter({ scene, delay }: SceneSwitch) {
    clearTimeout(pending);
    if (!scene) return;
    pending = setTimeout(() => request("SetCurrentProgramScene", { sceneName: scene }).catch(() => {}), Number(delay) || 0);
}
