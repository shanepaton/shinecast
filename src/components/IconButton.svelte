<script lang="ts">
    // A square button holding just a white SVG from static/images, which is used as a mask so it takes the text colour.
    type Props = { icon: string; label: string; onclick: () => void; disabled?: boolean };
    let { icon, label, onclick, disabled = false }: Props = $props();
</script>

<button type="button" class="icon-button" aria-label={label} title={label} {onclick} {disabled}>
    <span style:--icon="url(/images/ui/icons/{icon}.svg)"></span>
</button>
