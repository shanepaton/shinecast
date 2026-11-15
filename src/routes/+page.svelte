<script lang="ts">
    import CasterInfo from "../components/CasterInfo.svelte";
  import TournamentInfo from "../components/TournamentInfo.svelte";
  
  import type { TournamentData } from "../types/TournamentData";
  import type { CasterData } from "../types/CasterData";

  let tournament = $state<TournamentData>({
    name: "",
    round: "",
    bestOf: 3,
    nextUp: [],
  });

  // two broadcasters
  let caster1 = $state<CasterData>({
    name: "",
    twitter: "",
    twitch: "",
  });

  let caster2 = $state<CasterData>({
    name: "",
    twitter: "",
    twitch: "",
  });

</script>

<main class="container">
  <TournamentInfo bind:tournament />
  <div class="casters">
    <CasterInfo bind:caster={caster1} />
    <CasterInfo bind:caster={caster2} />
  </div>
</main>

<style>
  .casters{
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }
</style>
