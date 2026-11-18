<script lang="ts">
    import Dropdown from "./Dropdown.svelte";
    import IconButton from "./IconButton.svelte";
    import StatusLogo from "./StatusLogo.svelte";
    import { errorMessage } from "../lib/errors";
    import { isSignedIn, signIn, signOut } from "../lib/startgg/auth";
    import { fetchTournaments, type StartggTournament } from "../lib/startgg/tournaments";
    import type { ConnectionState } from "../types/ConnectionData";
    import type { EventSelection } from "../types/EventSelection";
    import type { TournamentData } from "../types/TournamentData";

    type Props = {
        tournament: TournamentData;
        selection: EventSelection;
        status: ConnectionState;
        signedIn: boolean;
        onclose: () => void;
    };
    let { tournament = $bindable(), selection = $bindable(), status = $bindable(), signedIn = $bindable(), onclose }: Props = $props();

    let tournaments = $state<StartggTournament[]>([]);
    let loading = $state(false);
    let startggError = $state("");

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
</script>

<!-- Escape leaves settings, unless a dropdown has just used it to close its list. -->
<svelte:window onkeydown={(event) => event.key === "Escape" && !event.defaultPrevented && onclose()} />

<div class="settings" role="dialog" aria-modal="true" aria-label="Settings">
    <div class="container">
        <header class="panel service">
            <input type="text" placeholder="Tournament name" aria-label="Tournament name" bind:value={tournament.name} />
            <IconButton icon="home" label="Home" onclick={onclose} />
        </header>

        <section class="panel">
            <div class="service">
                <StatusLogo name="start.gg" logo="/images/startdotgg.svg" state={status} />
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

    /* Just the name box and the Home button for now, so there is no icon column. */
    header {
        grid-template-columns: minmax(0, 1fr) auto;
    }

    p {
        grid-column: 1 / -1; /* an error runs the full width under its row */
        margin: 0;
        color: #e5484d;
    }
</style>
