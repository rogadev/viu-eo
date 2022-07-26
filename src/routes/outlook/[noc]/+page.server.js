import { loading } from '$lib/stores/loading'
import { error } from '@sveltejs/kit'

// CACHE
import NodeCache from 'node-cache'
const ttl = 60 * 60 * 24 * 30 * 2 // 2 month time to live
const outlooksCache = new NodeCache({ stdTTL: ttl })

// LOCAL DATA
import unitGroups from '$lib/server/data/noc_2016_unit_groups.json'

/**
 * Throws a SvelteKit error if no user key is found in env variables.
 */
const handleMissingApiKey = () => {
  throw error(500, 'Missing API key')
}

// LMI-EO API USER KEY REQUEST HEADER
const headers = new Headers()
headers.append(
  'USER_KEY',
  import.meta.env.VITE_GC_API_USER_KEY ?? handleMissingApiKey() // Will throw error if no api key found in env variables.
)

/**
 * @typedef Outlook
 * @property {number} potential - The outlook potential, represented as a value from 0 to 3.
 * @property {string} outlook_verbose - The verbose description of the outlook potential.
 * @property {string} trends - The outlook trends, represented as a value from 0 to 3.
 */

/**
 * The LMI-EO API uses a silly outlook potential rating schema where 0 is undetermined, 1 is good, 2 is limited, and 3 is fair. This function converts the outlook potential value to a more logical format. 3 is good, 2 is fair, 1 is limited, 0 is undetermined. Additionally adds a verbose description of the outlook potential.
 * @param {Outlook} outlook - The outlook data to fix.
 * @returns The fixed outlook data with corrected potential value.
 */
const refactorOutlookWithLogicalPotential = (outlook) => {
  const potential = outlook.potential
  let newPotential
  switch (Number(potential)) {
    case 1:
      newPotential = 3
      break
    case 2:
      newPotential = 1
      break
    case 3:
      newPotential = 2
      break
    default:
      newPotential = 0
  }
  return {
    ...outlook,
    potential: newPotential,
    outlook_verbose: verbifyOutlookValue(newPotential),
  }
}

/**
 * Uses the LMI Employment Outlook API to query for the provincial outlook for a given NOC unit group code. LMI-EO uses NOC 2016 v1.3.
 * @param {String} noc The NOC code of the relevant unit group.
 * @param {String} provinceId The province code relevant to this search.
 * @returns Object containing key value pairs of data related to the outlook of the given unit group in the given province.
 */
const fetchProvincialOutlook = async (noc, provinceId) => {
  try {
    const response = await fetch(
      `https://lmi-outlooks-esdc-edsc-apicast-production.api.canada.ca/clmix-wsx/gcapis/outlooks?noc=${noc}&rtp=1&rid=${provinceId}&lang=en`,
      { headers }
    )
    const data = await response.json()
    return data
  } catch (e) {
    console.error(e)
  }
}

/**
 * Verifies an outlook potential value form 0 to 3.
 * @param {Number} potential - The outlook potential, represented as a value from 0 to 3.
 * @returns The verbose description of the outlook potential.
 */
const verbifyOutlookValue = (potential) => {
  switch (Number(potential)) {
    case 1:
      return 'Limited'
    case 2:
      return 'Fair'
    case 3:
      return 'Good'
    default:
      return 'Undetermined'
  }
}

// -------------------- LOAD FUNCTION --------------------
/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
  loading.set(true)
  const noc = String(params.noc)
  if (!noc) throw error(404, 'NOC parameter was not provided.')

  if (typeof Number.parseInt(noc) !== 'number') {
    loading.set(false)
    throw error(404, `Received bad noc parameter type: ${noc}, ${typeof noc}`)
  }

  const unitGroup = unitGroups.find(
    (unitGroup) => unitGroup.noc === noc ?? false
  )
  if (!unitGroup) throw error(404, `No unit group found for NOC: ${noc}`)

  const fetchProvincialOutlookData = new Promise(async (resolve, reject) => {
    /** @type {Outlook} */
    let data
    let trends, outlook_verbose, outlook
    try {
      const prov = '59'
      /** @type {Outlook | false} */
      const cachedData = outlooksCache.get(`${noc}-${prov}`) ?? false
      if (!cachedData) {
        data = await fetchProvincialOutlook(noc, prov)
        data = refactorOutlookWithLogicalPotential(data)
        outlooksCache.set(`${noc}-${prov}`, data)
      } else {
        data = cachedData
      }

      // Set Resolve Values
      trends = data.trends
      outlook_verbose = data.outlook_verbose
      outlook = data.potential
    } catch (errors) {
      reject(errors)
      console.error(errors)
    }
    resolve({ trends, outlook, outlook_verbose })
  })

  const fetchUnitGroupData = new Promise((resolve, reject) => {
    let title, jobs, requirements, duties
    try {
      /** @type {{ noc: string, title: string, jobs: string[], exclusions: string[], requirements: string[], duties: string[]} | { noc: string, title: string, jobs: string[], exclusions: string[], requirements: string[], duties: {}[]} | null} */
      title = unitGroup?.title
      jobs = unitGroup?.jobs
      requirements = unitGroup?.requirements
      duties = unitGroup?.duties
    } catch (errors) {
      reject(errors)
      console.error(errors)
    }
    resolve({ title, jobs, requirements, duties })
  })

  return await Promise.all([
    fetchProvincialOutlookData,
    fetchUnitGroupData,
  ]).then(([outlook, unitGroup]) => {
    loading.set(false)
    return {
      status: 200,
      noc,
      title: unitGroup.title,
      jobs: unitGroup.jobs,
      requirements: unitGroup.requirements,
      duties: unitGroup.duties,
      outlook: outlook.outlook,
      outlook_verbose: outlook.outlook_verbose,
      trends: outlook.trends,
      province: 'British Columbia',
    }
  })
}
