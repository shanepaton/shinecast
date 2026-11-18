<script lang="ts">
    import type { ConnectionData, ConnectionState } from "../types/ConnectionData";

    let { connections }: { connections: ConnectionData } = $props();

    const services = [
        { key: "slippi", name: "Slippi", logo: "/images/slippi.svg" },
        { key: "obs", name: "OBS", logo: "/images/obs.svg" },
        { key: "startgg", name: "start.gg", logo: "/images/startdotgg.svg" },
    ] as const;

    // Grey until something happens, then the same amber, green and red the rest of the app uses.
    const colors: Record<ConnectionState, string> = {
        disconnected: "var(--border)", connecting: "#e8c33f", connected: "#3fb950", error: "#e5484d",
    };
</script>

<footer>
    {#each services as { key, name, logo }}
        <span class="logo" role="img" title="{name}: {connections[key]}" aria-label="{name}: {connections[key]}"
            style:--logo="url({logo})" style:--color={colors[connections[key]]}></span>
    {/each}
</footer>

<style>
    footer {
        display: flex;
        justify-content: center;
        gap: calc(var(--spacing) * 3);
    }

    /* The logos are white SVGs, so they work as a mask over a block of the status colour. */
    .logo {
        width: 2rem;
        height: 1.5rem;
        background: var(--color);
        -webkit-mask: var(--logo) center / contain no-repeat;
        mask: var(--logo) center / contain no-repeat;
        transition: background-color 150ms ease-out;
    }
</style>
