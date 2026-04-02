import { api } from '../lib/api'
import type { ResultRow } from '../types'

type ResultsResponse = {
  results: ResultRow[]
}

export async function getAdminResults() {
  const { data } = await api.get<ResultsResponse>('/results/admin')
  return data.results
}
