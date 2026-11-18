<script lang="ts">
    import CasterInfo from "../components/CasterInfo.svelte";
    import PlayerInfo from "../components/PlayerInfo.svelte";
    import RoundInfo from "../components/RoundInfo.svelte";

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
        socials: { twitter: "", discord: "", youtube: "" },
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
</script>

<main class="container">
    <div class="row">
        <PlayerInfo bind:player={player1} />
        <PlayerInfo bind:player={player2} />
    </div>
    <RoundInfo bind:tournament />
    <div class="row">
        <CasterInfo bind:caster={caster1} />
        <CasterInfo bind:caster={caster2} />
    </div>
</main>
