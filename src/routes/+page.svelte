<script lang="ts">
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import CasterInfo from "../components/CasterInfo.svelte";
    import IconButton from "../components/IconButton.svelte";
    import PlayerInfo from "../components/PlayerInfo.svelte";
    import RoundInfo from "../components/RoundInfo.svelte";
    import Settings from "../components/Settings.svelte";
    import StartggSets from "../components/StartggSets.svelte";
    import { cooldown } from "../lib/cooldown";
    import { connectObs, disconnectObs } from "../lib/obs/client";
    import { fetchScenes, switchAfter } from "../lib/obs/scenes";
    import { seatPlayers } from "../lib/slippi/players";
    import { watchSlippi } from "../lib/slippi/watch";
    import { isSignedIn } from "../lib/startgg/auth";
    import type { StartggSet } from "../lib/startgg/sets";
    import { loadSaved, save } from "../lib/storage";
    import type { CasterData } from "../types/CasterData";
    import type { ConnectionData } from "../types/ConnectionData";
    import type { EventSelection } from "../types/EventSelection";
    import type { ObsData } from "../types/ObsData";
    import type { PlayerData } from "../types/PlayerData";
    import type { SceneSwitch, SceneSwitching } from "../types/SceneSwitching";
    import type { SlippiEvent, SlippiPlayer } from "../types/SlippiEvent";
    import type { TournamentData } from "../types/TournamentData";

    // The bracket picked in settings. It's remembered between launches, and its tournament names the tournament.
    const saved = loadSaved<EventSelection>("startgg-selection", { tournament: "", event: "", slug: "" });
    let selection = $state(saved);
    $effect(() => save("startgg-selection", selection));

    // Where OBS and the Slippi replays are, also set in settings and remembered.
    let obs = $state(loadSaved<ObsData>("obs", { ip: "127.0.0.1", port: "4455", password: "" }));
    $effect(() => save("obs", obs));
    let slippi = $state(loadSaved("slippi", { folder: "" }));
    $effect(() => save("slippi", slippi));

    // Which OBS scene to switch to when a game starts, a game ends and a set ends, and after how many milliseconds.
    const noSwitch = { scene: "", delay: "0" };
    let sceneSwitching = $state(
        loadSaved<SceneSwitching>("obs-scenes", {
            enabled: false,
            gameScene: { ...noSwitch },
            gameEnd: { ...noSwitch },
            setEnd: { ...noSwitch },
        }),
    );
    $effect(() => save("obs-scenes", sceneSwitching));

    let tournament = $state<TournamentData>({
        name: saved.tournament,
        round: "",
        bestOf: 3,
        nextUp: [],
    });

    // The window is titled "shinecast", or "shinecast - <tournament>" once the tournament has a name.
    $effect(() => {
        const name = tournament.name.trim();
        const title = name ? `shinecast - ${name}` : "shinecast";
        document.title = title;
        try {
            getCurrentWindow().setTitle(title).catch(() => {});
        } catch {
            // not running inside the app (a plain browser), where the page title above is all there is
        }
    });

    const newPlayer = (port: number): PlayerData => ({
        prefix: "",
        name: "",
        pronouns: "",
        country: "",
        region: "",
        socials: { twitter: "" },
        skin: 0,
        port,
        score: 0,
        losers: false,
    });

    // the two players currently in the set
    let player1 = $state(newPlayer(1));
    let player2 = $state(newPlayer(2));

    const newCaster = (): CasterData => ({ name: "", twitter: "", twitch: "" });

    // two broadcasters
    let caster1 = $state(newCaster());
    let caster2 = $state(newCaster());

    // start.gg and OBS connect from settings. Slippi is connected whenever its replay folder can be watched.
    const hadLogin = isSignedIn();
    let signedIn = $state(hadLogin);
    let connections = $state<ConnectionData>({
        slippi: "disconnected",
        obs: "disconnected",
        startgg: hadLogin ? "connected" : "disconnected",
    });

    let settingsOpen = $state(false);

    // The OBS connection outlives the settings page, so the page keeps its state and passes the buttons down.
    let obsError = $state("");
    let obsScenes = $state<string[]>([]); // the scenes OBS has, for the dropdowns
    const sceneWait = cooldown(2000); // opening the three scene dropdowns in a row asks OBS once

    async function refreshScenes() {
        if (!sceneWait.ready()) return;
        try {
            obsScenes = await fetchScenes();
        } catch {
            // the dropdowns keep what they had, and the connection logo shows if OBS is really gone
        }
    }

    function connectToObs() {
        connectObs(obs, (state, error = "") => {
            connections.obs = state;
            obsError = error;
            if (state === "connected") {
                sceneWait.reset();
                refreshScenes();
            } else {
                obsScenes = [];
            }
        });
    }

    function disconnectFromObs() {
        disconnectObs();
        connections.obs = "disconnected";
        obsError = "";
        obsScenes = [];
    }

    // Goes to the scene chosen for a moment in the game, if switching is on and OBS is there to do it.
    function switchTo(change: SceneSwitch) {
        if (sceneSwitching.enabled && connections.obs === "connected") switchAfter(change);
    }

    function gameStarted(players: SlippiPlayer[]) {
        seatPlayers([player1, player2], players);
        switchTo(sceneSwitching.gameScene);
    }

    // Whoever won gets the point. Once someone has won the set, its scene replaces the game-end one.
    function gameEnded(winner: number | null) {
        const sides = [player1, player2];
        const won = sides.find(({ port }) => port === winner);
        if (won) won.score++;

        const { bestOf } = tournament; // crews and endless sets have no winning score to reach
        const setOver = typeof bestOf === "number" && sides.some(({ score }) => score > bestOf / 2);
        switchTo(setOver ? sceneSwitching.setEnd : sceneSwitching.gameEnd);
    }

    const onSlippi = (event: SlippiEvent) => (event.type === "start" ? gameStarted(event.players) : gameEnded(event.winner));

    // Watches the replay folder while one is chosen, and again whenever it changes.
    $effect(() => watchSlippi(slippi.folder.trim(), onSlippi, (state) => (connections.slippi = state)));

    // Will send what's on screen to the stream overlay. There's no overlay to send it to yet, so for now it does nothing.
    function updateOverlay() {}

    // Fills in who is playing and the round. Port, character, skin and the rest of the on-stream setup are left alone.
    function loadSet({ round, bestOf, players }: StartggSet) {
        Object.assign(player1, players[0]);
        Object.assign(player2, players[1]);
        tournament.round = round;
        if (bestOf) tournament.bestOf = bestOf;
    }
</script>

<main class="container">
    <div class="row">
        <PlayerInfo bind:player={player1} />
        <PlayerInfo bind:player={player2} />
    </div>
    <RoundInfo bind:tournament>
        <StartggSets bind:status={connections.startgg} bind:signedIn slug={selection.slug} onselect={loadSet} />
    </RoundInfo>
    <div class="row">
        <CasterInfo bind:caster={caster1} />
        <CasterInfo bind:caster={caster2} />
    </div>
    <footer class="panel footer">
        <button type="button" onclick={updateOverlay}>Update overlay</button>
        <IconButton icon="cog" label="Settings" onclick={() => (settingsOpen = true)} />
    </footer>
</main>

{#if settingsOpen}
    <Settings
        bind:tournament bind:selection bind:slippi bind:obs bind:sceneSwitching
        {obsScenes} {obsError} {connections} bind:status={connections.startgg} bind:signedIn
        onscenes={refreshScenes} onobsconnect={connectToObs} onobsdisconnect={disconnectFromObs} onclose={() => (settingsOpen = false)}
    />
{/if}

<style>
    /* The footer sits at the bottom of the window, however short the page above it is. */
    main {
        box-sizing: border-box;
        min-height: 100vh;
        grid-template-rows: auto auto auto 1fr;
    }

    .footer {
        grid-template-columns: minmax(0, 1fr) auto;
        align-self: end;
    }
</style>
