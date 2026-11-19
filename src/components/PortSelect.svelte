<script lang="ts">
    import Dropdown from "./Dropdown.svelte";
    import type { PlayerData } from "../types/PlayerData";

    let { player = $bindable() }: { player: PlayerData } = $props();

    // Each port has its own coloured badge: an outline normally, filled in while the button is pressed or its list is open.
    const portImage = (port: number, filled = false) => `/images/ui/ports/p${port}${filled ? "" : "-outline"}.svg`;
    const portOptions = [1, 2, 3, 4].map((port) => ({ label: `Port ${port}`, image: portImage(port, true) }));
</script>

{#snippet port()}
    <img class="outline" src={portImage(player.port)} alt="" />
    <img class="filled" src={portImage(player.port, true)} alt="" />
{/snippet}

<div class="port-select">
    <Dropdown label="Controller port" options={portOptions} trigger={port}
        bind:value={() => `Port ${player.port}`, (label) => (player.port = Number(label.replace("Port ", "")))} />
</div>

<style>
    /* Both badges sit in the same spot and the pressed one takes over, so there is no flicker from loading it on press. */
    .port-select :global(.trigger) {
        display: grid;
        place-content: center;
        width: var(--cell);
        min-height: var(--cell);
    }

    img {
        grid-area: 1 / 1;
        width: 2.5rem;
        height: 2.5rem;
    }

    .filled {
        visibility: hidden;
    }

    .port-select :global(.trigger:active .filled), .port-select :global(.open .filled) {
        visibility: visible;
    }

    .port-select :global(.trigger:active .outline), .port-select :global(.open .outline) {
        visibility: hidden;
    }
</style>
