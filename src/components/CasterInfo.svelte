<script lang="ts">
    import type { CasterData } from "../types/CasterData";

    let { caster = $bindable() }: { caster: CasterData } = $props();
</script>

<section class="panel">
    <input type="text" placeholder="Name" aria-label="Caster Name" bind:value={caster.name} />
    <div class="caster-socials" role="group" aria-label="Social media">
        <input type="text" placeholder="Twitter" aria-label="Twitter Handle" bind:value={caster.twitter} />
        <input type="text" placeholder="Twitch" aria-label="Twitch Handle" bind:value={caster.twitch} />
    </div>
</section>

<style>
    .caster-socials {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    input {
        min-width: 0;
    }

</style>
