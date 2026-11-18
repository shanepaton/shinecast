<script lang="ts">
    // A text box for whole numbers: anything that isn't a digit is dropped as it's typed or pasted, and it stops at
    // `max` digits. The unit, such as "ms", is shown inside the box at the right. The limit is applied by hand instead
    // of with maxlength, so a pasted "12a34b56" is cleaned before it is cut short.
    type Props = { value: string; label: string; placeholder?: string; max: number; unit?: string; disabled?: boolean };
    let { value = $bindable(), label, placeholder, max, unit, disabled = false }: Props = $props();

    function onInput(event: Event & { currentTarget: HTMLInputElement }) {
        value = event.currentTarget.value.replace(/\D/g, "").slice(0, max);
        event.currentTarget.value = value; // the box shows the cleaned number even when `value` itself didn't change
    }
</script>

<label>
    <input type="text" inputmode="numeric" aria-label={label} {placeholder} {value} {disabled} oninput={onInput} class:with-unit={unit} />
    {#if unit}<span>{unit}</span>{/if}
</label>

<style>
    label {
        position: relative;
        display: block;
    }

    input {
        box-sizing: border-box;
        width: 100%;
    }

    input.with-unit {
        padding-right: 3rem; /* room for the unit */
    }

    span {
        position: absolute;
        top: 50%;
        right: var(--spacing);
        translate: 0 -50%;
        pointer-events: none;
        color: color-mix(in srgb, var(--text) 60%, transparent);
    }

    input:disabled + span {
        opacity: 0.4;
    }
</style>
