/**
 * Data ingestion types
 */

export type DataSource = 'nuforc' | 'bfro' | 'haunted_places' | 'nuforc_legacy' | 'bfro_legacy' | 'haunted_places_legacy';

export interface RawNuforcRecord {
  Sighting?: number;
  Occurred?: string;
  Location?: string;
  Shape?: string;
  Duration?: string;
  'No of observers'?: number;
  Reported?: string;
  Posted?: string;
  Summary?: string;
  Text?: string;
  // Characteristics
  'Lights on object'?: boolean;
  'Aura or haze around object'?: boolean;
  'Aircraft nearby'?: boolean;
  'Animals reacted'?: boolean;
  'Left a trail'?: boolean;
  'Emitted other objects'?: boolean;
  'Changed Color'?: boolean;
  'Emitted beams'?: boolean;
  'Electrical or magnetic effects'?: boolean;
  Explanation?: string;
  'Possible abduction'?: boolean;
  'Missing Time'?: boolean;
  'Marks found on body afterwards'?: boolean;
  Landed?: boolean;
  'Location details'?: string;
  // Geocoded fields (if available)
  city_latitude?: number;
  city_longitude?: number;
  latitude?: number;
  longitude?: number;
}

export interface RawBfroRecord {
  observed?: string;
  date?: string;
  title?: string;
  classification?: string;
  county?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  number?: number | string;
  location_details?: string;
  nearest_town?: string;
  nearest_road?: string;
  observed_text?: string;
  also_noticed?: string;
  other_witnesses?: string;
  other_stories?: string;
  time_and_conditions?: string;
  environment?: string;
}

export interface ParsedInvestigation {
  sourceId: string;
  dataSource: DataSource;
  investigationType: 'ufo' | 'bigfoot' | 'haunting';
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  eventDate: Date | null;
  rawData: Record<string, unknown>;
}

export interface IngestionResult {
  success: boolean;
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  syncId: string;
}

export interface SyncStatus {
  source: DataSource;
  lastSyncAt: Date | null;
  lastRecordDate: Date | null;
  totalRecords: number;
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed';
}
