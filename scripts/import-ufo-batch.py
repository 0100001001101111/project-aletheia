#!/usr/bin/env python3
"""
UFO Batch Import Script
Imports high-signal UFO sightings from enriched JSON into Aletheia via Supabase

Usage: python3 scripts/import-ufo-batch.py
"""

import json
import os
import sys
from supabase import create_client

# Configuration
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
INPUT_FILE = os.path.expanduser('~/Desktop/ufo-data-prep/outputs/ufo_sightings_enriched.json')
SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'
BATCH_SIZE = 500
MAX_RECORDS = 5000  # Target number of high-quality records

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    print("Set these environment variables and try again")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def quality_score(r):
    """Calculate quality score for ranking records"""
    score = 0
    if r.get('physiological_effects'): score += 3
    if r.get('em_interference'): score += 3
    if r.get('earthquake_nearby'): score += 2
    if r.get('geomagnetic_storm'): score += 2
    if r.get('witness_count') and r['witness_count'] > 1:
        score += min(3, r['witness_count'])
    if r.get('duration_seconds') and r['duration_seconds'] > 60: score += 1
    if r.get('shape') and r['shape'] not in ['unknown', 'other', 'light']: score += 1
    return score


def calc_triage_score(r):
    """Calculate triage score (0-10)"""
    score = 0
    if r.get('latitude') and r.get('longitude'): score += 3
    if r.get('witness_count') and r['witness_count'] > 1:
        score += min(2, r['witness_count'] - 1)
    if r.get('duration_seconds') and r['duration_seconds'] > 0: score += 1
    if r.get('physical_effects') or r.get('physiological_effects'): score += 2
    if r.get('em_interference'): score += 1
    if r.get('source'): score += 1
    return min(10, score)


def calc_confound_score(r):
    """Calculate confound score (0-100) - higher = more likely conventional"""
    score = 0
    airport = r.get('airport_nearby_km')
    if airport is not None:
        if airport < 10: score += 40
        elif airport < 30: score += 25
        elif airport < 50: score += 10
    military = r.get('military_base_nearby_km')
    if military is not None:
        if military < 30: score += 30
        elif military < 50: score += 15
    if r.get('physiological_effects'): score -= 20
    if r.get('em_interference'): score -= 15
    return max(0, min(100, score))


def clean_text(text, max_len=500):
    """Clean text for database insertion"""
    if not text:
        return ''
    return str(text).replace('\x00', '').strip()[:max_len]


def transform_record(r):
    """Transform raw UFO record to investigation format"""
    triage_score = calc_triage_score(r)
    confound_score = calc_confound_score(r)

    # Determine triage status
    if triage_score >= 7 and confound_score < 30:
        status = 'verified'
    elif triage_score >= 4 or confound_score < 50:
        status = 'provisional'
    else:
        status = 'pending'

    # Generate title
    date_str = r.get('date_time', '')[:10] if r.get('date_time') else 'Unknown'
    city = clean_text(r.get('city', 'Unknown'), 50)
    state = clean_text(r.get('state', ''), 20)
    shape = clean_text(r.get('shape', ''), 20)

    title = f"{shape + ' ' if shape else ''}UFO - {city}, {state} ({date_str})"[:200]

    # Description
    desc = clean_text(r.get('description', ''), 500) or 'UFO sighting report'

    # Build raw_data JSON
    raw_data = {
        'date_time': r.get('date_time'),
        'local_sidereal_time': r.get('local_sidereal_time'),
        'duration_seconds': r.get('duration_seconds'),
        'shape': r.get('shape'),
        'witness_count': r.get('witness_count'),
        'location': {
            'city': r.get('city'),
            'state': r.get('state'),
            'country': r.get('country'),
            'latitude': r.get('latitude'),
            'longitude': r.get('longitude'),
        },
        'geophysical': {
            'nearest_fault_line_km': r.get('nearest_fault_line_km'),
            'bedrock_type': r.get('bedrock_type'),
            'piezoelectric_bedrock': r.get('piezoelectric_bedrock'),
            'earthquake_nearby': r.get('earthquake_nearby'),
            'earthquake_count': r.get('earthquake_count'),
            'max_magnitude': r.get('max_magnitude'),
            'population_density': r.get('population_density'),
        },
        'geomagnetic': {
            'kp_index': r.get('kp_index'),
            'kp_max': r.get('kp_max'),
            'geomagnetic_storm': r.get('geomagnetic_storm'),
        },
        'confounds': {
            'military_base_nearby_km': r.get('military_base_nearby_km'),
            'airport_nearby_km': r.get('airport_nearby_km'),
            'weather_conditions': r.get('weather_conditions'),
        },
        'effects': {
            'physical_effects': r.get('physical_effects'),
            'physical_effects_desc': r.get('physical_effects_desc'),
            'physiological_effects': r.get('physiological_effects'),
            'physiological_effects_desc': r.get('physiological_effects_desc'),
            'em_interference': r.get('em_interference'),
            'em_interference_desc': r.get('em_interference_desc'),
        },
        'source': r.get('source'),
        'source_id': r.get('source_id'),
        'quality_score': triage_score,
        'confound_score': confound_score,
    }

    return {
        'user_id': SYSTEM_USER_ID,
        'investigation_type': 'ufo',
        'title': title,
        'description': desc,
        'raw_data': raw_data,
        'triage_score': triage_score,
        'triage_status': status,
        'triage_notes': f'Batch import. Quality: {triage_score}/10, Confound: {confound_score}%',
    }


def main():
    print(f"Loading data from {INPUT_FILE}...")
    with open(INPUT_FILE, 'r') as f:
        records = json.load(f)
    print(f"Loaded {len(records)} total records")

    # Filter: Tier 1 with coordinates AND LST
    tier1 = [r for r in records if r.get('latitude') and r.get('longitude') and r.get('local_sidereal_time')]
    print(f"Tier 1 (coords + LST): {len(tier1)}")

    # Filter: High signal (exclude duration-only)
    high_signal = [r for r in tier1 if (
        r.get('physiological_effects') or
        r.get('em_interference') or
        r.get('earthquake_nearby') or
        (r.get('witness_count') and r['witness_count'] > 1)
    )]
    print(f"High signal: {len(high_signal)}")

    # Sort by quality and take top N
    high_signal.sort(key=quality_score, reverse=True)
    selected = high_signal[:MAX_RECORDS]
    print(f"Selected top {len(selected)} records")

    # Transform records
    investigations = [transform_record(r) for r in selected]

    # Import in batches
    imported = 0
    failed = 0

    for i in range(0, len(investigations), BATCH_SIZE):
        batch = investigations[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(investigations) + BATCH_SIZE - 1) // BATCH_SIZE

        try:
            result = supabase.table('aletheia_investigations').insert(batch).execute()
            imported += len(batch)
            print(f"Batch {batch_num}/{total_batches}: Imported {len(batch)} records (total: {imported})")
        except Exception as e:
            failed += len(batch)
            print(f"Batch {batch_num}/{total_batches}: FAILED - {e}")

    print(f"\n=== Import Complete ===")
    print(f"Imported: {imported}")
    print(f"Failed: {failed}")

    # Print stats
    print(f"\n=== Data Quality ===")
    print(f"With physiological_effects: {sum(1 for r in selected if r.get('physiological_effects'))}")
    print(f"With em_interference: {sum(1 for r in selected if r.get('em_interference'))}")
    print(f"With earthquake_nearby: {sum(1 for r in selected if r.get('earthquake_nearby'))}")
    print(f"With witness_count > 1: {sum(1 for r in selected if r.get('witness_count') and r['witness_count'] > 1)}")
    print(f"With geomagnetic_storm: {sum(1 for r in selected if r.get('geomagnetic_storm'))}")


if __name__ == '__main__':
    main()
