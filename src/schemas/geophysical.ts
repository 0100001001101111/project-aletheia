/**
 * Geophysical Anomaly Schema
 * Based on Geophysical_Schema_v1
 */

import { z } from 'zod';

// Location information
const LocationSchema = z.object({
  name: z.string().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  altitude_meters: z.number().nullable(),
  location_type: z.enum(['building', 'outdoor_natural', 'outdoor_urban', 'underground', 'vehicle', 'other']).nullable(),
  geological_features: z.array(z.string()).nullable(), // e.g., fault line, aquifer, mineral deposits
  historical_significance: z.string().nullable(),
  paranormal_history: z.boolean().nullable(),
  paranormal_history_details: z.string().nullable(),
});

// Equipment used
const EquipmentSchema = z.object({
  name: z.string(),
  type: z.enum(['emf_meter', 'thermometer', 'geiger_counter', 'magnetometer', 'infrasound_mic', 'ultrasound', 'camera_visible', 'camera_ir', 'camera_full_spectrum', 'ion_counter', 'humidity_sensor', 'barometer', 'seismometer', 'other']),
  model: z.string().nullable(),
  calibration_date: z.string().nullable(),
  sensitivity: z.string().nullable(),
});

// Individual reading
const ReadingSchema = z.object({
  timestamp: z.string(), // ISO datetime
  equipment_name: z.string(),
  value: z.number(),
  unit: z.string(),
  baseline_value: z.number().nullable(),
  deviation_from_baseline: z.number().nullable(),
  sigma_deviation: z.number().nullable(), // Standard deviations from baseline
  anomalous: z.boolean(),
  notes: z.string().nullable(),
});

// Anomaly event
const AnomalyEventSchema = z.object({
  event_id: z.string().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  duration_seconds: z.number().nullable(),
  anomaly_type: z.enum(['em_spike', 'em_drop', 'temperature_drop', 'temperature_spike', 'radiation_spike', 'infrasound', 'ultrasound', 'magnetic_anomaly', 'ion_imbalance', 'multiple']).nullable(),
  peak_deviation_sigma: z.number().nullable(),
  correlated_subjective_report: z.boolean().nullable(),
  correlated_report_details: z.string().nullable(),
});

// Environmental baseline
const BaselineSchema = z.object({
  measurement_period_start: z.string().nullable(),
  measurement_period_end: z.string().nullable(),
  em_field_mean_mg: z.number().nullable(),
  em_field_std_mg: z.number().nullable(),
  temperature_mean_c: z.number().nullable(),
  temperature_std_c: z.number().nullable(),
  background_radiation_cpm: z.number().nullable(),
  infrasound_baseline_db: z.number().nullable(),
  local_em_sources: z.array(z.string()).nullable(), // Known sources
});

// Correlated events
const CorrelatedEventSchema = z.object({
  event_type: z.enum(['witness_report', 'equipment_malfunction', 'animal_behavior', 'subjective_sensation', 'photographic_anomaly', 'audio_anomaly', 'other']).nullable(),
  timestamp: z.string().nullable(),
  description: z.string().nullable(),
  witnesses: z.number().nullable(),
  documented: z.boolean().nullable(),
});

// Weather conditions
const WeatherSchema = z.object({
  timestamp: z.string().nullable(),
  temperature_c: z.number().nullable(),
  humidity_percent: z.number().nullable(),
  barometric_pressure_hpa: z.number().nullable(),
  wind_speed_kmh: z.number().nullable(),
  precipitation: z.enum(['none', 'light', 'moderate', 'heavy']).nullable(),
  storm_activity: z.boolean().nullable(),
  geomagnetic_kp: z.number().min(0).max(9).nullable(),
});

// Investigation protocol
const ProtocolSchema = z.object({
  investigation_type: z.enum(['systematic_survey', 'response_investigation', 'long_term_monitoring', 'experimental']).nullable(),
  duration_hours: z.number().min(0).nullable(),
  team_size: z.number().min(1).nullable(),
  blind_protocol: z.boolean().nullable(), // Investigators blind to location history?
  control_location_used: z.boolean().nullable(),
  control_location_results: z.string().nullable(),
});

// Main Geophysical Schema
export const GeophysicalSchema = z.object({
  // Metadata
  investigation_date: z.string().nullable(),
  investigation_id: z.string().nullable(),
  lead_investigator: z.string().nullable(),
  organization: z.string().nullable(),

  // Core data
  location: LocationSchema.nullable(),
  equipment: z.array(EquipmentSchema).nullable(),
  baseline: BaselineSchema.nullable(),
  readings: z.array(ReadingSchema).nullable(),
  anomaly_events: z.array(AnomalyEventSchema).nullable(),
  correlated_events: z.array(CorrelatedEventSchema).nullable(),
  weather: WeatherSchema.nullable(),
  protocol: ProtocolSchema.nullable(),

  // Summary statistics
  total_readings: z.number().min(0).nullable(),
  anomalous_readings_count: z.number().min(0).nullable(),
  anomalous_readings_percent: z.number().min(0).max(100).nullable(),
  max_sigma_deviation: z.number().nullable(),

  // Additional
  raw_data_file: z.string().nullable(), // Reference to uploaded data file
  researcher_notes: z.string().nullable(),
  conclusions: z.string().nullable(),
});

export type GeophysicalData = z.infer<typeof GeophysicalSchema>;

// Required fields
export const GEOPHYSICAL_REQUIRED_FIELDS = [
  'investigation_date',
  'location.latitude',
  'location.longitude',
  'equipment',
] as const;

// Triage indicators
export const GEOPHYSICAL_TRIAGE_INDICATORS = {
  source_integrity: [
    'investigation_id',
    'lead_investigator',
    'organization',
    'equipment',
  ],
  methodology: [
    'protocol.blind_protocol',
    'protocol.control_location_used',
    'baseline',
    'weather',
  ],
  variable_capture: [
    'location.geological_features',
    'weather.geomagnetic_kp',
    'protocol.duration_hours',
    'equipment', // Multiple sensors
  ],
  data_quality: [
    'readings',
    'total_readings',
    'raw_data_file',
    'anomaly_events',
  ],
};

// Field descriptions for LLM parsing
export const GEOPHYSICAL_FIELD_DESCRIPTIONS = {
  investigation_date: 'Date of investigation (YYYY-MM-DD)',
  'location.latitude': 'Latitude of investigation site',
  'location.longitude': 'Longitude of investigation site',
  'location.paranormal_history': 'Does location have reported paranormal history?',
  'equipment.type': 'Equipment type: emf_meter, thermometer, geiger_counter, magnetometer, etc.',
  'baseline.em_field_mean_mg': 'Baseline EMF mean in milligauss',
  'anomaly_events.anomaly_type': 'Type: em_spike, temperature_drop, infrasound, etc.',
  'anomaly_events.peak_deviation_sigma': 'Peak standard deviation from baseline',
  'correlated_events.event_type': 'Correlated event: witness_report, equipment_malfunction, animal_behavior, etc.',
  'protocol.blind_protocol': 'Were investigators blind to location paranormal history?',
  'protocol.control_location_used': 'Was a control location measured for comparison?',
  anomalous_readings_percent: 'Percentage of readings flagged as anomalous',
};
