<script>
  import titleCase from '$lib/helpers/titleCase'

  // @ts-nocheck

  import { filteredResults } from '$lib/stores/searching.js'

  $: jobs = $filteredResults
</script>

<div
  aria-live="polite"
  class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-4 gap-x-2"
>
  {#if !jobs.length}
    <p>
      No results found for this credential, at this time. This is likely due to
      poor Stats Canada data. In this app you can also try searching Stats
      Canada Natioanl Occupancy Codes by job title.
    </p>
  {:else}
    {#each jobs as job}
      <a
        href={'/outlook/' + job.noc}
        class="self-center justify-center drop-shadow h-full"
      >
        <div
          class="mb-2 px-4 py-2 bg-blue-50 border rounded-lg border-blue-100  hover:bg-blue-200 hover:border-blue-200 font-semibold h-full"
        >
          {titleCase(job.title)}
        </div>
      </a>
    {/each}
  {/if}
</div>
