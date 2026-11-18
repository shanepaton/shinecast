<script lang="ts">
    import Dropdown from "./Dropdown.svelte";
    import rounds from "../data/rounds.json";
    import type { TournamentData } from "../types/TournamentData";

    let { tournament = $bindable() }: { tournament: TournamentData } = $props();
</script>

<section class="panel">
    <div class="row tournament-details">
        <input type="text" placeholder="Tournament Name" aria-label="Tournament Name" bind:value={tournament.name} />
        <Dropdown label="Tournament round" placeholder="Select or type round" options={rounds} bind:value={tournament.round} />
    </div>
    <div class="row formats" role="group" aria-label="Match format">
        <button type="button" aria-pressed={tournament.bestOf === 3} onclick={() => tournament.bestOf = 3}>Best of 3</button>
        <button type="button" aria-pressed={tournament.bestOf === 5} onclick={() => tournament.bestOf = 5}>Best of 5</button>
        <button type="button" aria-pressed={tournament.bestOf === "crews"} onclick={() => tournament.bestOf = "crews"}>Crews</button>
        <button type="button" aria-pressed={tournament.bestOf === "endless"} onclick={() => tournament.bestOf = "endless"}>Endless</button>
    </div>
</section>

<style>
    .tournament-details {
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    }
</style>
