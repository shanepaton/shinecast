import { request } from "./client";

// OBS lists scenes bottom to top, so they're flipped to match the order in its own scene list.
export async function fetchScenes(): Promise<string[]> {
    const { scenes } = await request<{ scenes: { sceneName: string }[] }>("GetSceneList");
    return scenes.map((scene) => scene.sceneName).reverse();
}
