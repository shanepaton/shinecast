<script lang="ts">
    import { untrack } from "svelte";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import CasterInfo from "../components/CasterInfo.svelte";
    import IconButton from "../components/IconButton.svelte";
    import PlayerInfo from "../components/PlayerInfo.svelte";
    import RoundInfo from "../components/RoundInfo.svelte";
    import Settings from "../components/Settings.svelte";
    import StartggSets from "../components/StartggSets.svelte";
    import { cooldown } from "../lib/cooldown";
    import { errorMessage } from "../lib/errors";
    import { connectObs, disconnectObs } from "../lib/obs/client";
    import { fetchScenes, switchAfter } from "../lib/obs/scenes";
    import { exportOverlay } from "../lib/overlay";
    import { seatPlayers } from "../lib/slippi/players";
    import { watchSlippi } from "../lib/slippi/watch";
    import { isSignedIn } from "../lib/startgg/auth";
    import type { StartggSet } from "../lib/startgg/sets";
    import { loadSaved, save } from "../lib/storage";
    import { swapGames, swapNames, swapPlayers } from "../lib/swap";
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

    // When a set ends the scores go back to 0, once the set-end scene switch has had its delay, so the final score is still
    // showing while the stream goes to its scene. A game that starts before then is the next set, so it resets right away.
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    function resetScores() {
        clearTimeout(resetTimer);
        resetTimer = undefined;
        player1.score = player2.score = 0;
    }

    function gameStarted(players: SlippiPlayer[]) {
        if (resetTimer) resetScores();
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
        clearTimeout(resetTimer);
        if (setOver) resetTimer = setTimeout(resetScores, Number(sceneSwitching.setEnd.delay) || 0);
    }

    const onSlippi = (event: SlippiEvent) => (event.type === "start" ? gameStarted(event.players) : gameEnded(event.winner));

    // Watches the replay folder while one is chosen, and again whenever it changes.
    $effect(() => watchSlippi(slippi.folder.trim(), onSlippi, (state) => (connections.slippi = state)));

    // Writes what's on screen to the overlay folder: a JSON file, a text file for each value, and the images.
    let overlayError = $state("");
    async function updateOverlay() {
        try {
            await exportOverlay({ players: [player1, player2], casters: [caster1, caster2], tournament });
            overlayError = "";
        } catch (e) {
            overlayError = errorMessage(e);
        }
    }

    // The overlay follows the match: it updates when a score, port, character or skin, the round or the format changes.
    // Names and the like are typed, so they wait for the button (or a set being loaded) instead of updating on every key.
    $effect(() => {
        for (const { score, port, character, skin } of [player1, player2]) void [score, port, character, skin];
        void [tournament.round, tournament.bestOf];
        untrack(updateOverlay);
    });

    // Swaps everything, or with a key held, just one half: Shift for who the players are, Alt for how the game is going.
    function swap({ shiftKey, altKey }: MouseEvent) {
        if (shiftKey) swapNames(player1, player2);
        else if (altKey) swapGames(player1, player2);
        else swapPlayers(player1, player2);
    }

    // Fills in who is playing and the round. Port, character, skin and the rest of the on-stream setup are left alone.
    function loadSet({ round, bestOf, players }: StartggSet) {
        Object.assign(player1, players[0]);
        Object.assign(player2, players[1]);
        tournament.round = round;
        if (bestOf) tournament.bestOf = bestOf;
        updateOverlay();
    }
</script>

<main class="container">
    <div class="row players">
        <PlayerInfo bind:player={player1} />
        <PlayerInfo bind:player={player2} />
        <!-- Sits on the seam beside the names, which keep clear of it. -->
        <div class="cutout">
            <button type="button" class="swap" aria-label="Swap players" title={"Swap players\nShift: names only\nAlt: characters, ports and scores only"} onclick={swap}>
                <span class="masked-icon" style:--icon="url(/images/ui/icons/swap.svg)"></span>
            </button>
        </div>
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
        {#if overlayError}<p role="alert">{overlayError}</p>{/if}
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

    .players {
        position: relative;
    }

    /* The ring stays put while the button inside it is pressed, so it is its own element rather than the button's outline. */
    .cutout {
        position: absolute;
        top: var(--spacing);
        left: 50%;
        translate: -50% 0;
        isolation: isolate; /* keeps the ring behind the button without dropping behind the panels */
    }

    /* A ring in the page colour cuts the button out of the panels behind it. It is drawn behind the button, not as an
       outline over it, so the button's shadow shows on the ring and sinks into it when pressed. */
    .cutout::before {
        content: "";
        position: absolute;
        inset: calc(-1 * var(--spacing));
        z-index: -1;
        border-radius: 50%;
        background: var(--bg);
    }

    .swap {
        display: block;
        height: 2.5rem; /* the height of the name line, so the two line up */
        padding: 0.5rem;
        border-radius: 50%;
        aspect-ratio: 1;
    }
</style>
