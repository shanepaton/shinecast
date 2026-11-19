<script lang="ts">
    import CharacterSelect from "./CharacterSelect.svelte";
    import type { PlayerData } from "../types/PlayerData";

    let { player = $bindable() }: { player: PlayerData } = $props();
</script>

<section class="panel">
    <!-- The two lengths drive the font size below. An empty field counts as its placeholder so the line starts full size. -->
    <div class="names" style:--prefix-chars={Math.max(player.prefix.length, 6)} style:--name-chars={Math.max(player.name.length, 4)}>
        <input class="prefix" type="text" placeholder="Prefix" aria-label="Player Prefix" bind:value={player.prefix} />
        <span aria-hidden="true">|</span>
        <input class="name" type="text" maxlength="24" placeholder="Name" aria-label="Player Name" bind:value={player.name} />
    </div>
    <CharacterSelect bind:player />
    <div class="row score" role="group" aria-label="Score">
        <button type="button" aria-label="Decrease score" disabled={player.score <= 0} onclick={() => player.score--}>−</button>
        <output aria-live="polite">{player.score}</output>
        <button type="button" aria-label="Increase score" onclick={() => player.score++}>+</button>
    </div>
</section>

<style>
    section {
        --swap-room: 1rem; /* kept clear on both sides of the names for the swap button on the seam */
        container-type: inline-size; /* lets the name line size itself to the panel width (cqw) */
    }

    /* "Prefix | Name" as one line of big text with no boxes, centred in the panel. The text shrinks to fit as it
       gets longer: the width needed is about 0.62em per character (the prefix is 0.75 the size) plus the divider. */
    .names {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing);
        font-size: clamp(1rem, (100cqw - 2 * var(--spacing) - 2 * var(--swap-room)) / (0.62 * (0.75 * var(--prefix-chars) + var(--name-chars)) + 0.6), 2rem);
        line-height: 1.25;
        padding-inline: var(--swap-room);
    }

    .names span {
        color: var(--border);
    }

    .names input {
        field-sizing: content; /* each side is as wide as its text, so the whole line stays centred as you type */
        background: none;
        border: 0;
        border-radius: 0;
        padding: 0;
    }

    .prefix {
        font-size: 0.75em;
    }

    .score {
        font-size: 2rem; /* shared by the buttons (which inherit it) and the score */
        line-height: 1;
    }

    output {
        align-self: center;
        font-weight: 700;
        text-align: center;
        text-shadow: var(--shadow);
    }
</style>
