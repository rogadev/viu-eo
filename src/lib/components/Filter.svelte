<script>
  export let /** @type {{noc:string,title:string}[]} */ haystack

  import Fuse from 'fuse.js'
  import Button from './viu/Button.svelte'
  import ReactiveResults from '$lib/components/ReactiveResults.svelte'
  import H3 from './viu/H3.svelte'

  const fuseOptions = {
    keys: ['title'],
  }

  let input = ''
  let filteredResults = haystack

  $: fuse = new Fuse(haystack, fuseOptions)

  $: {
    const fuseResults = fuse.search(input)
    const searchResults = fuseResults.map(({ item }) => item)
    if (!searchResults.length) {
      filteredResults = haystack
    } else {
      filteredResults = searchResults
    }
  }

  function clearInput() {
    input = ''
  }
</script>

{#if filteredResults.length > 0}
  <div class="flex flex-col my-4">
    <label for="filter-input" class="font-bold"
      >Filter results by typing below:</label
    >
    <div class="flex items-center gap-6 mb-4">
      <input
        type="text"
        name="filter-input"
        id="filter-input"
        bind:value={input}
        class="mr-4 w-full "
        placeholder="Search..."
      />
      <Button on:click={clearInput}>Clear</Button>
    </div>
  </div>
  <div class="mt-0 mb-6">
    <H3>Career Paths</H3>
    <p>
      Tap or click on an option below to see detailed information about the
      selected career path. These details include market trends and BC's 3-year
      employment outlook.
    </p>
  </div>
{/if}

<ReactiveResults list={filteredResults} />
