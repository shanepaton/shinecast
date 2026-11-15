<script lang="ts">
  import TournamentInfo from "../components/TournamentInfo.svelte";
  import type { TournamentData } from "../types/TournamentData";

  let tournament = $state<TournamentData>({
    name: "",
    round: "",
    bestOf: 3,
    nextUp: [],
  });

</script>

<main class="container">
  <TournamentInfo bind:tournament />
</main>
