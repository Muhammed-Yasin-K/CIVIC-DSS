import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Icon } from 'leaflet';
import api from '../services/api';

// Fix for default Leaflet marker icon
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

const getMarkerIcon = (color) => {
    let iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
    if (color === '#ef4444') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
    else if (color === '#f97316') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png';
    else if (color === '#eab308') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png';

    return new Icon({
        iconUrl: iconUrl,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
};

// ─── SHAP Explanation Panel ───────────────────────────────────────────────────
const featureLabels = {
    'C_x_Quarter': 'Seasonal Complaint Pattern',
    'Complaint_Per_1000': 'Complaint Rate per 1000 People',
    'Pop_density': 'Population Density',
    'Pop_x_C': 'Population × Complaint Volume',
    'C_x_Festival': 'Festival Period Complaints',
    'C_x_Season': 'Seasonal Risk Factor',
    'Log_Complaint': 'Complaint Volume',
    'C_x_Month': 'Monthly Complaint Pattern',
};

const ShapPanel = ({ ward, city, riskLevel, riskColor }) => {
    const [shapData, setShapData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState(null);

    const fetchShap = useCallback(async () => {
        if (shapData) { setOpen(true); return; } // already loaded
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/api/v1/analytics/shap/ward/${encodeURIComponent(ward)}/${encodeURIComponent(city)}?top_n=8`);
            setShapData(res.data?.data || null);
            setOpen(true);
        } catch (e) {
            setError('Explanation unavailable');
            setOpen(true);
        } finally {
            setLoading(false);
        }
    }, [ward, city, shapData]);

    const toggle = () => {
        if (!open) fetchShap();
        else setOpen(false);
    };

    // Compute max abs_shap for bar scaling
    const maxAbs = shapData?.shap_features
        ? Math.max(...shapData.shap_features.map(f => f.abs_shap), 0.0001)
        : 1;

    return (
        <div style={{ marginTop: '8px' }}>
            {/* Trigger button */}
            <button
                onClick={toggle}
                style={{
                    width: '100%',
                    padding: '5px 8px',
                    background: open ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
                    border: `1px solid rgba(99,102,241,0.4)`,
                    borderRadius: '6px',
                    color: '#818cf8',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    transition: 'all 0.2s',
                }}
            >
                {loading
                    ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span> Loading…</>
                    : open
                        ? '▲ Hide Explanation'
                        : '⚡ Why This Risk Level?'
                }
            </button>

            {/* SHAP content */}
            {open && (
                <div style={{
                    marginTop: '10px',
                    background: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '11px',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(148,163,184,0.3) transparent'
                }}>
                    {error ? (
                        <div style={{ color: '#f87171', textAlign: 'center', padding: '10px', fontSize: '13px' }}>{error}</div>
                    ) : shapData ? (
                        <div style={{ paddingRight: '4px' }}>
                            {/* Header row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                        Risk Driver Analysis
                                    </span>
                                    <div style={{ color: '#4ade80', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '14px', lineHeight: '0' }}>•</span>
                                        <span>AI Explained (XGBoost)</span>
                                    </div>
                                </div>
                                <div style={{
                                    background: riskLevel === 'Critical' ? '#ef4444' :
                                        riskLevel === 'High' ? '#f97316' :
                                            riskLevel === 'Medium' ? '#eab308' : '#22c55e',
                                    color: 'white',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}>
                                    {riskLevel.toUpperCase()}
                                </div>
                            </div>

                            {/* Feature list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {shapData.shap_features.map((feat, i) => {
                                    const isPos = feat.impact === 'positive';
                                    const barPct = Math.round((feat.abs_shap / maxAbs) * 100);
                                    const barColor = isPos
                                        ? 'linear-gradient(90deg, #ef444400 0%, #ef4444 100%)'
                                        : 'linear-gradient(90deg, #3b82f600 0%, #3b82f6 100%)';
                                    const label = featureLabels[feat.feature] || feat.feature.replace(/_/g, ' ');

                                    return (
                                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <span style={{
                                                    color: '#f1f5f9',
                                                    fontWeight: '600',
                                                    fontSize: '12px',
                                                    flex: 1,
                                                    paddingRight: '10px',
                                                    lineHeight: '1.2'
                                                }}>
                                                    {label}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '500' }}>
                                                        {typeof feat.value === 'number' ? feat.value.toFixed(1) : feat.value}
                                                    </span>
                                                    <span style={{
                                                        color: isPos ? '#f87171' : '#60a5fa',
                                                        fontWeight: '800',
                                                        fontSize: '11px',
                                                        minWidth: '55px',
                                                        textAlign: 'right'
                                                    }}>
                                                        {isPos ? '↑' : '↓'} {isPos ? '+' : ''}{feat.shap_value.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{
                                                height: '6px',
                                                background: 'rgba(30, 41, 59, 1)',
                                                borderRadius: '3px',
                                                overflow: 'hidden',
                                                position: 'relative',
                                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)'
                                            }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${Math.max(2, barPct)}%`,
                                                    background: barColor,
                                                    borderRadius: '3px',
                                                    transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Detailed Statistics Footer */}
                            <div style={{
                                borderTop: '1px solid rgba(148,163,184,0.15)',
                                marginTop: '16px',
                                paddingTop: '10px',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: '700' }}>Bias Value</span>
                                    <span style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '700' }}>{shapData.base_value.toFixed(3)}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                                    <span style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: '700' }}>Probability</span>
                                    <span style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '700' }}>{(shapData.predicted_probability * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

// ─── Main Map Component ───────────────────────────────────────────────────────
const MapComponent = () => {
    const [hotspots, setHotspots] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHotspots();
    }, []);

    const fetchHotspots = async () => {
        try {
            const response = await api.get('/api/v1/analytics/hotspots/recurring?limit=500');
            setHotspots(response.data.hotspots || []);
            console.log(`Map loaded ${response.data.hotspots?.length || 0} hotspots (total in DB: ${response.data.count || 0})`);
        } catch (error) {
            console.error('Failed to fetch hotspots:', error);
            setHotspots([]);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (level) => {
        const severity = (level || '').toUpperCase();
        if (severity === 'CRITICAL') return '#ef4444';
        if (severity === 'HIGH') return '#f97316';
        if (severity === 'MEDIUM') return '#eab308';
        return '#22c55e'; // Low
    };

    const getRiskLevel = (level) => {
        if (!level) return 'Low';
        return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
    };

    // Count hotspots by severity level directly from API
    const criticalCount = hotspots.filter(h => (h.hotspot_level || '').toUpperCase() === 'CRITICAL').length;
    const highRiskCount = hotspots.filter(h => (h.hotspot_level || '').toUpperCase() === 'HIGH').length;
    const mediumRiskCount = hotspots.filter(h => (h.hotspot_level || '').toUpperCase() === 'MEDIUM').length;

    // Default center (India)
    const defaultCenter = [20.5937, 78.9629];

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            {/* Hotspot Counter Overlay */}
            {!loading && hotspots.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '500',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                }}>
                    <div style={{ marginBottom: '6px', fontSize: '11px', opacity: 0.7 }}>Risk Hotspots (Total: {hotspots.length})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
                            <span>Critical: {criticalCount}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f97316' }}></div>
                            <span>High: {highRiskCount}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }}></div>
                            <span>Medium: {mediumRiskCount}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Indicator */}
            {loading && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                    background: 'rgba(15,23,42,0.9)',
                    padding: '20px 30px',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px'
                }}>
                    Loading hotspots...
                </div>
            )}

            <MapContainer
                center={defaultCenter}
                zoom={5}
                style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', zIndex: 1, borderRadius: 'inherit' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {!loading && (
                    <>
                        {/* 1. First render all circles (Fixed positions, not clustered) */}
                        {hotspots.map((hotspot, idx) => {
                            const lat = hotspot.latitude || 20.5937;
                            const lng = hotspot.longitude || 78.9629;
                            const level = (hotspot.hotspot_level || 'MEDIUM').toUpperCase();
                            const color = getRiskColor(level);
                            const displayScore = hotspot.avg_risk_score || (hotspot.priority_score || 0) * 5;
                            const radius = Math.min(5000, Math.max(500, displayScore * 100));
                            return (
                                <Circle
                                    key={`circle-${idx}`}
                                    center={[lat, lng]}
                                    pathOptions={{
                                        color: color,
                                        fillColor: color,
                                        fillOpacity: 0.2,
                                        weight: 1.5
                                    }}
                                    radius={radius}
                                />
                            );
                        })}

                        {/* 2. Then render clustered markers */}
                        <MarkerClusterGroup
                            chunkedLoading
                            maxClusterRadius={40}
                            spiderfyOnMaxZoom={true}
                        >
                            {hotspots.map((hotspot, idx) => {
                                const lat = hotspot.latitude || 20.5937;
                                const lng = hotspot.longitude || 78.9629;
                                const level = (hotspot.hotspot_level || 'MEDIUM').toUpperCase();
                                const color = getRiskColor(level);
                                const riskLevelStr = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
                                const showShap = level === 'CRITICAL' || level === 'HIGH';
                                const displayScore = hotspot.avg_risk_score || (hotspot.priority_score || 0) * 5;
                                const displayAlerts = (hotspot.critical_count || 0) + (hotspot.high_count || 0);

                                return (
                                    <Marker
                                        key={`marker-${idx}`}
                                        position={[lat, lng]}
                                        icon={getMarkerIcon(color)}
                                        zIndexOffset={level === 'CRITICAL' ? 1000 : (level === 'HIGH' ? 500 : 0)}
                                    >
                                        <Popup minWidth={300} maxWidth={300}>
                                            <div style={{ width: '280px', padding: '2px 0' }}>
                                                <div className="font-bold border-b pb-1 mb-2 text-slate-800 text-sm">
                                                    {hotspot.zone || hotspot.ward}
                                                </div>

                                                <div className="space-y-2 mb-3">
                                                    <div className="flex justify-between text-xs items-center">
                                                        <span className="text-slate-500 font-medium">Risk Level:</span>
                                                        <span style={{ color: color, fontWeight: '700', fontSize: '13px' }}>{riskLevelStr}</span>
                                                    </div>

                                                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded border border-blue-200 dark:border-blue-800">
                                                        <div className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase mb-2">TEMPORAL PREDICTION</div>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-slate-600">Peak Season:</span>
                                                            <span className="font-bold text-blue-700">{hotspot.top_season}</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-600">Next Peak:</span>
                                                            <span className="font-bold text-orange-600">{hotspot.next_peak}</span>
                                                        </div>
                                                        <div className="border-t border-blue-200 dark:border-blue-800 my-2"></div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-600">Top Issue:</span>
                                                            <span className="font-medium text-slate-800">{hotspot.top_issue}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[11px] mt-1 italic">
                                                            <span className="text-slate-400 font-medium whitespace-nowrap">Profile: </span>
                                                            <span className="text-amber-500 font-semibold text-right">{hotspot.top_cluster}</span>
                                                        </div>
                                                        {hotspot.real_incident && (
                                                            <div className="mt-3 overflow-hidden rounded-lg border border-indigo-500/30 bg-slate-950/40 shadow-lg backdrop-blur-md">
                                                                <div className="flex items-center gap-2 bg-indigo-600/10 px-3 py-1.5 border-b border-indigo-500/20">
                                                                    <span className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-1.5">
                                                                        <span className="w-1 h-1 rounded-full bg-indigo-600 animate-pulse"></span>
                                                                        Verified Event
                                                                    </span>
                                                                </div>
                                                                <div className="p-3">
                                                                    <div className="text-[12px] text-slate-100 leading-relaxed font-medium italic relative">
                                                                        <span className="absolute -left-1 -top-1 text-indigo-500/20 text-2xl font-serif">"</span>
                                                                        {hotspot.real_incident}
                                                                        <span className="absolute -right-1 bottom-0 text-indigo-500/20 text-2xl font-serif">"</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                                        <div className="text-center">
                                                            <div className="text-[10px] text-slate-400 uppercase font-semibold">SCORE</div>
                                                            <div className="text-sm font-bold text-slate-800">{displayScore}</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-[10px] text-slate-400 uppercase font-semibold">ALERTS</div>
                                                            <div className="text-sm font-bold text-slate-800">{displayAlerts}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ── SHAP Panel (CRITICAL & HIGH only) ── */}
                                                {showShap && (
                                                    <div style={{ marginTop: '10px' }}>
                                                        <ShapPanel
                                                            ward={hotspot.ward || hotspot.zone}
                                                            city={hotspot.city}
                                                            riskLevel={riskLevelStr}
                                                            riskColor={color}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MarkerClusterGroup>
                    </>
                )}
            </MapContainer>

            {/* Spinner keyframe */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default MapComponent;
