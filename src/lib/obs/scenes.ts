import { request } from "./client";

// OBS returns scenes bottom to top (not yet checked against a real OBS), so they're flipped to match the order in its own
// scene list.
export async function fetchScenes(): Promise<string[]> {
    const { scenes } = await request<{ scenes: { sceneName: string }[] }>("GetSceneList");
    return scenes.map((scene) => scene.sceneName).reverse();
}
