<script lang="ts">
    import CasterInfo from "../components/CasterInfo.svelte";
    import ConnectionStatus from "../components/ConnectionStatus.svelte";
    import PlayerInfo from "../components/PlayerInfo.svelte";
    import RoundInfo from "../components/RoundInfo.svelte";
    import StartggSets from "../components/StartggSets.svelte";

    import type { StartggSet } from "../lib/startgg";
    import type { ConnectionData } from "../types/ConnectionData";

    import type { TournamentData } from "../types/TournamentData";
    import type { CasterData } from "../types/CasterData";
    import type { PlayerData } from "../types/PlayerData";

    let tournament = $state<TournamentData>({
        name: "",
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

    // Only start.gg is wired up so far; Slippi and OBS stay disconnected.
    let connections = $state<ConnectionData>({ slippi: "disconnected", obs: "disconnected", startgg: "disconnected" });

    // Fills in who is playing and the round. Port, character, skin and the rest of the on-stream setup are left alone.
    function loadSet({ round, bestOf, players }: StartggSet) {
        Object.assign(player1, players[0]);
        Object.assign(player2, players[1]);
        tournament.round = round;
        if (bestOf) tournament.bestOf = bestOf;
    }
</script>

<main class="container">
    <StartggSets bind:status={connections.startgg} onselect={loadSet} />
    <div class="row">
        <PlayerInfo bind:player={player1} />
        <PlayerInfo bind:player={player2} />
    </div>
    <RoundInfo bind:tournament />
    <div class="row">
        <CasterInfo bind:caster={caster1} />
        <CasterInfo bind:caster={caster2} />
    </div>
    <ConnectionStatus {connections} />
</main>
