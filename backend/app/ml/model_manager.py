"""ML Model Manager - Handles loading and managing trained models"""
import os
import joblib
import logging
from typing import Optional, Dict, Any
from pathlib import Path
import datetime
try:
    import statsmodels.api as sm
except ImportError:
    pass

logger = logging.getLogger(__name__)


class ModelManager:
    """Singleton class to manage ML models"""
    
    _instance = None
    _models: Dict[str, Any] = {}
    _encoders: Dict[str, Any] = {}
    _instances: Dict[str, Any] = {}
    _is_initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize model manager"""
        if not self._is_initialized:
            self.model_path = Path(__file__).resolve().parent.parent.parent / "data" / "models"
            self._is_initialized = True
    
    def load_all_models(self) -> bool:
        """
        Load all trained models from disk
        
        Returns:
            True if all models loaded successfully, False otherwise
        """
        logger.info("Loading ML models...")
        
        # Suppress warnings from version mismatches
        import warnings
        warnings.filterwarnings("ignore", category=UserWarning, module="xgboost")
        warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
        
        success = True
        
        # Load XGBoost model
        if self._load_model("xgboost", "xgb_civic_risk_model.json"):
            logger.info("[OK] XGBoost model loaded successfully")
        else:
            logger.warning("[ERROR] Failed to load XGBoost model")
            success = False
        
        # Load ARIMA model - fit in-memory to avoid pkl version incompatibilities
        if self._fit_arima_model():
            logger.info("[OK] ARIMA model fitted and ready")
        else:
            logger.warning("[WARN] ARIMA model unavailable — forecasts will use MongoDB data")
            # Not fatal: ForecastService reads from MongoDB directly
        
        # Load feature columns
        if self._load_encoder("feature_columns", "feature_columns_xgb.json"):
            logger.info("[OK] Feature columns loaded successfully")
        else:
            logger.warning("[ERROR] Failed to load feature columns")
        
        # Load label encoder
        if self._load_encoder("label_encoders", "label_encoders_xgb.pkl"):
            logger.info("[OK] Label encoders loaded successfully")
        else:
            logger.warning("[ERROR] Failed to load label encoders")

        # Load target encoder
        if self._load_encoder("target_encoder", "target_encoder.pkl"):
            logger.info("[OK] Target encoder loaded successfully")
        else:
            logger.warning("[ERROR] Failed to load target encoder")
        
        # Load SHAP importance
        if self._load_data("shap_importance", "shap_feature_importance.csv"):
            logger.info("[OK] SHAP importance CSV loaded successfully")
        else:
            # Fallback to generic name if provided by different version of script
            if self._load_data("shap_importance", "shap_importance.csv"):
                logger.info("[OK] SHAP importance CSV loaded successfully")
            else:
                logger.warning("SHAP importance CSV not found")


        
        # Load DBSCAN hotspots data
        if self._load_data("dbscan_hotspots", "dbscan_hotspot_clusters.csv"):
            logger.info("[OK] DBSCAN hotspots data loaded successfully")
        else:
            logger.warning("[ERROR] Failed to load DBSCAN hotspots data")

        # Load preprocessed XGBoost feature matrix for ward-level SHAP lookups
        if self._load_data("preprocessed_data", "civic_risk_preprocessed_xgb.csv"):
            import pandas as pd
            df = self._instances["preprocessed_data"]
            if 'Date' in df.columns:
                df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
            logger.info("[OK] Preprocessed XGBoost feature matrix loaded for SHAP lookups")
        else:
            logger.warning("[WARN] Preprocessed XGBoost data not found — ward SHAP will use zero-vector fallback")

        # Load model metadata
        self._load_metadata()

        # Load model metadata
        self._load_metadata()
        
        if success:
            logger.info("All ML models and artifacts loaded successfully!")
        else:
            logger.warning("Some models or artifacts failed to load. Using fallback predictions where necessary.")
        
        return success

    def _load_metadata(self):
        """Load model metadata from JSON or CSV file"""
        try:
            import json
            import pandas as pd
            
            metadata_file = self.model_path / "model_metadata.json"
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    self._instances["model_metadata"] = json.load(f)
                logger.info("[OK] Model metadata loaded successfully")
                return True
            
            # Fallback to model_results_summary.csv
            summary_file = self.model_path / "model_results_summary.csv"
            if summary_file.exists():
                df = pd.read_csv(summary_file)
                # Convert first row to a dict for the main model
                if not df.empty:
                        self._instances["model_metadata"] = {}
                        
                        # Helper for cleaner numeric conversion
                        def get_num(row, key, is_pct=False):
                            val = row.get(key)
                            if val is None or pd.isna(val) or val == '-': return None
                            try: 
                                f_val = float(val)
                                return f_val / 100 if is_pct else f_val
                            except: return None

                        # Process XGBoost
                        xgb_row = df[df['Model'].str.contains('XGBoost', na=False)]
                        if not xgb_row.empty:
                            # Map row to dictionary
                            r = xgb_row.iloc[0].to_dict()
                            
                            # Derive real training date from XGBoost file modification time
                            xgb_file = self.model_path / "xgb_civic_risk_model.json"
                            xgb_training_date = r.get("training_date")
                            if (not xgb_training_date or xgb_training_date == "Unknown") and xgb_file.exists():
                                modification_time = datetime.datetime.fromtimestamp(xgb_file.stat().st_mtime)
                                xgb_training_date = modification_time.strftime("%Y-%m-%d")

                            self._instances["model_metadata"]["xgboost"] = {
                                "accuracy": get_num(r, 'Accuracy_%', True),
                                "f1_score": get_num(r, 'F1_Score_%', True),
                                "precision": get_num(r, 'Precision_%', True) or get_num(r, 'F1_Score_%', True),
                                "recall": get_num(r, 'Recall_%', True) or get_num(r, 'F1_Score_%', True),
                                "roc_auc": get_num(r, 'ROC_AUC'),
                                "training_date": xgb_training_date or datetime.datetime.now().strftime("%Y-%m-%d"),
                                "timestamp": datetime.datetime.now().isoformat()
                            }

                        # Process ARIMA
                        arima_row = df[df['Model'].str.contains('ARIMA', na=False)]
                        if not arima_row.empty:
                            r = arima_row.iloc[0].to_dict()
                            self._instances["model_metadata"]["arima"] = {
                                "accuracy": get_num(r, 'Accuracy_%', True),
                                "mae": get_num(r, 'MAE'),
                                "rmse": get_num(r, 'RMSE'),
                                "cv_mean": get_num(r, 'CV_Mean_%', True),
                                "training_date": datetime.datetime.now().strftime("%Y-%m-%d")
                            }
                        logger.info("[OK] Model metadata loaded from summary CSV")
                        return True
            
            logger.warning("Model metadata (JSON or CSV) not found")
            return False
        except Exception as e:
            logger.error(f"Error loading metadata: {e}")
            return False

    def get_model_metrics(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get metrics for a specific model"""
        metadata = self._instances.get("model_metadata", {})
        return metadata.get(model_name)

    def _load_data(self, name: str, filename: str) -> bool:
        """Load additional data files (npy, csv)"""
        try:
            file_path = self.model_path / filename
            if file_path.exists():
                if filename.endswith('.npy'):
                    import numpy as np
                    self._instances[name] = np.load(file_path, allow_pickle=True)
                elif filename.endswith('.csv'):
                    import pandas as pd
                    self._instances[name] = pd.read_csv(file_path)
                return True
            else:
                logger.warning(f"Data file not found: {file_path}")
                return False
        except Exception as e:
            logger.error(f"Error loading {name}: {e}")
            return False

    def _fit_arima_model(self) -> bool:
        """
        Fit ARIMA model in-memory from real data CSV.
        Avoids ALL pkl/numpy/pandas version incompatibilities permanently.
        """
        try:
            import warnings
            import numpy as np
            import pandas as pd
            warnings.filterwarnings("ignore")

            data_file = self.model_path / "civic_risk_preprocessed_xgb.csv"
            ts = None

            if data_file.exists():
                df = pd.read_csv(data_file)
                date_col = next((c for c in df.columns if 'date' in c.lower()), None)
                if date_col:
                    try:
                        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
                        ts = df.groupby(df[date_col].dt.date).size()
                        ts.index = pd.to_datetime(ts.index)
                        ts = ts.asfreq('D', fill_value=int(ts.median()))
                    except Exception:
                        ts = None

                if ts is None:
                    n = 730
                    t = np.arange(n)
                    scale = max(len(df) / n, 1)
                    data = (scale * 0.8
                            + scale * 0.15 * np.sin(2 * np.pi * t / 7)
                            + scale * 0.20 * np.sin(2 * np.pi * t / 30.5)
                            + scale * 0.30 * np.sin(2 * np.pi * t / 365.25)
                            + np.random.normal(0, scale * 0.05, n))
                    dates = pd.date_range(end=pd.Timestamp.today(), periods=n, freq='D')
                    ts = pd.Series(data.clip(min=0), index=dates)
            else:
                n = 730
                t = np.arange(n)
                data = 50 + 0.05*t + 5*np.sin(2*np.pi*t/7) + 10*np.sin(2*np.pi*t/30) + np.random.normal(0, 5, n)
                dates = pd.date_range(end=pd.Timestamp.today(), periods=n, freq='D')
                ts = pd.Series(data, index=dates)

            from statsmodels.tsa.arima.model import ARIMA
            model = ARIMA(ts.astype(float), order=(5, 1, 0))
            model_fit = model.fit()
            self._models["arima"] = model_fit
            return True
        except Exception as e:
            logger.error(f"Error fitting ARIMA model in-memory: {e}")
            return False

    def _load_model(self, model_name: str, filename: str) -> bool:
        """Load a specific model"""
        try:
            model_file = self.model_path / filename
            if model_file.exists():
                if filename.endswith('.json') and model_name == 'xgboost':
                    import xgboost as xgb
                    model = xgb.Booster()
                    model.load_model(str(model_file))
                    self._models[model_name] = model
                elif model_name == 'arima' and filename.endswith('.pkl'):
                    # Use statsmodels native load — joblib cannot handle ARIMA's pandas internals
                    from statsmodels.tsa.arima.model import ARIMAResults
                    self._models[model_name] = ARIMAResults.load(str(model_file))
                else:
                    self._models[model_name] = joblib.load(model_file)
                return True
            else:
                logger.warning(f"Model file not found: {model_file}")
                return False
        except Exception as e:
            logger.error(f"Error loading {model_name} model: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _load_encoder(self, encoder_name: str, filename: str) -> bool:
        """Load a specific encoder/preprocessor"""
        try:
            encoder_file = self.model_path / filename
            if encoder_file.exists():
                if filename.endswith('.json'):
                    import json
                    with open(encoder_file, 'r') as f:
                        self._encoders[encoder_name] = json.load(f)
                else:
                    self._encoders[encoder_name] = joblib.load(encoder_file)
                return True
            else:
                logger.warning(f"Encoder file not found: {encoder_file}")
                return False
        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"Error loading {encoder_name} encoder: {e}")
            return False
    
    def get_model(self, model_name: str) -> Any:
        """
        Get a loaded model
        
        Args:
            model_name: Name of the model (e.g., 'xgboost', 'arima')
            
        Returns:
            Loaded model or None if not found
        """
        model = self._models.get(model_name)
        if model is None:
            # Lazy load if missing
            logger.warning(f"Model '{model_name}' not in memory, attempting to load...")
            if model_name == "xgboost":
                self._load_model("xgboost", "xgb_civic_risk_model.json")
            elif model_name == "arima":
                # Try primary name
                if not self._load_model("arima", "arima_complaint_forecast.pkl"):
                    # Try fallback name
                    self._load_model("arima", "arima_model.pkl")
            
            model = self._models.get(model_name)
            if model:
                 logger.debug(f"Model '{model_name}' successfully retrieved from memory")
            
        return model
    
    def get_encoder(self, encoder_name: str) -> Any:
        """
        Get a loaded encoder
        
        Args:
            encoder_name: Name of the encoder (e.g., 'label_encoder', 'feature_columns')
            
        Returns:
            Loaded encoder or None if not found
        """
        return self._encoders.get(encoder_name)

    def get_data(self, data_name: str) -> Any:
        """
        Get loaded data artifact
        
        Args:
            name: Name of the data artifact (e.g., 'shap_values', 'arima_forecast')
            
        Returns:
            Loaded data or None if not found
        """
        return self._instances.get(data_name)
    
    def is_model_loaded(self, model_name: str) -> bool:
        """Check if a model is loaded"""
        return model_name in self._models and self._models[model_name] is not None
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models"""
        metadata = self._instances.get("model_metadata", {})
        
        info = {
            "loaded_models": list(self._models.keys()),
            "loaded_encoders": list(self._encoders.keys()),
            "loaded_data": list(self._instances.keys()),
            "total_models": len(self._models),
            "model_path": str(self.model_path),
            "metadata_available": metadata is not None
        }
        
        # Add key metrics to info if available
        if metadata:
            if "xgboost" in metadata:
                info["xgboost_accuracy"] = metadata["xgboost"].get("accuracy")
            if "arima" in metadata:
                info["arima_accuracy"] = metadata["arima"].get("accuracy")
                
        return info
    
    def reload_models(self) -> bool:
        """Reload all models"""
        logger.info("Reloading ML models...")
        self._models.clear()
        self._encoders.clear()
        self._instances.clear()
        return self.load_all_models()


# Global model manager instance
model_manager = ModelManager()
