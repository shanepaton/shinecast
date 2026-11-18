<script lang="ts">
    import type { Snippet } from "svelte";
    import Dropdown from "./Dropdown.svelte";
    import rounds from "../data/rounds.json";
    import type { TournamentData } from "../types/TournamentData";

    let { tournament = $bindable(), children }: { tournament: TournamentData; children?: Snippet } = $props();

    const formats = [
        { value: 3, label: "Best of 3" },
        { value: 5, label: "Best of 5" },
        { value: "crews", label: "Crews" },
        { value: "endless", label: "Endless" },
    ] as const;
</script>

<section class="panel round-info">
    <div class="row formats" role="group" aria-label="Match format">
        {#each formats as { value, label }}
            <button type="button" aria-pressed={tournament.bestOf === value} onclick={() => (tournament.bestOf = value)}>{label}</button>
        {/each}
    </div>
    <Dropdown label="Tournament round" placeholder="Select or type round" options={rounds} bind:value={tournament.round} custom />
    {#if children}<div class="below">{@render children()}</div>{/if}
</section>

<style>
    .round-info {
        grid-template-columns: repeat(2, minmax(0, 1fr)); /* half and half */
        align-items: start;
    }

    .below {
        grid-column: 1 / -1; /* a row of its own, under both halves */
    }
</style>
