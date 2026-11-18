<script lang="ts">
    type Item = { label: string; image?: string };
    type Props = { options: (string | Item)[]; label: string; placeholder?: string; value?: string };
    let { options, label, placeholder = "Select or type an option", value = $bindable("") }: Props = $props();

    const id = $props.id();
    let input: HTMLInputElement;
    let query = $state<string | null>(null); // null = closed, "" = show every option
    let highlighted = $state(-1);

    const items = $derived(options.map((option) => (typeof option === "string" ? { label: option } : option)));
    const matches = $derived(items.filter((item) => item.label.toLowerCase().includes(query ?? "")));
    const open = $derived(query !== null && matches.length > 0);

    const close = () => (query = null);

    function show(text = "") {
        query = text.toLowerCase();
        highlighted = -1;
    }

    function pick(item?: Item) {
        if (item) value = item.label;
        close();
    }

    function handleKey(event: KeyboardEvent) {
        const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
        if (step && (open || options.length)) {
            if (!open) show();
            if (highlighted < 0 && step < 0) highlighted = 0; // so ArrowUp from nothing wraps to the last item
            highlighted = (highlighted + step + matches.length) % matches.length;
            document.getElementById(`${id}-${highlighted}`)?.scrollIntoView({ block: "nearest" });
        } else if (open && event.key === "Enter") pick(matches[highlighted]);
        else if (open && event.key === "Escape") close();
        else return;
        event.preventDefault();
    }

    // Opens below the input, or above when there is more room there.
    function placeMenu(menu: HTMLElement) {
        const { top, bottom } = input.getBoundingClientRect();
        const below = innerHeight - bottom - 12;
        const above = top - 12;
        menu.classList.toggle("above", below < 240 && above > below);
        menu.style.maxHeight = `clamp(40px, ${Math.max(below, above)}px, 240px)`;
    }
</script>

<svelte:window onblur={close} onresize={close} />

<div class="dropdown" class:open>
    <input bind:this={input} bind:value {placeholder} autocomplete="off" role="combobox"
        aria-label={label} aria-controls={id} aria-expanded={open} aria-autocomplete="list"
        aria-activedescendant={open && highlighted >= 0 ? `${id}-${highlighted}` : undefined}
        onclick={() => (open ? close() : show())} oninput={(event) => show(event.currentTarget.value)}
        onkeydown={handleKey} onblur={close} />
    <svg class="chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="m2 4 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" />
    </svg>

    {#if open}
        <div {id} role="listbox" aria-label={label} class="dropdown-menu" {@attach placeMenu}>
            {#each matches as item, index (item.label)}
                {@const selected = item.label === value}
                <button type="button" role="option" tabindex="-1" id="{id}-{index}"
                    aria-selected={selected} class:highlighted={index === highlighted}
                    onpointermove={() => (highlighted = index)} onpointerdown={(event) => event.preventDefault()}
                    onclick={() => pick(item)}>
                    {#if item.image}<img src={item.image} alt="" />{/if}
                    {item.label}
                    {#if selected}<span aria-hidden="true">✓</span>{/if}
                </button>
            {/each}
        </div>
    {/if}
</div>
