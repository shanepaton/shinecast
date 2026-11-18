<script lang="ts">
    import CasterInfo from "../components/CasterInfo.svelte";
    import IconButton from "../components/IconButton.svelte";
    import PlayerInfo from "../components/PlayerInfo.svelte";
    import RoundInfo from "../components/RoundInfo.svelte";
    import Settings from "../components/Settings.svelte";
    import StartggSets from "../components/StartggSets.svelte";
    import { isSignedIn } from "../lib/startgg/auth";
    import type { StartggSet } from "../lib/startgg/sets";
    import { loadSaved, save } from "../lib/storage";
    import type { CasterData } from "../types/CasterData";
    import type { ConnectionData } from "../types/ConnectionData";
    import type { EventSelection } from "../types/EventSelection";
    import type { PlayerData } from "../types/PlayerData";
    import type { TournamentData } from "../types/TournamentData";

    // The bracket picked in settings. It's remembered between launches, and its tournament names the tournament.
    const saved = loadSaved<EventSelection>("startgg-selection", { tournament: "", event: "", slug: "" });
    let selection = $state(saved);
    $effect(() => save("startgg-selection", selection));

    let tournament = $state<TournamentData>({
        name: saved.tournament,
        round: "",
        bestOf: 3,
        nextUp: [],
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

    // start.gg and OBS connect from settings. Slippi has nothing to connect to yet, so its logo stays grey.
    const hadLogin = isSignedIn();
    let signedIn = $state(hadLogin);
    let connections = $state<ConnectionData>({
        slippi: "disconnected",
        obs: "disconnected",
        startgg: hadLogin ? "connected" : "disconnected",
    });

    let settingsOpen = $state(false);

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
        <IconButton icon="cog" label="Settings" onclick={() => (settingsOpen = true)} />
    </footer>
</main>

{#if settingsOpen}
    <Settings bind:tournament bind:selection bind:status={connections.startgg} bind:signedIn onclose={() => (settingsOpen = false)} />
{/if}

<style>
    /* The footer sits at the bottom of the window, however short the page above it is. */
    main {
        box-sizing: border-box;
        min-height: 100vh;
        grid-template-rows: auto auto auto 1fr;
    }

    .footer {
        display: flex;
        justify-content: flex-end;
        align-self: end;
    }
</style>
