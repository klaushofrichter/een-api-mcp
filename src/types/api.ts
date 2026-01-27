/**
 * API types for Eagle Eye Networks
 */

// ============================================================================
// Camera Types
// ============================================================================

export type CameraStatus =
  | 'online'
  | 'offline'
  | 'deviceOffline'
  | 'bridgeOffline'
  | 'invalidCredentials'
  | 'error'
  | 'streaming'
  | 'registered'
  | 'attaching'
  | 'initializing'

export interface CameraDeviceInfo {
  make?: string
  model?: string
  firmwareVersion?: string
  directToCloud?: boolean
  serialNumber?: string
  resolution?: string
  type?: string
}

export interface CameraShareDetails {
  shared?: boolean
  accountId?: string
  firstResponder?: boolean
  permissions?: string[]
}

export interface CameraStreamUrls {
  hls?: string
  rtsp?: string
  webrtc?: string
  jpeg?: string
}

export interface Camera {
  id: string
  name: string
  accountId: string
  bridgeId?: string | null
  locationId?: string | null
  guid?: string
  macAddress?: string
  ipAddress?: string
  timezone?: string
  status?: CameraStatus | { connectionStatus?: CameraStatus }
  tags?: string[]
  packages?: string[]
  multiCameraId?: string | null
  speakerId?: string | null
  deviceInfo?: CameraDeviceInfo
  shareDetails?: CameraShareDetails
  streamUrls?: CameraStreamUrls
  enabledAnalytics?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface ListCamerasParams {
  pageSize?: number
  pageToken?: string
  include?: string[]
  sort?: string[]
  locationId__in?: string[]
  bridgeId__in?: string[]
  tags__contains?: string[]
  name?: string
  name__contains?: string
  id__in?: string[]
  status__in?: CameraStatus[]
  status__ne?: CameraStatus
  q?: string
}

export interface GetCameraParams {
  include?: string[]
}

// ============================================================================
// Bridge Types
// ============================================================================

export type BridgeStatus =
  | 'online'
  | 'offline'
  | 'error'
  | 'idle'
  | 'registered'
  | 'attaching'
  | 'initializing'

export interface BridgeDeviceInfo {
  make?: string
  model?: string
  firmwareVersion?: string
  serialNumber?: string
  hardwareVersion?: string
}

export interface BridgeNetworkInfo {
  localIpAddress?: string
  publicIpAddress?: string
  macAddress?: string
  subnetMask?: string
  gateway?: string
  dnsServers?: string[]
}

export interface Bridge {
  id: string
  name: string
  accountId: string
  locationId?: string | null
  guid?: string
  timezone?: string
  status?: BridgeStatus | { connectionStatus?: BridgeStatus }
  tags?: string[]
  deviceInfo?: BridgeDeviceInfo
  networkInfo?: BridgeNetworkInfo
  cameraCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface ListBridgesParams {
  pageSize?: number
  pageToken?: string
  include?: string[]
  sort?: string[]
  locationId__in?: string[]
  tags__contains?: string[]
  name?: string
  name__contains?: string
  id__in?: string[]
  status__in?: BridgeStatus[]
  status__ne?: BridgeStatus
  q?: string
}

export interface GetBridgeParams {
  include?: string[]
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  accountId?: string
  timeZone?: string
  language?: string
  phone?: string
  mobilePhone?: string
  permissions?: string[]
  lastLogin?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ListUsersParams {
  pageSize?: number
  pageToken?: string
  include?: string[]
}

export interface GetUserParams {
  include?: string[]
}

// ============================================================================
// Event Types
// ============================================================================

export type ActorType =
  | 'bridge'
  | 'camera'
  | 'speaker'
  | 'account'
  | 'user'
  | 'layout'
  | 'job'
  | 'measurement'
  | 'sensor'
  | 'gateway'

export interface EventData {
  type: string
  creatorId: string
  [key: string]: unknown
}

export interface Event {
  id: string
  startTimestamp: string
  endTimestamp?: string | null
  span: boolean
  accountId: string
  actorId: string
  actorAccountId: string
  actorType: ActorType
  creatorId: string
  type: string
  dataSchemas: string[]
  data: EventData[]
}

export interface EventType {
  type: string
  name: string
  description: string
}

export interface ListEventsParams {
  pageSize?: number
  pageToken?: string
  actor: string
  type__in: string[]
  startTimestamp__gte: string
  startTimestamp__lte?: string
  endTimestamp__gte?: string
  endTimestamp__lte?: string
  sort?: '+startTimestamp' | '-startTimestamp'
  include?: string[]
}

export interface ListEventTypesParams {
  pageSize?: number
  pageToken?: string
  language?: string
}

// ============================================================================
// Alert Types
// ============================================================================

export type AlertActionStatus =
  | 'fired'
  | 'success'
  | 'partialSuccess'
  | 'silenced'
  | 'failed'
  | 'internalError'

export interface AlertAction {
  name: string
  type: string
  success: boolean
  timestamp: string
  status?: AlertActionStatus
}

export interface Alert {
  id: string
  timestamp: string
  createTimestamp: string
  creatorId: string
  alertType: string
  alertName?: string
  category?: string
  serviceRuleId?: string
  eventType?: string
  actorId: string
  actorType: string
  actorAccountId: string
  actorName?: string
  ruleId?: string
  eventId?: string
  locationId?: string
  locationName?: string
  priority?: number
  dataSchemas?: string[]
  data?: Record<string, unknown>
  actions?: Record<string, AlertAction>
  description?: string
}

export type AlertInclude = 'data' | 'actions' | 'dataSchemas' | 'description'
export type AlertSort = '+timestamp' | '-timestamp'

export interface ListAlertsParams {
  pageSize?: number
  pageToken?: string
  timestamp__lte?: string
  timestamp__gte?: string
  creatorId?: string
  alertType__in?: string[]
  actorId__in?: string[]
  actorType__in?: string[]
  actorAccountId?: string
  ruleId?: string
  ruleId__in?: string[]
  eventId?: string
  locationId__in?: string[]
  priority__gte?: number
  priority__lte?: number
  showInvalidAlerts?: boolean
  include?: AlertInclude[]
  sort?: AlertSort[]
}

export interface GetAlertParams {
  include?: AlertInclude[]
}

// ============================================================================
// Media Types
// ============================================================================

export interface MediaInterval {
  startTimestamp: string
  endTimestamp: string
  deviceId: string
  type: 'preview' | 'main'
  mediaType: 'video' | 'image'
}

export interface ListMediaParams {
  deviceId: string
  type: 'preview' | 'main'
  mediaType: 'video' | 'image'
  startTimestamp: string
  endTimestamp?: string
  coalesce?: boolean
  include?: string[]
  pageToken?: string
  pageSize?: number
}

export interface GetLiveImageParams {
  deviceId: string
  type?: 'preview'
}

export interface LiveImageResult {
  imageData: string
  timestamp: string | null
  prevToken: string | null
}

export interface GetRecordedImageParams {
  deviceId?: string
  pageToken?: string
  type?: 'preview' | 'main'
  timestamp__lt?: string
  timestamp__lte?: string
  timestamp?: string
  timestamp__gte?: string
  timestamp__gt?: string
  overlayId__in?: string[]
  include?: string[]
  targetWidth?: number
  targetHeight?: number
}

export interface RecordedImageResult {
  imageData: string
  timestamp: string | null
  nextToken: string | null
  prevToken: string | null
  overlaySvg: string | null
}

// ============================================================================
// Layout Types
// ============================================================================

export type LayoutPaneType = 'preview' | 'compositePreview'
export type LayoutPaneSize = 1 | 2 | 3
export type LayoutAspectRatio = '16x9' | '4x3'

export interface LayoutPane {
  id: number
  name: string
  type: LayoutPaneType
  size: LayoutPaneSize
  cameraId: string
  compositeId?: string | null
}

export interface LayoutSettings {
  showCameraBorder: boolean
  showCameraName: boolean
  cameraAspectRatio: LayoutAspectRatio
  paneColumns: number
}

export interface LayoutPermissions {
  read?: boolean
  edit?: boolean
  delete?: boolean
}

export interface CameraStatusCounts {
  online?: number
  offline?: number
  deviceOffline?: number
  bridgeOffline?: number
  error?: number
}

export interface Layout {
  id: string
  name: string
  accountId: string
  panes: LayoutPane[]
  settings: LayoutSettings
  effectivePermissions?: LayoutPermissions
  resourceCounts?: { cameras?: number }
  resourceStatusCounts?: { cameras?: CameraStatusCounts }
  qRelevance?: number
}

export type ListLayoutsInclude = 'effectivePermissions' | 'resourceCounts' | 'resourceStatusCounts' | 'qRelevance'
export type ListLayoutsSort = '+name' | '-name' | '+rotationOrder' | '+qRelevance' | '-qRelevance'

export interface ListLayoutsParams {
  pageSize?: number
  pageToken?: string
  include?: ListLayoutsInclude[]
  sort?: ListLayoutsSort[]
  name?: string
  name__in?: string[]
  name__contains?: string
  id__in?: string[]
  q?: string
  qRelevance__gte?: number
}

export type GetLayoutInclude = 'effectivePermissions' | 'resourceCounts' | 'resourceStatusCounts'

export interface GetLayoutParams {
  include?: GetLayoutInclude[]
}
