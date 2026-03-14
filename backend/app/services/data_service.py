import pandas as pd
import io
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.prediction import Prediction, RiskLevel
from app.models.alert import Alert
from app.models.hotspot import Hotspot

logger = logging.getLogger(__name__)

class DataService:
    @staticmethod
    async def ingest_csv(content: bytes, collection_type: str, user: Optional[Any] = None) -> Dict[str, Any]:
        """Ingest CSV data into specified collection"""
        from app.services.audit_service import AuditService
        try:
            df = pd.read_csv(io.BytesIO(content))
            records = df.to_dict(orient='records')

            count = 0
            skipped = 0
            if collection_type == "alerts":
                for r in records:
                    try:
                        alert = Alert(**r)
                        await alert.insert()
                        count += 1
                    except Exception:
                        skipped += 1
            elif collection_type == "predictions":
                for r in records:
                    try:
                        if 'risk_level' in r and str(r['risk_level']).upper() in [l.value.upper() for l in RiskLevel]:
                            r['risk_level'] = str(r['risk_level']).lower()
                        prediction = Prediction(**r)
                        await prediction.insert()
                        count += 1
                    except Exception:
                        skipped += 1
            else:
                return {"success": False, "message": f"Unsupported collection: '{collection_type}'. Use 'alerts' or 'predictions'."}

            msg = f"Successfully ingested {count} records."
            if skipped:
                msg += f" {skipped} rows skipped due to schema mismatch."
            
            # Log successful ingestion
            await AuditService.log_data_event(
                action="ingest_payload",
                details={"collection": collection_type, "count": count, "skipped": skipped},
                user=user
            )
            
            return {"success": True, "count": count, "skipped": skipped, "message": msg}
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            # Log failed ingestion
            await AuditService.log_data_event(
                action="ingest_payload",
                details={"collection": collection_type, "error": str(e)},
                user=user,
                status="failed"
            )
            return {"success": False, "message": str(e)}

    @staticmethod
    async def run_consistency_check(user: Optional[Any] = None) -> Dict[str, Any]:
        """Scan databases for anomalies and null values"""
        from app.services.audit_service import AuditService
        anomalies = []
        
        # Check Predictions for null scores or missing levels
        null_preds = await Prediction.find({"$or": [{"risk_score": None}, {"risk_level": None}]}).to_list()
        for p in null_preds:
            anomalies.append({
                "id": str(p.id),
                "collection": "predictions",
                "issue": "Missing Risk Score/Level",
                "severity": "HIGH"
            })

        # Check for out-of-range risk scores (>100 or <0)
        range_preds = await Prediction.find({"$or": [{"risk_score": {"$gt": 100}}, {"risk_score": {"$lt": 0}}]}).to_list()
        for p in range_preds:
            anomalies.append({
                "id": str(p.id),
                "collection": "predictions",
                "issue": f"Out of range score: {p.risk_score}",
                "severity": "CRITICAL"
            })

        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "anomalies_found": len(anomalies),
            "details": anomalies[:10] # Return top 10 for UI
        }
        
        # Log consistency check
        await AuditService.log_data_event(
            action="consistency_check",
            details={"anomalies_found": len(anomalies)},
            user=user
        )
        
        return results
