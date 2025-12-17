import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const apiBase = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'

export const apiClient = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    const headers = config.headers ?? {}
    // AxiosRequestHeaders is mutable; keep simple assignment to avoid type widening issues.
    ;(headers as Record<string, string>).Authorization = `Bearer ${token}`
    config.headers = headers
  }
  return config
})

export type Park = {
  id: number
  name: string
  region?: string
  timezone?: string
  boundaryGeojson?: string
}

export type Asset = {
  id: number
  parkId: number
  entId?: number
  assetType: string
  name: string
  vendor?: string
  modelNo?: string
  ratedCapacity?: number
  status?: string
}

export type Measurement = {
  pointId: number
  ts: string
  value: number | null
  qualityFlag?: string
  aggLevel?: string
}

export type MeterPoint = {
  id: number
  parkId: number
  entId?: number
  assetId?: number
  energyType?: string
  measType?: string
  unit?: string
  samplingIntervalSec?: number
  protocol?: string
  tagAddress?: string
  isCritical?: boolean
}

export type GenForecastPoint = {
  assetId: number
  forecastIssueTs: string
  ts: string
  pKwPred: number | null
  p10?: number | null
  p90?: number | null
  modelVersion?: string
  scenario?: string
}

export type DispatchPlan = {
  id: number
  parkId: number
  horizonStart: string
  horizonEnd: string
  intervalMin?: number
  strategyProfileId?: number
  status: string
  createdTs: string
}

export type DispatchPlanDetail = {
  id: number
  planId: number
  ts: string
  assetId: number
  pSetKw?: number
  qSetKvar?: number
  heatSetMw?: number
  socTarget?: number
}

export type DispatchPlanWithDetails = {
  plan: DispatchPlan
  details: DispatchPlanDetail[]
}

export type LoginResponse = {
  token: string
  user: {
    username: string
    role: string
  }
}

export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/api/auth/login', { username, password })
  return data
}

export async function fetchParks(): Promise<Park[]> {
  const { data } = await apiClient.get<Park[]>('/api/parks')
  return data
}

export async function fetchAssets(params?: { parkId?: number; entId?: number; assetType?: string }): Promise<Asset[]> {
  const { data } = await apiClient.get<Asset[]>('/api/assets', { params })
  return data
}

export async function fetchLatestMeasurements(pointIds: Array<string | number>): Promise<Measurement[]> {
  if (!pointIds.length) {
    return []
  }
  const { data } = await apiClient.get<Measurement[]>('/api/timeseries/latest', {
    params: { pointIds: pointIds.join(',') },
  })
  return data
}

export async function fetchMeterPoints(params?: {
  parkId?: number
  assetId?: number
  entId?: number
  energyType?: string
}): Promise<MeterPoint[]> {
  const { data } = await apiClient.get<MeterPoint[]>('/api/meter-points', { params })
  return data
}

export async function fetchGenerationForecast(params: {
  assetId: number
  start: string
  end: string
  issueTs?: string
}): Promise<GenForecastPoint[]> {
  const { data } = await apiClient.get<GenForecastPoint[]>('/api/forecast/gen', { params })
  return data
}

export async function fetchDispatchPlans(params?: { parkId?: number; status?: string }): Promise<DispatchPlan[]> {
  const { data } = await apiClient.get<DispatchPlan[]>('/api/dispatch/plans', { params })
  return data
}

export async function fetchDispatchPlan(id: number): Promise<DispatchPlanWithDetails> {
  const { data } = await apiClient.get<DispatchPlanWithDetails>(`/api/dispatch/plans/${id}`)
  return data
}
