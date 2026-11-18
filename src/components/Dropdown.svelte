<script lang="ts" module>
    // Only one list is open at a time: opening one closes whichever was open before it.
    let openNow: (() => void) | undefined;
</script>

<script lang="ts">
    import type { Snippet } from "svelte";

    type Option = { label: string; image?: string };
    type Props = {
        options: (string | Option)[];
        label: string;
        placeholder?: string;
        value?: string; // the pick (or, with `custom`, whatever is typed)
        custom?: boolean; // anything typed counts as the value, not just the options
        trigger?: Snippet; // an icon to click instead of a text box
        onselect?: (label: string) => void; // an option was picked
        onopen?: () => void; // the list is about to open, so it can fill itself first
        disabled?: boolean;
    };
    let {
        options, label, placeholder = "Select or type an option", value = $bindable(""), custom = false,
        trigger, onselect, onopen, disabled = false,
    }: Props = $props();

    const VISIBLE_ROWS = 5; // the list scrolls past this many
    const id = $props.id();

    let root = $state<HTMLElement>();
    let control = $state<HTMLElement>(); // the input (or custom trigger) the list hangs off
    let search = $state<string | null>(null); // what has been typed so far, or null while the list is closed
    let text = $state<string>(); // what the box shows while it's being searched. Undefined means the picked value
    let highlighted = $state(-1); // the option under the keyboard or pointer, -1 for none

    const allOptions = $derived(options.map((option) => (typeof option === "string" ? { label: option } : option)));
    const visible = $derived(allOptions.filter((option) => option.label.toLowerCase().includes(search ?? "")));
    const isOpen = $derived(search !== null && visible.length > 0);

    // Closing drops any half-typed search, so the box goes back to showing the pick.
    function close() {
        search = null;
        text = undefined;
        if (openNow === close) openNow = undefined;
    }

    $effect(() => close); // a list that's removed while open doesn't stay the open one

    const toggle = () => (isOpen ? close() : openList());

    // onopen fires when the list wasn't showing, even if it was empty, so an empty list can fill itself.
    function openList(typed = "") {
        if (!isOpen) onopen?.();
        if (openNow && openNow !== close) openNow();
        openNow = close;
        search = typed.toLowerCase();
        highlighted = -1;
    }

    // A click anywhere else closes the list. Losing focus alone isn't enough, because clicking a button doesn't focus it
    // in every webview, so a list opened from an icon would never get told.
    function onOutsidePointer(event: PointerEvent) {
        if (search !== null && !root?.contains(event.target as Node)) close();
    }

    // Escape closes the open list wherever the focus is, since an icon that was clicked may not have taken it. Listening
    // first, and marking the key as used, also stops the page behind (such as settings) from treating it as its own.
    function onEscape(event: KeyboardEvent) {
        if (event.key !== "Escape" || search === null) return;
        close();
        event.preventDefault();
    }

    function onInput(event: Event & { currentTarget: HTMLInputElement }) {
        const typed = event.currentTarget.value;
        if (custom) value = typed;
        else text = typed;
        openList(typed);
    }

    // Picking nothing (Enter with no highlight) just closes the list.
    function choose(option?: Option) {
        if (option) {
            value = option.label;
            onselect?.(option.label);
        }
        close();
    }

    function onKeydown(event: KeyboardEvent) {
        const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
        if (step && options.length) {
            if (!isOpen) openList();
            // With nothing highlighted yet, Down goes to the first option and Up to the last. Otherwise wrap around.
            highlighted = highlighted < 0 ? (step > 0 ? 0 : visible.length - 1) : (highlighted + step + visible.length) % visible.length;
            document.getElementById(`${id}-${highlighted}`)?.scrollIntoView({ block: "nearest" });
        } else if (isOpen && event.key === "Enter") choose(visible[highlighted]);
        else if (isOpen && event.key === "Escape") close();
        else return; // any other key is left alone
        event.preventDefault();
    }

    // What the input and a custom trigger have in common.
    const comboboxProps = $derived({
        role: "combobox", "aria-label": label, "aria-controls": id, "aria-expanded": isOpen,
        "aria-activedescendant": isOpen && highlighted >= 0 ? `${id}-${highlighted}` : undefined,
        onkeydown: onKeydown, onblur: close,
    });

    // Sizes and positions the list when it opens: it shows five options at a time, drops below the control (or goes
    // above when there is more room there), and lines up with the right edge if it would run off the window.
    function placeMenu(menu: HTMLElement) {
        const buttons = menu.querySelectorAll("button");
        const rowHeight = buttons[0].offsetHeight;
        const fiveRowsHeight = VISIBLE_ROWS * rowHeight + (menu.offsetHeight - buttons.length * rowHeight); // plus padding and border
        const { top, bottom, left } = control!.getBoundingClientRect();
        const spaceBelow = innerHeight - bottom - 12;
        const spaceAbove = top - 12;
        menu.classList.toggle("above", spaceBelow < fiveRowsHeight && spaceAbove > spaceBelow);
        menu.classList.toggle("end", left + menu.offsetWidth > innerWidth - 12);
        menu.style.maxHeight = `${Math.max(40, Math.min(Math.max(spaceBelow, spaceAbove), fiveRowsHeight))}px`;
    }
</script>

<svelte:window onblur={close} onresize={close} onpointerdown={onOutsidePointer} onkeydowncapture={onEscape} />

<div class="dropdown" class:open={isOpen} bind:this={root}>
    {#if trigger}
        <button bind:this={control} type="button" class="trigger" {disabled} {...comboboxProps} onclick={toggle}>
            {@render trigger()}
        </button>
    {:else}
        <input
            bind:this={control} value={text ?? value} {placeholder} {disabled} autocomplete="off" aria-autocomplete="list"
            {...comboboxProps} onclick={toggle} oninput={onInput}
        />
        <svg class="chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="m2 4 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" />
        </svg>
    {/if}

    {#if isOpen}
        <div {id} role="listbox" aria-label={label} class="dropdown-menu" {@attach placeMenu}>
            {#each visible as option, index (option.label)}
                {@const selected = option.label === value}
                <button type="button" role="option" tabindex="-1" id="{id}-{index}"
                    aria-selected={selected} class:highlighted={index === highlighted}
                    onpointermove={() => (highlighted = index)} onpointerdown={(event) => event.preventDefault()}
                    onclick={() => choose(option)}>
                    {#if option.image}<img src={option.image} alt="" />{/if}
                    {option.label}
                    {#if selected}<span aria-hidden="true">✓</span>{/if}
                </button>
            {/each}
        </div>
    {/if}
</div>
