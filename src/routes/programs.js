import { programs } from '$lib/stores/programs'
let programList = programs.subscribe((v) => v)

/**
 * Fetch the searchable program list from our API.
 * @returns
 */
const getPrograms = async () => {
  if (!programList.length) {
    try {
      const response = await fetch(
        'https://viu-career-outlook.herokuapp.com/api/v1/programs/searchable'
      )
      const { data } = await response.json()
      return data
    } catch (e) {
      console.error(e)
      // @ts-ignore
      return new Error(e)
    }
  } else {
    return programList
  }
}

const getProgram = async (/** @type {number} */ nid) => {
  try {
    const response = await fetch(
      `https://viu-career-outlook.herokuapp.com/api/v1/jobs/program/${nid}`
    )
    const { data } = await response.json()
    return data ?? []
  } catch (e) {
    console.error(e)
    // @ts-ignore
    return new Error(e)
  }
}

export { getPrograms, getProgram }
