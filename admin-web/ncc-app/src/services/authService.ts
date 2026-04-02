import { api } from '../lib/api'
import type { LoginResponse } from '../types'

export async function loginStaff(email: string, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login/staff', {
    email,
    password,
  })
  return data
}
