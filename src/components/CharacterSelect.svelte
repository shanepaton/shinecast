<script lang="ts">
    import { cubicOut } from "svelte/easing";
    import Dropdown from "./Dropdown.svelte";
    import PortSelect from "./PortSelect.svelte";
    import characters from "../data/characters.json";
    import type { PlayerData } from "../types/PlayerData";

    let { player = $bindable() }: { player: PlayerData } = $props();

    // Image paths have spaces and, for Mr. Game & Watch, an "&". encodeURI leaves the "&" alone; encodeURIComponent
    // would turn it into "%26", which the dev server answers with a 404.
    const imageUrl = (path: string) => encodeURI(`/images/characters/${path}.png`);
    const characterOptions = characters.map(({ name }) => ({ label: name, image: imageUrl(`Stock Icons/${name}/Default`) }));

    // Skin buttons turn this colour when selected. Skins not listed (Default, Headband, Party Hat...) stay grey.
    const skinColors: Record<string, string> = {
        Red: "#e5484d", Blue: "#4c7dff", Green: "#3fb950", Yellow: "#e8c33f", Orange: "#f0883e", Pink: "#f06ea9",
        Purple: "#a06bff", Cyan: "#3cc7d6", Black: "#07090d", White: "#e5e7ec", Daisy: "#f0b840", Crown: "#f0b840",
    };

    // Always draw as many skin slots as the character with the most skins, so the row never changes width.
    const maxSkins = Math.max(...characters.map(({ skins }) => skins.length));
    const character = $derived(characters[player.character ?? -1]); // undefined until one is picked

    function chooseCharacter(name: string) {
        const index = characters.findIndex((candidate) => candidate.name === name);
        if (index === player.character) return;
        player.character = index;
        player.skin = 0;
    }

    // Which slots have a button in them. A slot only shows its dotted outline once its button has finished leaving.
    let slotHasButton = $state(Array(maxSkins).fill(false));

    // How a skin button leaves: it is pressed in like a normal button press while its icon fades out.
    function pressOut(_: Element, { pressed }: { pressed: boolean }) {
        const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
        return {
            duration: reduceMotion ? 0 : 200,
            easing: cubicOut,
            css: (fadeIn: number, progress: number) =>
                `transform: translateY(calc(var(--press-depth) * ${pressed ? 1 : progress})); box-shadow: none; --icon-opacity: ${fadeIn}`,
        };
    }
</script>

{#snippet icon()}
    <img src={imageUrl(`CSS/${character?.name ?? "Random"}`)} alt="" />
{/snippet}

<div class="select">
    <Dropdown label="Character" options={characterOptions} bind:value={() => character?.name ?? "", chooseCharacter} trigger={icon} />
    <div class="skins" role="group" aria-label="Skin and controller port">
        {#each { length: maxSkins }, index}
            {@const skin = character?.skins[index]}
            <span class="slot" class:empty={!slotHasButton[index]}>
                {#if skin}
                    <button type="button" aria-label={skin} title={skin} style:--tint={skinColors[skin]} aria-pressed={player.skin === index}
                        {@attach () => void (slotHasButton[index] = true)} onoutroend={() => (slotHasButton[index] = false)}
                        onclick={() => (player.skin = index)} out:pressOut={{ pressed: player.skin === index }}>
                        <img src={imageUrl(`Stock Icons/${character.name}/${skin}`)} alt="" />
                    </button>
                {/if}
            </span>
        {/each}
        <PortSelect bind:player />
    </div>
</div>

<style>
    .select {
        display: flex;
        align-items: center;
        gap: var(--spacing);
        justify-self: start;
    }

    .skins {
        display: flex;
        flex-wrap: wrap;
        align-items: center; /* don't stretch the slots to the height of the taller port control */
        gap: var(--spacing);
    }

    .slot {
        display: grid;
        width: var(--cell);
        aspect-ratio: 1;
        border-radius: var(--radius);
    }

    /* An outline, not a border, so the button inside never changes size. It only shows once the slot is empty. */
    .empty {
        outline: 2px dotted var(--border);
        outline-offset: -2px;
    }

    .skins button {
        display: grid;
        place-items: center;
        padding: 0;
        animation: unpress 160ms ease-out; /* plays only when a button first appears, so buttons already up stay put */
    }

    /* Start sunk like a pressed button, then pop up to the raised state. */
    @keyframes unpress {
        from {
            transform: translateY(var(--press-depth));
            box-shadow: none;
        }
    }

    .skins button[aria-pressed="true"] {
        background: color-mix(in srgb, var(--tint, var(--input)) 80%, var(--input));
    }

    img {
        display: block;
    }

    .skins img {
        width: var(--stock-icon);
        opacity: var(--icon-opacity, 1); /* set by the exit transition */
    }
</style>
