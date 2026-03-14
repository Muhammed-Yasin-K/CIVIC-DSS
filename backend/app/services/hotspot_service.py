"""Hotspot service for DBSCAN cluster data"""
import logging
import numpy as np
from typing import Optional, List, Dict, Any
import pandas as pd

logger = logging.getLogger(__name__)


class HotspotService:
    """Service for handling DBSCAN hotspot data"""
    
    @staticmethod
    async def get_recurring_hotspots(
        zone: Optional[str] = None,
        month: Optional[int] = None,
        year: Optional[int] = None,
        min_risk_score: float = 0.0,
        city: Optional[str] = None,
        issue_type: Optional[str] = None,
        min_priority_score: Optional[int] = None,
        hotspot_level: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Get recurring hotspots from DBSCAN clustering.
        Prioritizes the full 500-zone CSV dataset for 'recurring' analysis.
        """
        try:
            # Shift priority: Try CSV first as it contains the full 500 records
            from app.ml.model_manager import model_manager
            hotspots_df = model_manager.get_data("dbscan_hotspots")
            
            if hotspots_df is not None:
                return await HotspotService._process_csv_hotspots(
                    hotspots_df=hotspots_df,
                    zone=zone,
                    city=city,
                    month=month,
                    year=year,
                    issue_type=issue_type,
                    category=category,
                    min_priority_score=min_priority_score,
                    hotspot_level=hotspot_level,
                    min_risk_score=min_risk_score,
                    limit=limit
                )

            # Fallback to MongoDB only if CSV is unavailable
            from app.models.hotspot import Hotspot
            query = {}
            if zone: query["zone"] = zone
            if city: query["city"] = city
            if issue_type: query["issue_type"] = issue_type
            
            if hotspot_level:
                level_upper = hotspot_level.upper()
                if level_upper == 'MEDIUM':
                    query["hotspot_level"] = {"$in": ["MEDIUM", "HIGH", "CRITICAL"]}
                elif level_upper == 'HIGH':
                    query["hotspot_level"] = {"$in": ["HIGH", "CRITICAL"]}
                else:
                    query["hotspot_level"] = level_upper
            
            if category: query["category"] = category
            
            # Risk score and Occurrence filters
            query["avg_risk_score"] = {"$gte": min_risk_score}
            if min_priority_score:
                query["priority_score"] = {"$gte": min_priority_score}
            
            db_hotspots = await Hotspot.find(query).limit(limit).to_list()
            if db_hotspots:
                return [h.model_dump(exclude={"id", "created_at", "updated_at"}) for h in db_hotspots]
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting hotspots: {e}", exc_info=True)
            return []

    @staticmethod
    async def _process_csv_hotspots(
        hotspots_df: pd.DataFrame,
        zone: Optional[str] = None,
        city: Optional[str] = None,
        month: Optional[int] = None,
        year: Optional[int] = None,
        issue_type: Optional[str] = None,
        category: Optional[str] = None,
        min_priority_score: Optional[int] = None,
        hotspot_level: Optional[str] = None,
        min_risk_score: float = 0.0,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Internal helper to process CSV data with current filters and rescaling"""
        try:
            # Normalize column names 
            hotspots_df = hotspots_df.copy()
            hotspots_df.columns = [c.strip() for c in hotspots_df.columns]
            col_map = {c.lower(): c for c in hotspots_df.columns}
            
            def get_col(df, name):
                if name in df.columns: return name
                return col_map.get(name.lower())
            
            # Column mapping
            city_col = get_col(hotspots_df, 'city') or get_col(hotspots_df, 'City')
            ward_col = get_col(hotspots_df, 'ward') or get_col(hotspots_df, 'Ward')
            priority_score_col = get_col(hotspots_df, 'priority_score') or get_col(hotspots_df, 'Priority_Score')
            total_count_col = get_col(hotspots_df, 'total') or get_col(hotspots_df, 'Total')
            cluster_col = get_col(hotspots_df, 'top_cluster') or get_col(hotspots_df, 'Top_Cluster')
            issue_col = get_col(hotspots_df, 'top_issue') or get_col(hotspots_df, 'Top_Issue')
            level_col = get_col(hotspots_df, 'hotspot_level') or get_col(hotspots_df, 'Hotspot_Level')
            lat_col = get_col(hotspots_df, 'latitude') or get_col(hotspots_df, 'Latitude')
            lon_col = get_col(hotspots_df, 'longitude') or get_col(hotspots_df, 'Longitude')
            date_col = get_col(hotspots_df, 'last_date') or get_col(hotspots_df, 'Last_Date')
            season_col = get_col(hotspots_df, 'top_season') or get_col(hotspots_df, 'Top_Season')
            crit_col = get_col(hotspots_df, 'critical_count') or get_col(hotspots_df, 'Critical_Count')
            high_col = get_col(hotspots_df, 'high_count') or get_col(hotspots_df, 'High_Count')
            incident_col = get_col(hotspots_df, 'real_incident') or get_col(hotspots_df, 'Real_Incident')

            # Apply filters
            filtered_df = hotspots_df.copy()
            
            # Geographic region → city expansion
            REGIONS_MAP = {
                "North": ["Delhi", "Shimla", "Jaipur", "Prayagraj"],
                "South-West": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kochi", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
                "South-East": ["Bengaluru", "Chennai", "Hyderabad"],
                "West": ["Ahmedabad", "Indore", "Mumbai", "Panaji", "Pune"],
                "East": ["Kolkata"],
            }

            # Zone filter — expand region names to city lists
            if zone:
                logger.debug(f"Filtering hotspots by zone/city pattern: {zone}")
                if zone in REGIONS_MAP:
                    # Region name passed (e.g., "South-West") — expand to cities
                    cities = REGIONS_MAP[zone]
                    city_pattern = "|".join(cities)
                    filtered_df = filtered_df[
                        filtered_df[city_col].astype(str).str.contains(city_pattern, case=False, na=False, regex=True)
                    ] if city_col else filtered_df
                else:
                    zone_search = str(zone).lower()
                    filtered_df = filtered_df[
                        (filtered_df[city_col].astype(str).str.lower().str.contains(zone_search, na=False) if city_col else False) |
                        (filtered_df[ward_col].astype(str).str.lower().str.contains(zone_search, na=False) if ward_col else False)
                    ]

            # City/Region filter (Supports Regex Union)
            if city:
                city_search = str(city).lower()
                filtered_df = filtered_df[
                    (filtered_df[city_col].astype(str).str.lower().str.contains(city, case=False, na=False, regex=True) if city_col else False) |
                    (filtered_df[ward_col].astype(str).str.lower().str.contains(city, case=False, na=False, regex=True) if ward_col else False)
                ]
            
            # Date filters
            if month is not None or year is not None:
                if date_col:
                    filtered_df[date_col] = pd.to_datetime(filtered_df[date_col], errors='coerce')
                    if month is not None:
                        filtered_df = filtered_df[filtered_df[date_col].dt.month == int(month)]
                    if year is not None:
                        filtered_df = filtered_df[filtered_df[date_col].dt.year == int(year)]

            if issue_type and issue_col:
                filtered_df = filtered_df[filtered_df[issue_col].astype(str).str.contains(issue_type, case=False, na=False)]
            
            if category and cluster_col:
                filtered_df = filtered_df[filtered_df[cluster_col].astype(str).str.contains(category, case=False, na=False)]

            # MIN PRIORITY SCORE FILTER (Now based on Total/occurrence_count)
            if min_priority_score is not None and total_count_col:
                filtered_df = filtered_df[pd.to_numeric(filtered_df[total_count_col], errors='coerce').fillna(0) >= min_priority_score]
            
            # Risk Level filter
            if hotspot_level and level_col:
                level_upper = hotspot_level.upper()
                levels = [level_upper]
                if level_upper == 'MEDIUM': levels = ['MEDIUM', 'HIGH', 'CRITICAL']
                elif level_upper == 'HIGH': levels = ['HIGH', 'CRITICAL']
                filtered_df = filtered_df[filtered_df[level_col].astype(str).str.upper().isin(levels)]

            # Severity sorting
            severity_map = {'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1}
            if level_col:
                filtered_df['severity_rank'] = filtered_df[level_col].astype(str).str.upper().map(severity_map).fillna(0)
                filtered_df = filtered_df.sort_values(by=['severity_rank', priority_score_col] if priority_score_col else ['severity_rank'], ascending=False)
            elif priority_score_col:
                filtered_df = filtered_df.sort_values(by=priority_score_col, ascending=False)

            # Limit results
            filtered_df = filtered_df.head(limit)
            
            # Pre-fetch config once for the entire batch to avoid O(N) database calls
            from app.models.system_config import SystemConfig
            config = await SystemConfig.find_one()
            if not config:
                config = SystemConfig()
            
            low_max = config.risk_thresholds.low_max
            high_min = config.risk_thresholds.high_min

            hotspots = []
            for _, row in filtered_df.iterrows():
                u_city = str(row[city_col]) if city_col else 'Unknown'
                u_ward = str(row[ward_col]) if ward_col else ''
                zone_name = f"{u_ward}, {u_city}" if (u_ward and u_ward != 'nan' and u_city and u_city != 'nan') else (u_ward or u_city or 'Unknown')
                
                # Raw fields from CSV
                p_score = int(row[priority_score_col]) if priority_score_col else 0
                c_count = int(row[crit_col]) if crit_col else 0
                h_count = int(row[high_col]) if high_col else 0
                
                # Temporal derivation (Realistic peaks)
                peak_season = str(row[season_col]) if (season_col and str(row[season_col]) != 'nan') else 'Summer'
                
                season_peaks = {
                    'Summer': 'Apr - May',
                    'Monsoon': 'Jun - Aug',
                    'Post-Monsoon': 'Oct - Nov',
                    'Winter': 'Dec - Feb',
                    'Festival': 'Jan - Mar'
                }
                next_peak = season_peaks.get(peak_season, 'Mar - May')
                
                # Consistency Overrides
                t_issue = str(row[issue_col]) if issue_col and str(row[issue_col]) != 'nan' else 'General'
                t_cluster = str(row[cluster_col]) if cluster_col and str(row[cluster_col]) != 'nan' else 'Standard Risk'
                h_level = str(row[level_col]).upper() if level_col else 'MEDIUM'
                
                # Piecewise Calibrated Scaling (Verified Ground Truth)
                p_val = float(p_score)
                if p_val < 6.0:
                    # Low scale: Raw < 6.0 maps to 0 -> low_max
                    final_score = p_val * (low_max / 6.0)
                elif p_val < 10.0:
                    # Medium/High transition: Raw 6-9 maps to low_max -> high_min
                    final_score = low_max + (p_val - 6.0) * ((high_min - low_max) / 4.0)
                else:
                    # Critical scale: Raw 10+ maps to high_min+
                    final_score = high_min + (p_val - 10.0) * 1.25
                
                final_score = round(final_score, 2)
                
                hotspot = {
                    'zone': zone_name,
                    'city': u_city,
                    'ward': u_ward,
                    'priority_score': final_score,
                    'avg_risk_score': final_score, 
                    'occurrence_count': c_count + h_count, 
                    'critical_count': c_count,
                    'high_count': h_count,
                    'latitude': float(row[lat_col]) if lat_col and str(row[lat_col]) not in ('nan', '') else None,
                    'longitude': float(row[lon_col]) if lon_col and str(row[lon_col]) not in ('nan', '') else None,
                    'top_issue': t_issue,
                    'top_cluster': t_cluster,
                    'hotspot_level': h_level,
                    'top_season': peak_season,
                    'next_peak': next_peak,
                    'last_occurrence': str(row[date_col]) if date_col and str(row[date_col]) != 'nan' else None,
                    'real_incident': str(row[incident_col]) if incident_col and str(row[incident_col]) != 'nan' else None
                }
                
                # Sanitization
                lon = hotspot['longitude']
                is_hyd = 'hyderabad' in zone_name.lower()
                if (is_hyd and lon is not None and lon < 75.0) or (lon is not None and lon < 69.0):
                    continue

                hotspots.append(hotspot)
            
            return hotspots
        except Exception as e:
            logger.error(f"CSV processing error: {e}", exc_info=True)
            return []

    @staticmethod
    async def get_hotspot_statistics(zone: Optional[str] = None) -> Dict[str, Any]:
        """Get overall statistics (prioritizing CSV for data consistency)"""
        try:
            from app.ml.model_manager import model_manager
            df = model_manager.get_data("dbscan_hotspots")
            
            if df is not None and not df.empty:
                # Apply jurisdiction filter if provided
                if zone:
                    zone_search = str(zone).lower()
                    col_map = {c.lower().strip(): c for c in df.columns}
                    city_col = col_map.get('city')
                    ward_col = col_map.get('ward')
                    
                    df = df[
                        (df[city_col].astype(str).str.lower().str.contains(zone_search, na=False, regex=True) if city_col else False) |
                        (df[ward_col].astype(str).str.lower().str.contains(zone_search, na=False, regex=True) if ward_col else False)
                    ]
                
                if df.empty:
                    return {'total_hotspots': 0, 'high_risk_hotspots': 0, 'avg_risk_score': 0.0}

                col_map = {c.lower().strip(): c for c in df.columns}
                # Mapping priority scores: try priority_score, risk_score, then fallback to Total (from CSV)
                risk_col = col_map.get('priority_score') or col_map.get('risk_score') or col_map.get('total')
                level_col = col_map.get('hotspot_level')
                
                if risk_col and level_col:
                    p_scores = pd.to_numeric(df[risk_col], errors='coerce').fillna(0.0)
                    # For CSV data where 'Total' is 1-20, scale to 100
                    scale = 5.0 if p_scores.max() <= 20 else 1.0
                    scores = p_scores.values * scale
                    
                    return {
                        'total_hotspots': len(df),
                        'high_risk_hotspots': len(scores[scores >= 70]), # High or Critical threshold typically 70+
                        'avg_risk_score': float(np.mean(scores))
                    }
                elif risk_col:
                    p_scores = pd.to_numeric(df[risk_col], errors='coerce').fillna(0.0)
                    scale = 5.0 if p_scores.max() <= 20 else 1.0
                    scores = p_scores.values * scale
                    return {
                        'total_hotspots': len(df),
                        'high_risk_hotspots': len(scores[scores >= 75]),
                        'avg_risk_score': float(scores.mean())
                    }
            
            return {'total_hotspots': 0, 'high_risk_hotspots': 0, 'avg_risk_score': 0.0}
        except Exception as e:
            logger.error(f"Stats error: {e}", exc_info=True)
            return {'total_hotspots': 0, 'high_risk_hotspots': 0, 'avg_risk_score': 0.0}

    @staticmethod
    async def get_ai_insights(city: Optional[str] = None, zone: Optional[str] = None) -> Dict[str, Any]:
        """Generate dynamic AI insights based on regional hotspot data"""
        try:
            hotspots = await HotspotService.get_recurring_hotspots(city=city, zone=zone, limit=10)
            
            if not hotspots:
                return {
                    "recommendations": [],
                    "intelligence": [
                        {"source": "System", "text": "Insufficient regional data for advanced AI insights. Standard models active."}
                    ]
                }
            
            # 1. Resource Reallocation Recommendation (based on top hotspot)
            top_h = hotspots[0]
            top_issue = top_h['top_issue']
            peak = top_h['top_season']
            
            # Context-aware type naming
            rec_type = "Critical Alert" if top_h['avg_risk_score'] > 85 else "Priority Intervention"
            
            rec1 = {
                "type": rec_type,
                "title": f"{top_issue} Monitoring",
                "text": f"Based on the {top_h['avg_risk_score']}% risk of {top_issue} in {top_h['zone']}, we recommend prioritizing surveillance in this sector to mitigate potential surges.",
            }
            
            # 2. Infrastructure Preemption (based on top issue characteristics)
            is_infra = any(kw in top_issue.lower() for kw in ['water', 'pipe', 'drain', 'road', 'electricity'])
            
            rec2 = {
                "type": "Predictive Insight" if is_infra else "Hotspot Analysis",
                "title": "Mitigation Strategy" if is_infra else "Sanitation Focus",
                "text": f"High historical probability of {top_issue} clusters during {peak}. System suggests increased inspection frequency for {top_h['zone']} and surrounding wards.",
            }
            
            # 3. Regional Intelligence Feed (Dynamic News)
            intelligence = []
            seen_cities = set()
            for h in hotspots:
                city_name = h['city']
                if city_name not in seen_cities:
                    issue = h['top_issue']
                    risk = h['avg_risk_score']
                    trend = "surge" if risk > 80 else "fluctuation"
                    intelligence.append({
                        "source": city_name,
                        "text": f"{city_name}: Detected {trend} in {issue} hotspots. Regional units should prioritize surveillance in neighboring sectors."
                    })
                    seen_cities.add(city_name)
                if len(intelligence) >= 3:
                    break
            
            # Fallback if intelligence is thin
            if len(intelligence) < 2:
                intelligence.append({"source": "Regional Hub", "text": "Stable risk profile across other sectors. Standard model confirmed."})

            return {
                "recommendations": [rec1, rec2],
                "intelligence": intelligence
            }
        except Exception as e:
            logger.error(f"Error generating AI insights: {e}")
            return {"recommendations": [], "intelligence": []}

    @staticmethod
    async def seed_hotspots_if_empty():
        """Automatically seed hotspots from CSV if the MongoDB collection is empty"""
        from app.models.hotspot import Hotspot
        from app.ml.model_manager import model_manager
        from datetime import datetime
        import xgboost as xgb
        from pathlib import Path

        try:
            count = await Hotspot.count()
            if count > 0:
                logger.info("Hotspots already seeded in MongoDB.")
                return

            logger.info("Hotspots collection is empty. Seeding from historical clusters...")
            
            csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "models" / "dbscan_hotspot_clusters.csv"
            if not csv_path.exists():
                logger.error(f"Geographic data CSV not found at {csv_path}")
                return
                
            df = pd.read_csv(csv_path)
            model = model_manager.get_model("xgboost")
            feature_columns = model_manager.get_encoder("feature_columns")
            
            if not model or not feature_columns:
                logger.warning("XGBoost model or features not loaded. Using CSV raw priority scores for seeding.")
                risk_scores = 60.08 + (df.get('Priority_Score', pd.Series([0.0]*len(df))) * 1.6622)
                # Initialize X_pred for the fallback path as well, if feature_columns are available
                X_pred = pd.DataFrame(index=df.index)
                for col in feature_columns:
                    if col == "Latitude": X_pred[col] = df['Latitude']
                    elif col == "Longitude": X_pred[col] = df['Longitude']
                    else: X_pred[col] = 0.0
            else:
                X_pred = pd.DataFrame(index=df.index)
                for col in feature_columns:
                    if col == "Latitude": X_pred[col] = df['Latitude']
                    elif col == "Longitude": X_pred[col] = df['Longitude']
                    else: X_pred[col] = 0.0
                
                dmatrix = xgb.DMatrix(X_pred, feature_names=feature_columns)
                risk_preds = model.predict(dmatrix)
                if len(risk_preds.shape) > 1 and risk_preds.shape[1] > 1:
                    risk_scores = (risk_preds[:, 0] * 1.0 + risk_preds[:, 1] * 0.7 + risk_preds[:, 3] * 0.4 + risk_preds[:, 2] * 0.1)
                else:
                    risk_scores = risk_preds

            hotspot_docs = []
            for i, row in df.iterrows():
                level = str(row.get('Hotspot_Level', 'Medium')).upper()
                last_date = None
                if 'Last_Date' in df.columns and str(row.get('Last_Date')) != 'nan':
                    try:
                        last_date = datetime.strptime(str(row['Last_Date']), '%Y-%m-%d')
                    except: pass

                # Map to Beanie/Pydantic model fields
                doc = {
                    "zone": f"{row.get('Ward', 'Zone')} ({row.get('City', 'Unknown')})",
                    "latitude": float(row['Latitude']),
                    "longitude": float(row['Longitude']),
                    "avg_risk_score": float(max(risk_scores[i] * 100, row.get('Priority_Score', 0) * 5)),
                    "occurrence_count": int(row.get('Total', 10)),
                    "risk_frequency": "Monthly",
                    "hotspot_level": level,
                    "city": str(row.get('City', 'Unknown')),
                    "ward": str(row.get('Ward', 'Unknown')),
                    "state": str(row.get('State', 'Unknown')),
                    "issue_type": str(row.get('Top_Issue', 'General')),
                    "category": str(row.get('Top_Cluster', 'Public Safety')),
                    "top_season": str(row.get('Top_Season', 'Unknown')),
                    "last_occurrence": last_date,
                    "real_incident": str(row.get('Real_Incident', '')),
                    "cluster_id": int(i),
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                hotspot_docs.append(doc)
                
            if hotspot_docs:
                # Use insert_many directly on the collection via Beanie's motor layer
                await Hotspot.get_motor_collection().insert_many(hotspot_docs)
                logger.info(f"Successfully auto-seeded {len(hotspot_docs)} granular hotspots.")

        except Exception as e:
            logger.error(f"Error in auto_seeding hotspots: {e}")
