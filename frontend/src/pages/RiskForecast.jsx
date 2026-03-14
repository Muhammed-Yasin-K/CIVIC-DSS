import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    BarChart3,
    AlertCircle,
    MapPin,
    Activity,
    CloudRain,
    BarChart2,
    ArrowUpRight,
    ArrowDownRight,
    Zap
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Area,
    ComposedChart,
    BarChart,
    Bar,
    Cell,
    ReferenceLine
} from 'recharts';
import api from '../services/api';

// ─── Helper: severity from priority score percentile ───────────────────────
const getLevel = (score, config) => {
    if (!config) return { label: 'MEDIUM', className: 'badge-medium' };
    const { high_min, low_max } = config.risk_thresholds;
    if (score >= high_min) return { label: 'CRITICAL', className: 'badge-critical' };
    if (score >= low_max) return { label: 'HIGH', className: 'badge-high' };
    return { label: 'MEDIUM', className: 'badge-medium' };
};

// ─── Custom Tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-panel p-4 rounded-2xl border border-white/20 shadow-xl text-xs backdrop-blur-md">
            <p className="font-black text-[var(--text-primary)] mb-2 uppercase tracking-widest">{label}</p>
            {payload.map((entry, i) => (
                entry.value != null && (
                    <p key={i} className="font-bold mt-1" style={{ color: entry.color }}>
                        {entry.name === 'historical' ? '📊 Historical' :
                            entry.name === 'forecast' ? '🔮 Forecast' :
                                entry.name}:{' '}
                        <span className="font-black">{Math.round(entry.value).toLocaleString()}</span>
                    </p>
                )
            ))}
        </div>
    );
};

const RiskForecast = () => {
    const [data, setData] = useState({ forecast: [], historical: [], metadata: {} });
    const [topWards, setTopWards] = useState([]);
    const [insights, setInsights] = useState({ recommendations: [], intelligence: [] });
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [config, setConfig] = useState(null);
    const [selectedZone, setSelectedZone] = useState('');
    // Predefined geographic regions (must match REGIONS_MAP in seed_regional_forecasts.py)
    const GEOGRAPHIC_REGIONS = [
        { value: 'North', label: '🧭 North', sub: 'Delhi, Shimla, Jaipur, Prayagraj' },
        { value: 'South-West', label: '🧭 South-West', sub: 'Kerala (Kochi, Thrissur, Kozhikode...)' },
        { value: 'South-East', label: '🧭 South-East', sub: 'Bengaluru, Chennai, Hyderabad' },
        { value: 'West', label: '🧭 West', sub: 'Mumbai, Pune, Ahmedabad, Indore, Panaji' },
        { value: 'East', label: '🧭 East', sub: 'Kolkata' },
    ];

    useEffect(() => {
        const init = async () => {
            await fetchUserProfile();
        };
        init();
    }, []);

    useEffect(() => {
        // Fetch data whenever selectedZone changes
        if (userProfile) {
            fetchData(selectedZone);
            fetchTopWards(selectedZone);
            fetchInsights(selectedZone);
        }
    }, [selectedZone, userProfile]);

    const fetchUserProfile = async () => {
        try {
            const [profileRes, configRes] = await Promise.allSettled([
                api.get('/api/v1/auth/me'),
                api.get('/api/v1/config')
            ]);

            let profile = null;
            if (profileRes.status === 'fulfilled') {
                profile = profileRes.value.data;
                setUserProfile(profile);
            }
            if (configRes.status === 'fulfilled') {
                setConfig(configRes.value.data);
            }

            // No zone fetch needed — regions are pre-defined

            // Reverse-map city name → geographic region for officers
            // e.g. "Ernakulam" → "South-West"
            const CITY_TO_REGION = {
                "Delhi": "North", "Shimla": "North", "Jaipur": "North", "Prayagraj": "North",
                "Alappuzha": "South-West", "Ernakulam": "South-West", "Idukki": "South-West",
                "Kannur": "South-West", "Kasaragod": "South-West", "Kochi": "South-West",
                "Kollam": "South-West", "Kottayam": "South-West", "Kozhikode": "South-West",
                "Malappuram": "South-West", "Palakkad": "South-West", "Pathanamthitta": "South-West",
                "Thiruvananthapuram": "South-West", "Thrissur": "South-West", "Wayanad": "South-West",
                "Bengaluru": "South-East", "Chennai": "South-East", "Hyderabad": "South-East",
                "Ahmedabad": "West", "Indore": "West", "Mumbai": "West", "Panaji": "West", "Pune": "West",
                "Kolkata": "East",
            };

            if (profile) {
                const officerCity = profile.jurisdiction || (profile.assigned_zones?.length > 0 ? profile.assigned_zones[0] : '');
                const defaultZone = profile.role === 'officer'
                    ? (CITY_TO_REGION[officerCity] || officerCity)
                    : '';
                setSelectedZone(defaultZone);
            }
        } catch (error) {
            console.error('Failed to fetch profile/config:', error);
            setLoading(false);
        }
    };

    const fetchData = async (zone = '') => {
        try {
            setLoading(true);
            const url = `/api/v1/analytics/forecast?days=6${zone ? `&zone=${encodeURIComponent(zone)}` : ''}`;
            const response = await api.get(url);
            setData(response.data || { forecast: [], historical: [], metadata: {} });
        } catch (error) {
            console.error('Failed to fetch forecast data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTopWards = async (zone = '') => {
        try {
            const url = `/api/v1/analytics/hotspots/recurring?limit=5${zone ? `&zone=${encodeURIComponent(zone)}` : ''}`;
            const response = await api.get(url);
            setTopWards(response.data.hotspots || []);
        } catch (error) {
            console.error('Failed to fetch top wards:', error);
        }
    };

    const fetchInsights = async (zone = '') => {
        try {
            const url = `/api/v1/analytics/insights${zone ? `?zone=${encodeURIComponent(zone)}` : ''}`;
            const response = await api.get(url);
            setInsights(response.data || { recommendations: [], intelligence: [] });
        } catch (error) {
            console.error('Failed to fetch insights:', error);
        }
    };

    // ── Build unified chart dataset ─────────────────────────────────────────
    const chartData = [
        ...(data.historical || []).map(h => ({
            name: new Date(h.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            historical: h.actual_value,
            isBridge: h.is_bridge || false,
            fullDate: h.date
        })),
        ...(data.forecast || []).map(f => ({
            name: new Date(f.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            forecast: f.predicted_value,
            lower: Math.max(0, f.lower_bound),
            upper: f.upper_bound,
            fullDate: f.date
        }))
    ];

    // Find the transition point label (last historical → first forecast)
    const lastHistLabel = data.historical?.length
        ? new Date(data.historical[data.historical.length - 1].date)
            .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : null;

    const maxPredicted = data.forecast?.length
        ? Math.max(...data.forecast.map(f => f.predicted_value))
        : 1;

    // ── Seasonal bar data from metadata or fallback ─────────────────────────
    const seasonalAverages = data.metadata?.seasonal_breakdown || [
        { name: 'Summer (Mar–May)', value: 0, color: '#fb923c' },
        { name: 'Monsoon (Jun–Sep)', value: 0, color: '#3b82f6' },
        { name: 'Winter (Oct–Feb)', value: 0, color: '#818cf8' }
    ];

    // Max priority for badge calculation
    const maxPriority = topWards.length
        ? Math.max(...topWards.map(w => w.priority_score || 0))
        : 1;

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
        </div>
    );

    return (
        <div className="space-y-8 max-w-[1440px] mx-auto pb-12">
            {/* ── HEADER ─────────────────────────────────────────────────── */}
            <div className="border-b border-[var(--border-subtle)] pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2 bg-orange-500 rounded-xl text-white shadow-lg shadow-orange-500/20">
                            <TrendingUp size={32} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)]">
                            Risk <span className="text-orange-500 uppercase">Forecast</span>
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-4">
                        {userProfile && (
                            <div className="flex items-center gap-2 bg-[var(--surface-alt)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)]">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">
                                    {userProfile.full_name}
                                </span>
                            </div>
                        )}
                        <p className="text-[var(--text-secondary)] text-sm font-medium">
                            {selectedZone
                                ? `🧭 Region: ${selectedZone} — ${GEOGRAPHIC_REGIONS.find(r => r.value === selectedZone)?.sub || ''}`
                                : '🌐 Global city-wide perspective with aggregated analytics'}
                        </p>
                    </div>

                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mt-3">
                        Predictive model · {data.metadata?.training_records || 1300} validated records
                    </p>
                </div>

                {/* Zone Selector */}
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                        <MapPin size={12} /> Resource Context
                    </label>
                    {userProfile?.role === 'officer' ? (
                        /* Officer: fixed read-only zone badge */
                        <div className="flex items-center gap-3 bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl px-5 py-3 w-full md:w-64">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                            <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                                {selectedZone || userProfile?.jurisdiction || 'Assigned Zone'}
                            </span>
                            <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-green-500 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded-md shrink-0">Locked</span>
                        </div>
                    ) : (
                        /* Admin: full region dropdown */
                        <div className="relative group">
                            <select
                                value={selectedZone}
                                onChange={(e) => setSelectedZone(e.target.value)}
                                className="appearance-none bg-[var(--surface-alt)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-bold rounded-xl px-5 py-3 pr-12 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all w-full md:w-64 cursor:pointer hover:bg-[var(--surface)]"
                            >
                                <option value="">🌐 Global (All Regions)</option>
                                {GEOGRAPHIC_REGIONS.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                                <ArrowDownRight size={18} className="rotate-45" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── SUMMARY CARDS ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                    title="Trend Direction"
                    value={data.metadata?.trend || "Stable"}
                    sub="vs Historical Average"
                    icon={data.metadata?.trend?.includes('Rising')
                        ? <ArrowUpRight className="text-red-500" />
                        : <ArrowDownRight className="text-green-500" />}
                />
                <Card
                    title="Peak Season"
                    value={data.metadata?.peak_season || "Monsoon"}
                    sub="Highest Complaint Volume"
                    icon={<CloudRain className="text-blue-400" />}
                />
                <Card
                    title="Avg Monthly Complaints"
                    value={(data.metadata?.avg_monthly_complaints || 440).toLocaleString()}
                    sub="Historical Average"
                    icon={<BarChart3 className="text-purple-400" />}
                />
                <Card
                    title="Forecast Period"
                    value="6 Months"
                    sub="ARIMA Forecast Horizon"
                    icon={<Calendar className="text-orange-400" />}
                />
            </div>


            {/* ── AI ACTION RECOMMENDATIONS (DSS LAYER) ──────────────────── */}
            <div className="bg-[var(--surface)] border-2 border-orange-500/20 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-orange-500/10 transition-all duration-700"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-orange-500 rounded-lg text-white">
                            <Zap size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-[var(--text-primary)]">Management Insights</h2>
                            <p className="text-[10px] uppercase font-black tracking-widest text-orange-500">Data-driven monitoring</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Recommendations */}
                        {insights.recommendations?.map((rec, idx) => (
                            <div key={idx} className={`p-6 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-subtle)] hover:border-${idx === 0 ? 'orange' : 'blue'}-500/30 transition-all group/card`}>
                                <span className={`text-[10px] font-black text-${idx === 0 ? 'orange' : 'blue'}-500 uppercase tracking-widest block mb-4`}>{rec.type}</span>
                                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{rec.title}</h3>
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                    {rec.text}
                                </p>
                            </div>
                        ))}

                        {/* Intelligence Feed */}
                        <div className="p-6 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-subtle)]">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Regional Intelligence</h3>
                            <div className="space-y-4">
                                {insights.intelligence?.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 text-xs">
                                        <div className={`w-1 h-1 rounded-full bg-${idx % 2 === 0 ? 'orange' : 'blue'}-500 mt-1.5 shrink-0`}></div>
                                        <p className="text-[var(--text-secondary)]">
                                            <span className="font-bold text-[var(--text-primary)]">{item.source}:</span> {item.text}
                                        </p>
                                    </div>
                                ))}
                                {(!insights.intelligence || insights.intelligence.length === 0) && (
                                    <p className="text-[10px] text-[var(--text-muted)] italic uppercase">No recent intelligence feed available for this region.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* ── HOTSPOT SIDEBAR ──────────────────────────────────────── */}
                <div className="xl:col-span-1 space-y-6">
                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                        <MapPin size={16} /> Hotspot Ranking (Top 5)
                    </h3>
                    <div className="space-y-3">
                        {topWards.map((ward, idx) => {
                            const lvl = getLevel(ward.priority_score || 0, config);
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="glass-panel p-5 rounded-2xl border-l-4 border-l-red-500/50 hover:bg-[var(--surface-alt)]/50 transition-all border border-[var(--border-subtle)]"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-black text-[var(--text-primary)] text-sm">{ward.ward} · {ward.city}</h4>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${lvl.className}`}>
                                            {lvl.label}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-4">
                                        <div>
                                            <p className="text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Priority</p>
                                            <p className="text-xl font-black text-[var(--text-primary)]">{typeof ward.priority_score === 'number' ? ward.priority_score.toFixed(2) : ward.priority_score}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Focus</p>
                                            <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">{ward.top_issue}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* ── MAIN CHART ───────────────────────────────────────────── */}
                <div className="xl:col-span-3 space-y-6">
                    <div className="glass-panel p-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-[var(--border-subtle)]">
                            <div>
                                <h3 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-3">
                                    <BarChart2 size={24} className="text-[var(--primary)]" />
                                    Risk Trends
                                </h3>
                                <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-widest font-bold">
                                    Real data (2016–2025) · Seasonal bridge (2025–2026) · SARIMA forecast (2026–2027)
                                </p>
                            </div>
                            <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                                <span className="flex items-center gap-2"><span className="w-4 h-1 bg-[var(--primary)] rounded-full"></span>Historical</span>
                                <span className="flex items-center gap-2"><span className="w-4 h-1 bg-orange-500 rounded-full" style={{ borderTop: '2px dashed white' }}></span>Forecast</span>
                            </div>
                        </div>

                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="fillForecast" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.18} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="fillHist" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.10} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="var(--text-muted)"
                                        fontSize={10}
                                        fontWeight={900}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={15}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        stroke="var(--text-muted)"
                                        fontSize={10}
                                        fontWeight={900}
                                        tickLine={false}
                                        axisLine={false}
                                        domain={[0, 'auto']}
                                        tickMargin={15}
                                        tickFormatter={v => v.toLocaleString()}
                                    />
                                    <Tooltip content={<CustomTooltip />} />

                                    {/* Confidence band */}
                                    <Area type="monotone" dataKey="upper" stroke="none" fill="#f97316" fillOpacity={0.10} connectNulls />
                                    <Area type="monotone" dataKey="lower" stroke="none" fill="var(--surface)" fillOpacity={1} connectNulls />

                                    {/* Reference line: forecast starts */}
                                    {lastHistLabel && (
                                        <ReferenceLine
                                            x={lastHistLabel}
                                            stroke="#f97316"
                                            strokeDasharray="4 2"
                                            strokeOpacity={0.5}
                                            label={{ value: 'Forecast →', position: 'top', fill: '#f97316', fontSize: 9, fontWeight: 900 }}
                                        />
                                    )}

                                    {/* Historical (blue solid) */}
                                    <Line
                                        type="monotone"
                                        dataKey="historical"
                                        name="historical"
                                        stroke="#3b82f6"
                                        strokeWidth={2.5}
                                        dot={{ r: 2.5, fill: '#3b82f6', strokeWidth: 0 }}
                                        activeDot={{ r: 5 }}
                                        connectNulls
                                    />
                                    {/* Forecast (orange dashed) */}
                                    <Line
                                        type="monotone"
                                        dataKey="forecast"
                                        name="forecast"
                                        stroke="#f97316"
                                        strokeWidth={2.5}
                                        strokeDasharray="6 4"
                                        dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
                                        activeDot={{ r: 6 }}
                                        connectNulls
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        <p className="text-[10px] text-[var(--text-muted)] mt-6 text-center italic font-medium uppercase tracking-widest">
                            Bridge months use seasonal averages from real data · SARIMA(1,1,1)(1,1,1,12) · {data.metadata?.training_records || 1300} records
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* ── MONTHLY FORECAST TABLE ───────────────────────── */}
                        <div className="glass-panel overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)]">
                            <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--surface-alt)]/50">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)]">
                                    Forecast Details
                                </h3>
                                <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-widest">Monthly projections</p>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="text-[10px] uppercase text-[var(--text-muted)] font-black bg-[var(--surface-alt)]">
                                    <tr>
                                        <th className="px-6 py-4">Period</th>
                                        <th className="px-6 py-4 text-center">Volume</th>
                                        <th className="px-6 py-4 text-center">CI Range</th>
                                        <th className="px-6 py-4 text-right">Risk</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {(data.forecast || []).map((f, i) => {
                                        const level = (() => {
                                            const ratio = f.predicted_value / (maxPredicted || 1);
                                            if (ratio >= 0.80) return { label: 'CRITICAL', className: 'badge-critical' };
                                            if (ratio >= 0.55) return { label: 'HIGH', className: 'badge-high' };
                                            return { label: 'MEDIUM', className: 'badge-medium' };
                                        })();
                                        return (
                                            <tr key={i} className="hover:bg-[var(--surface-alt)] transition-colors group">
                                                <td className="px-6 py-5 font-bold text-[var(--text-primary)]">
                                                    {new Date(f.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-5 text-center font-black text-orange-600 dark:text-orange-400 text-lg group-hover:scale-110 transition-transform">
                                                    {f.predicted_value.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-5 text-center text-[10px] text-[var(--text-muted)] font-black uppercase tracking-tighter">
                                                    {f.lower_bound.toLocaleString()} – {f.upper_bound.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${level.className}`}>
                                                        {level.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ── SEASONAL BAR CHART ───────────────────────────── */}
                        <div className="glass-panel p-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] flex flex-col justify-between">
                            <div className="w-full">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)] mb-1">
                                    Seasonal Risk Distribution
                                </h3>
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-8">
                                    Avg complaint volumes by season
                                </p>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={seasonalAverages} margin={{ top: 10 }}>
                                            <XAxis dataKey="name" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} stroke="var(--text-muted)" tickMargin={10} />
                                            <YAxis hide domain={[0, 650]} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'var(--surface)',
                                                    border: '1px solid var(--border-subtle)',
                                                    borderRadius: '12px',
                                                    padding: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: 900
                                                }}
                                            />
                                            <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={55} label={{ position: 'top', fontSize: 11, fontWeight: 900, fill: 'var(--text-primary)' }}>
                                                {seasonalAverages.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-500/10 p-5 rounded-2xl border border-blue-200 dark:border-blue-500/20 mt-6 w-full">
                                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed text-center font-black uppercase tracking-wide">
                                    <span className="opacity-60">Peak Season:</span> {data.metadata?.peak_season || 'Monsoon'} — Historical High-Risk Interval
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Card = ({ title, value, sub, icon }) => (
    <div className="glass-panel p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] hover:translate-y-[-4px] transition-all cursor-default group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)] opacity-5 blur-3xl -mr-12 -mt-12 group-hover:opacity-10 transition-opacity"></div>
        <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-[var(--surface-alt)] rounded-2xl border border-[var(--border-subtle)] group-hover:scale-110 transition-transform duration-500">
                {icon}
            </div>
        </div>
        <div>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">{title}</p>
            <p className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">{value}</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-black italic uppercase tracking-tighter opacity-60">{sub}</p>
        </div>
    </div>
);

export default RiskForecast;
