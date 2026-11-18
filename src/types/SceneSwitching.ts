// One automatic scene switch: which OBS scene to go to, and how many milliseconds to wait before doing it.
export interface SceneSwitch {
    scene: string;
    delay: string; // kept as text because it's typed into a box
}

export interface SceneSwitching {
    enabled: boolean;
    gameScene: SceneSwitch; // when a game starts
    gameEnd: SceneSwitch; // when a game ends
    setEnd: SceneSwitch; // when the whole set is over
}
