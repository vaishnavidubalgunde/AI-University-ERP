import api from './api'
import {
  PlacementDriveItem,
  PlacementApplicationItem,
  ApplyDriveRequest,
  ApplyDriveResponse,
} from '../types/placement'

export const placementService = {
  getDrives: async (): Promise<PlacementDriveItem[]> => {
    const response = await api.get<PlacementDriveItem[]>('/api/v1/placements/drives')
    return response.data
  },

  applyToDrive: async (payload: ApplyDriveRequest): Promise<ApplyDriveResponse> => {
    const response = await api.post<ApplyDriveResponse>('/api/v1/placements/apply', payload)
    return response.data
  },

  getMyApplications: async (): Promise<PlacementApplicationItem[]> => {
    const response = await api.get<PlacementApplicationItem[]>('/api/v1/placements/my-applications')
    return response.data
  },
}

export default placementService
