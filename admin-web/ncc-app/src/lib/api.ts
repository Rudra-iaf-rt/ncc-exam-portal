import axios from 'axios'
import { storage } from './storage'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = storage.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
