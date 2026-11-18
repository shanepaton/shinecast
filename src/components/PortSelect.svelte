<script lang="ts">
    import Dropdown from "./Dropdown.svelte";
    import type { PlayerData } from "../types/PlayerData";

    let { player = $bindable() }: { player: PlayerData } = $props();

    const portImage = "/images/port.svg";
    const portColors = ["#e5484d", "#4c7dff", "#e8c33f", "#3fb950"]; // ports 1 to 4: red, blue, yellow, green
    const portOptions = portColors.map((_, index) => ({ label: `Port ${index + 1}`, image: portImage }));
</script>

{#snippet port()}
    <span class="dots" aria-hidden="true">
        {#each { length: player.port }}<span></span>{/each}
    </span>
    <span class="icon masked-icon" style:--tint={portColors[player.port - 1]} style:--icon="url({portImage})"></span>
{/snippet}

<div class="port-select">
    <Dropdown label="Controller port" options={portOptions} trigger={port}
        bind:value={() => `Port ${player.port}`, (label) => (player.port = Number(label.replace("Port ", "")))} />
</div>

<style>
    /* One dot per port number, like the player lights on a Wii remote. They never change colour. */
    .dots {
        display: flex;
        justify-content: center;
        gap: 3px;
        margin-bottom: 4px;
    }

    .dots span {
        width: 6px;
        aspect-ratio: 1;
        border-radius: 50%;
        background: var(--border);
    }

    /* The port icon is taller than a normal icon and keeps the proportions of its SVG. */
    .icon {
        width: auto;
        height: 2.5rem;
        aspect-ratio: 176 / 169;
    }

    /* As wide as a skin slot so the row stays even, as tall as the dots and icon need. */
    .port-select :global(.trigger) {
        display: grid;
        place-content: center;
        width: var(--cell);
        min-height: var(--cell);
    }
</style>
