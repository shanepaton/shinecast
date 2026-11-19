<script lang="ts">
    import { open } from "@tauri-apps/plugin-dialog";
    import Dropdown from "./Dropdown.svelte";
    import IconButton from "./IconButton.svelte";
    import NumberInput from "./NumberInput.svelte";
    import StatusLogo from "./StatusLogo.svelte";
    import Toggle from "./Toggle.svelte";
    import { errorMessage } from "../lib/errors";
    import { isSignedIn, signIn, signOut } from "../lib/startgg/auth";
    import { fetchTournaments, type StartggTournament } from "../lib/startgg/tournaments";
    import type { ConnectionData, ConnectionState } from "../types/ConnectionData";
    import type { EventSelection } from "../types/EventSelection";
    import type { ObsData } from "../types/ObsData";
    import type { SceneSwitching } from "../types/SceneSwitching";
    import type { TournamentData } from "../types/TournamentData";

    type Props = {
        tournament: TournamentData;
        selection: EventSelection;
        slippi: { folder: string };
        obs: ObsData;
        sceneSwitching: SceneSwitching;
        obsScenes: string[];
        obsError: string;
        connections: ConnectionData; // Slippi's and OBS's logos. start.gg's is `status`
        status: ConnectionState;
        signedIn: boolean;
        onscenes: () => void;
        onobsconnect: () => void;
        onobsdisconnect: () => void;
        onclose: () => void;
    };
    let {
        tournament = $bindable(), selection = $bindable(), slippi = $bindable(), obs = $bindable(), sceneSwitching = $bindable(),
        obsScenes, obsError, connections, status = $bindable(), signedIn = $bindable(),
        onscenes, onobsconnect, onobsdisconnect, onclose,
    }: Props = $props();

    // The three moments OBS can switch scenes on, and where each one's settings live in `sceneSwitching`.
    const triggers = [
        { key: "gameScene", label: "Game Scene" },
        { key: "gameEnd", label: "Game End" },
        { key: "setEnd", label: "Set End" },
    ] as const;

    let tournaments = $state<StartggTournament[]>([]);
    let loading = $state(false);
    let startggError = $state("");
    let folderError = $state("");

    const obsOnline = $derived(connections.obs === "connected");
    const brackets = $derived(tournaments.find((candidate) => candidate.name === selection.tournament)?.events ?? []);
    const tournamentNames = $derived(tournaments.map((item) => item.name));
    const bracketNames = $derived(brackets.map((item) => item.name));

    const tournamentPlaceholder = $derived(
        !signedIn ? "Connect start.gg first"
        : loading ? "Loading…"
        : tournaments.length ? "Pick a tournament"
        : "No tournaments found",
    );
    const bracketPlaceholder = $derived(selection.tournament ? "Pick a bracket" : "Pick a tournament first");

    async function loadTournaments() {
        loading = true;
        startggError = "";
        try {
            tournaments = await fetchTournaments();
        } catch (e) {
            startggError = errorMessage(e);
        }
        loading = false;
        signedIn = isSignedIn(); // a refused login is cleared, which means signed out
    }

    $effect(() => {
        if (signedIn) loadTournaments();
    });

    async function connect() {
        status = "connecting";
        startggError = "";
        try {
            await signIn();
            status = "connected";
        } catch (e) {
            status = "error";
            startggError = errorMessage(e);
        }
        signedIn = isSignedIn();
    }

    function disconnect() {
        signOut();
        signedIn = false;
        status = "disconnected";
        startggError = "";
        tournaments = [];
    }

    // The tournament also names the tournament in the rest of the app. A tournament with a single bracket needs no
    // second pick.
    function chooseTournament(name: string) {
        const picked = tournaments.find((candidate) => candidate.name === name);
        if (!picked) return;

        tournament.name = picked.name;
        const only = picked.events.length === 1 ? picked.events[0] : undefined;
        selection = { tournament: picked.name, event: only?.name ?? "", slug: only?.slug ?? "" };
    }

    function chooseBracket(name: string) {
        const picked = brackets.find((candidate) => candidate.name === name);
        if (picked) selection = { ...selection, event: picked.name, slug: picked.slug };
    }

    async function chooseFolder() {
        folderError = "";
        try {
            const folder = await open({ directory: true, defaultPath: slippi.folder || undefined, title: "Slippi replay folder" });
            if (folder) slippi.folder = folder;
        } catch (e) {
            folderError = errorMessage(e);
        }
    }
</script>

<!-- Escape leaves settings, unless a dropdown has just used it to close its list. -->
<svelte:window onkeydown={(event) => event.key === "Escape" && !event.defaultPrevented && onclose()} />

<div class="settings" role="dialog" aria-modal="true" aria-label="Settings">
    <div class="container">
        <header class="panel service">
            <span
                class="masked-icon" role="img" aria-label="Tournament info" title="The tournament name shows in the window title"
                style:--icon="url(/images/ui/icons/info.svg)"
            ></span>
            <input type="text" placeholder="Tournament name" aria-label="Tournament name" bind:value={tournament.name} />
            <IconButton icon="home" label="Home" onclick={onclose} />
        </header>

        <section class="panel service">
            <StatusLogo name="Slippi" logo="/images/ui/logos/slippi.svg" state={connections.slippi} />
            <input type="text" placeholder="Slippi replay folder" aria-label="Slippi replay folder" bind:value={slippi.folder} />
            <IconButton icon="folder" label="Choose folder" onclick={chooseFolder} />
            {#if folderError}<p role="alert">{folderError}</p>{/if}
        </section>

        <section class="panel service obs">
            <StatusLogo name="OBS" logo="/images/ui/logos/obs.svg" state={connections.obs} />
            <!-- 45 characters is the longest an IPv6 address gets. The password has no limit, since OBS sets none. -->
            <input type="text" maxlength="45" placeholder="IP address" aria-label="OBS IP address" bind:value={obs.ip} />
            <NumberInput bind:value={obs.port} label="OBS port" placeholder="Port" max={5} />
            <input type="password" placeholder="Password" aria-label="OBS password" autocomplete="off" bind:value={obs.password} />
            {#if obsOnline}
                <IconButton icon="unplug" label="Disconnect OBS" onclick={onobsdisconnect} />
            {:else}
                <IconButton icon="plug" label="Connect OBS" onclick={onobsconnect} disabled={connections.obs === "connecting"} />
            {/if}
            {#if obsError}<p role="alert">{obsError}</p>{/if}

            <div class="switching">
                <span>Automatically switch scenes</span>
                <Toggle label="Automatically switch scenes" bind:checked={sceneSwitching.enabled} disabled={!obsOnline} />
            </div>
            <!-- Three columns of two: the scene to go to, and how long to wait before going. -->
            <div class="scene-grid">
                {#each triggers as { key, label }}
                    <Dropdown
                        {label} placeholder={label} options={obsScenes} bind:value={sceneSwitching[key].scene}
                        disabled={!obsOnline} onopen={onscenes}
                    />
                    <NumberInput
                        bind:value={sceneSwitching[key].delay} label="{label} switch delay" placeholder="Delay" max={5} unit="ms"
                        disabled={!obsOnline}
                    />
                {/each}
            </div>
        </section>

        <section class="panel">
            <div class="service">
                <StatusLogo name="start.gg" logo="/images/ui/logos/startdotgg.svg" state={status} />
                <span>{status === "connecting" ? "Waiting for start.gg…" : signedIn ? "Start.gg connected" : "Not connected"}</span>
                {#if signedIn}
                    <IconButton icon="unplug" label="Disconnect start.gg" onclick={disconnect} disabled={status === "connecting"} />
                {:else}
                    <IconButton icon="plug" label="Connect start.gg" onclick={connect} disabled={status === "connecting"} />
                {/if}
            </div>
            {#if startggError}<p role="alert">{startggError}</p>{/if}

            <div class="row">
                <Dropdown
                    label="Tournament" placeholder={tournamentPlaceholder} options={tournamentNames} value={selection.tournament}
                    disabled={!signedIn} onselect={chooseTournament}
                />
                <Dropdown
                    label="Bracket" placeholder={bracketPlaceholder} options={bracketNames} value={selection.event}
                    disabled={!signedIn || !selection.tournament} onselect={chooseBracket}
                />
            </div>
        </section>
    </div>
</div>

<style>
    .settings {
        position: fixed;
        inset: 0;
        z-index: 20; /* over the dropdown menus */
        overflow-y: auto;
        background: var(--bg);
    }

    /* The shared service row is logo, box, button. OBS squeezes its address, port and password into the middle. */
    .obs {
        grid-template-columns: auto minmax(0, 1fr) 6rem minmax(0, 1fr) auto;
    }

    .switching, .scene-grid {
        grid-column: 1 / -1;
    }

    .switching {
        display: flex;
        align-items: center;
        justify-content: space-between; /* the label on the left, the switch at the right end */
        gap: var(--spacing);
    }

    /* Filling by column puts each scene dropdown above its delay. */
    .scene-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        grid-template-rows: auto auto;
        grid-auto-flow: column;
        gap: var(--spacing);
    }

    p {
        grid-column: 1 / -1; /* an error runs the full width under its row */
        margin: 0;
        color: #e5484d;
    }
</style>
