<script lang="ts">
    import type { ConnectionState } from "../types/ConnectionData";

    let { name, logo, state }: { name: string; logo: string; state: ConnectionState } = $props();

    // Grey until something happens, then the same amber, green and red the rest of the app uses.
    const colors: Record<ConnectionState, string> = {
        disconnected: "var(--border)", connecting: "#e8c33f", connected: "#3fb950", error: "#e5484d",
    };
</script>

<span class="masked-icon" role="img" title="{name}: {state}" aria-label="{name}: {state}" style:--icon="url({logo})" style:--tint={colors[state]}></span>

<style>
    span {
        transition: background-color 150ms ease-out;
    }
</style>
