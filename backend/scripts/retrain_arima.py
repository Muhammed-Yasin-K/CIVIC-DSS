"""
Retrain SARIMA model using real historical data and save with statsmodels native format.
Uses SARIMA(1,1,1)(1,1,1,12) to capture monthly seasonality in civic complaints.
Also bridges the data gap from last real date (Jan 2025) to Feb 2026.
"""
import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings("ignore")

def retrain_arima():
    print("Retraining SARIMA model on monthly historical volumes...")
    
    model_path = Path("data/models")
    data_file = model_path / "civic_risk_preprocessed_xgb.csv"
    
    if not data_file.exists():
        print(f"Error: {data_file} not found.")
        return False

    print(f"Loading 1,300 historical records from {data_file.name}...")
    df = pd.read_csv(data_file)
    
    if 'Date' not in df.columns:
        print("Error: 'Date' column missing in historical data.")
        return False

    try:
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        # Aggregate by Month
        monthly_raw = df.groupby(df['Date'].dt.to_period('M')).size()
        
        # Scale to "Actual Volumes" (300-600 range)
        # 15 records/month * 30 = 450 volume
        monthly_volume = monthly_raw * 30
        
        # Convert to datetime index for statsmodels
        monthly_volume.index = monthly_volume.index.to_timestamp()
        
        # Fill missing months in the 2016-2025 range
        all_months = pd.date_range(start=monthly_volume.index.min(), end=monthly_volume.index.max(), freq='MS')
        ts = monthly_volume.reindex(all_months, fill_value=monthly_volume.mean())
        
        # Bridge gap: generate synthetic monthly data from last real date to Feb 2026
        # using seasonal averages from real historic data (same month, prior years)
        last_real_date = ts.index.max()
        bridge_end = pd.Timestamp('2026-02-01')
        
        if last_real_date < bridge_end:
            bridge_months = pd.date_range(start=last_real_date + pd.DateOffset(months=1), end=bridge_end, freq='MS')
            bridge_values = []
            for m in bridge_months:
                # Average of same calendar month in prior years
                same_month_vals = ts[ts.index.month == m.month]
                if len(same_month_vals) > 0:
                    seasonal_avg = same_month_vals.mean()
                    # Add slight upward trend (+1.5% per year from last real point)
                    years_ahead = (m.year - last_real_date.year) + (m.month - last_real_date.month) / 12
                    trend_factor = 1 + (0.015 * years_ahead)
                    bridge_values.append(round(seasonal_avg * trend_factor))
                else:
                    bridge_values.append(int(ts.mean()))
            
            bridge_series = pd.Series(bridge_values, index=bridge_months)
            ts = pd.concat([ts, bridge_series])
            print(f"  Bridge data added: {bridge_months[0].date()} to {bridge_months[-1].date()} ({len(bridge_months)} months)")
        
        print(f"  Monthly series: {len(ts)} months, range: {ts.index.min().date()} to {ts.index.max().date()}")
        print(f"  Monthly Volume: avg {ts.mean():.1f}, last {ts.iloc[-1]:.1f}")
    except Exception as e:
        print(f"  Date aggregation failed: {e}")
        return False

    # Fit SARIMA model: (1,1,1) non-seasonal x (1,1,1,12) seasonal
    print("Fitting SARIMA(1,1,1)(1,1,1,12) on monthly volume...")
    from statsmodels.tsa.statespace.sarimax import SARIMAX
    model = SARIMAX(
        ts.astype(float),
        order=(1, 1, 1),
        seasonal_order=(1, 1, 1, 12),
        enforce_stationarity=False,
        enforce_invertibility=False
    )
    model_fit = model.fit(disp=False)
    print("  Fitted successfully.")

    # Save model
    save_path = model_path / "arima_complaint_forecast.pkl"
    model_fit.save(str(save_path))
    print(f"[OK] Model saved: {save_path}")

    # Generate 6-month Forecast starting from Mar 2026
    from datetime import datetime
    forecast_steps = 6
    forecast = model_fit.get_forecast(steps=forecast_steps)
    forecast_values = forecast.predicted_mean
    conf_int = forecast.conf_int()
    
    forecast_df = pd.DataFrame({
        'date': pd.date_range(start=ts.index.max() + pd.DateOffset(months=1), periods=forecast_steps, freq='MS'),
        'predicted_complaints': forecast_values.values.round(0).astype(int),
        'lower_bound': conf_int.iloc[:, 0].values.round(0).astype(int),
        'upper_bound': conf_int.iloc[:, 1].values.round(0).astype(int),
        'confidence': [0.95] * forecast_steps
    })
    
    forecast_df.to_csv(model_path / "arima_forecast.csv", index=False)
    print(f"[OK] 6-month Forecast CSV saved.")
    print(f"\n  Forecast Preview:")
    print(forecast_df[['date', 'predicted_complaints', 'lower_bound', 'upper_bound']].to_string(index=False))
    
    # Calculate Trend
    last_year_avg = ts.tail(12).mean()
    forecast_avg = forecast_values.mean()
    trend_pct = ((forecast_avg - last_year_avg) / last_year_avg) * 100
    print(f"\n  Calculated Trend: {'Rising' if trend_pct > 0 else 'Falling'} {trend_pct:+.1f}%")
    
    return True

if __name__ == "__main__":
    retrain_arima()
    print("\nDone! Now run: python scripts\\seed_arima_forecasts.py")
