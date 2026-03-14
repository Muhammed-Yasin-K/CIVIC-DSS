import pandas as pd
from pathlib import Path

def deduplicate_hotspots():
    csv_path = Path("d:/Main_Project/backend/data/models/dbscan_hotspot_clusters.csv")
    if not csv_path.exists():
        print(f"Error: CSV not found at {csv_path}")
        return

    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    original_count = len(df)

    # 1. Deduplicate by Ward, City, State (Geographical unique)
    # We keep the one with the highest Priority_Score if duplicates exist
    df = df.sort_values('Priority_Score', ascending=False)
    df = df.drop_duplicates(subset=['Ward', 'City', 'State'], keep='first')
    after_geo_dedup = len(df)

    # 2. Deduplicate by Real_Incident (Avoiding narrative repetition)
    # The user explicitly said "remove wards with same incident"
    # We drop rows where the Real_Incident text is exactly the same
    # We keep 'first' which is the one with highest score due to previous sorting
    df = df.drop_duplicates(subset=['Real_Incident'], keep='first')
    final_count = len(df)

    print(f"Original records: {original_count}")
    print(f"After Geo Deduplication (unique wards): {after_geo_dedup}")
    print(f"Final Count after Incident Deduplication: {final_count}")

    # Save the cleaned CSV
    df.to_csv(csv_path, index=False)
    print(f"Successfully saved cleaned data to {csv_path}")

if __name__ == "__main__":
    deduplicate_hotspots()
