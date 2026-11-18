<script lang="ts">
    let { label, checked = $bindable(), disabled = false }: { label: string; checked: boolean; disabled?: boolean } = $props();
</script>

<button type="button" role="switch" aria-checked={checked} aria-label={label} {disabled} onclick={() => (checked = !checked)}>
    <span></span>
</button>

<style>
    /* A raised track with a knob. Switched on it sinks in and takes the accent colour, like a pressed button. */
    button {
        width: 3.25rem;
        height: 1.75rem;
        padding: 0;
        border-radius: 1rem;
    }

    span {
        display: block;
        width: 1.25rem;
        aspect-ratio: 1;
        margin: 0 calc((1.75rem - 1.25rem) / 2);
        border-radius: 50%;
        background: var(--text);
        transition: translate var(--press-time);
    }

    button[aria-checked="true"] {
        background: var(--fg);
    }

    button[aria-checked="true"] span {
        translate: 1.5rem 0;
        background: var(--bg);
    }
</style>
