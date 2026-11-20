<script lang="ts">
    import Dropdown from "./Dropdown.svelte";
    import { cooldown } from "../lib/cooldown";
    import { errorMessage } from "../lib/errors";
    import { isSignedIn } from "../lib/startgg/auth";
    import { fetchSets, type StartggSet } from "../lib/startgg/sets";
    import type { ConnectionState } from "../types/ConnectionData";

    type Props = { status: ConnectionState; signedIn: boolean; slug: string; onselect: (set: StartggSet) => void };
    let { status = $bindable(), signedIn = $bindable(), slug, onselect }: Props = $props();

    // Idle until the dropdown is opened for a bracket, then loading, then loaded (even if the bracket had no sets).
    let phase = $state<"idle" | "loading" | "loaded">("idle");
    let sets = $state<StartggSet[]>([]);
    let selected = $state("");
    let error = $state("");
    const wait = cooldown(5000); // reopening the list sooner than this reuses it, to go easy on start.gg

    const labels = $derived(sets.map((set) => set.label));

    // The sets belong to one bracket, so changing the bracket, or disconnecting in settings, empties the list.
    $effect(() => {
        void [signedIn, slug]; // this is what the effect watches
        phase = "idle";
        sets = [];
        selected = "";
        wait.reset();
    });

    // Runs when the dropdown opens. Does nothing without a bracket, while a load is under way, or just after one.
    async function loadSets() {
        if (!signedIn || !slug || phase === "loading" || !wait.ready()) return;

        phase = "loading";
        status = "connecting";
        error = "";
        try {
            sets = await fetchSets(slug);
            phase = "loaded";
            status = "connected";
        } catch (e) {
            phase = "idle";
            status = "error";
            error = errorMessage(e);
        }
        signedIn = isSignedIn(); // a refused login is cleared, which means signed out
    }

    function pick(label: string) {
        const set = sets.find((candidate) => candidate.label === label);
        if (set) onselect(set);
    }

    const placeholder = $derived(
        !signedIn ? "Connect start.gg in settings to load sets"
        : !slug ? "Choose a tournament bracket in settings to load sets"
        : phase === "loading" ? "Loading sets from start.gg…"
        : phase === "loaded" && !sets.length ? "No upcoming sets in this bracket"
        : "Load a set from start.gg",
    );
</script>

<div class="startgg">
    <Dropdown
        label="Set" {placeholder} options={labels} bind:value={selected} disabled={!signedIn || !slug}
        onselect={pick} onopen={loadSets}
    />
    {#if error}<p role="alert">{error}</p>{/if}
</div>

<style>
    p {
        margin: 0.5rem 0 0;
    }
</style>
