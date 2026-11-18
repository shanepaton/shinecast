<script lang="ts">
    import Dropdown from "./Dropdown.svelte";
    import { fetchSets, isSignedIn, signIn, type StartggSet } from "../lib/startgg";
    import type { ConnectionState } from "../types/ConnectionData";

    let { status = $bindable(), onselect }: { status: ConnectionState; onselect: (set: StartggSet) => void } = $props();

    const EVENT_KEY = "startgg-event"; // the last event link, so it's still there next launch

    const alreadySignedIn = isSignedIn();
    let signedIn = $state(alreadySignedIn);
    let event = $state(localStorage.getItem(EVENT_KEY) ?? "");
    let sets = $state<StartggSet[]>([]);
    let selected = $state("");
    let error = $state("");
    if (alreadySignedIn) status = "connected";

    // Runs a start.gg request and shows how it went in the footer. A failure can also mean the login ran out.
    async function track(request: () => Promise<void>) {
        status = "connecting";
        error = "";
        try {
            await request();
            status = "connected";
        } catch (e) {
            status = "error";
            error = e instanceof Error ? e.message : String(e);
        }
        signedIn = isSignedIn();
    }

    const connect = () => track(signIn);

    const load = () => track(async () => {
        sets = await fetchSets(event);
        localStorage.setItem(EVENT_KEY, event);
    });

    // The dropdown doubles as a search box, so this also runs on every keystroke. Only an exact match picks a set.
    function choose(label: string) {
        selected = label;
        const set = sets.find((candidate) => candidate.label === label);
        if (set) onselect(set);
    }
</script>

<section class="panel">
    {#if signedIn}
        <input type="text" placeholder="Event link" aria-label="start.gg event link" bind:value={event} />
        <div class="load">
            <button type="button" onclick={load} disabled={status === "connecting"}>Load sets</button>
            <Dropdown label="Set" placeholder={sets.length ? "Pick a set" : "No sets loaded"} options={sets.map((set) => set.label)}
                bind:value={() => selected, choose} />
        </div>
    {:else}
        <button type="button" onclick={connect} disabled={status === "connecting"}>Connect start.gg</button>
    {/if}
    {#if error}<p role="alert">{error}</p>{/if}
</section>

<style>
    .load {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: var(--spacing);
    }

    p {
        margin: 0;
        color: #e5484d;
    }
</style>
