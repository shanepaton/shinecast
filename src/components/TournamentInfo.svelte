<script lang="ts">
    import type { TournamentData } from "../types/TournamentData";

    let { tournament = $bindable() }: { tournament: TournamentData } = $props();
</script>

<section class="panel">
    <div class="tournament-info">
        <input type="text" placeholder="Tournament Name" aria-label="Tournament Name" bind:value={tournament.name} />
        <select aria-label="Tournament round" bind:value={tournament.round}>
            <option value="">Select round</option>
        </select>
    </div>
    <div class="formats" role="group" aria-label="Match format">
        <button type="button" aria-pressed={tournament.bestOf === 3} onclick={() => tournament.bestOf = 3}>Best of 3</button>
        <button type="button" aria-pressed={tournament.bestOf === 5} onclick={() => tournament.bestOf = 5}>Best of 5</button>
        <button type="button" aria-pressed={tournament.bestOf === "crews"} onclick={() => tournament.bestOf = "crews"}>Crews</button>
        <button type="button" aria-pressed={tournament.bestOf === "endless"} onclick={() => tournament.bestOf = "endless"}>Endless</button>
    </div>
</section>

<style>
    .tournament-info {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .tournament-info > * {
        min-width: 0;
    }
    .formats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.5rem;
    }

</style>
