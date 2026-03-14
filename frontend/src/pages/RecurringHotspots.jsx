import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    TrendingUp, MapPin, Calendar, AlertTriangle,
    BarChart3, Brain, Activity, Info, Edit3,
    CheckSquare, Map as MapIcon, Navigation,
    Users, Shield, Send, ClipboardCheck,
    ShieldCheck, CheckCircle, User
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, ReferenceLine, Label
} from 'recharts';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

// Fix for default Leaflet marker icon
const getMarkerIcon = (color) => {
    let iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
    if (color === '#ef4444') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
    else if (color === '#f59e0b') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png';
    else if (color === '#fbbf24') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png';

    return new Icon({
        iconUrl: iconUrl,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
};

const ChangeMapCenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, 13);
    }, [center, map]);
    return null;
};

const RecurringHotspots = () => {
    const navigate = useNavigate();
    const [hotspots, setHotspots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedHotspot, setSelectedHotspot] = useState(null);
    const [timeline, setTimeline] = useState(null);
    const [shapData, setShapData] = useState(null);
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [filters, setFilters] = useState({
        region: '',
        issue_type: '',
        min_priority_score: 1,
        min_risk_level: 'Medium',
        hotspot_level: 'Medium',
        category: '',
        month: '',
        year: '',
        limit: 500
    });
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [officers, setOfficers] = useState([]);
    const [assignmentData, setAssignmentData] = useState({
        officerId: '',
        priority: 'High',
        description: ''
    });
    const [isAssigning, setIsAssigning] = useState(false);
    const [verifiedEvents, setVerifiedEvents] = useState([]);
    const userRole = localStorage.getItem('role') || 'officer';

    useEffect(() => {
        fetchHotspots();
    }, [filters]);

    useEffect(() => {
        if (isAssignmentModalOpen) {
            fetchOfficers();
        }
    }, [isAssignmentModalOpen]);

    const fetchOfficers = async () => {
        try {
            const response = await api.get('/api/v1/users/?role=officer');
            setOfficers(response.data.users || []);
        } catch (error) {
            console.error('Failed to fetch officers:', error);
        }
    };

    const fetchHotspots = async () => {
        try {
            setLoading(true);
            const role = localStorage.getItem('role');
            const jurisdiction = localStorage.getItem('jurisdiction');

            const currentFilters = { ...filters };
            if (role === 'officer' && jurisdiction) {
                currentFilters.city = jurisdiction;
            }

            const cleanFilters = Object.fromEntries(
                Object.entries(currentFilters).filter(([k, v]) => v !== '' && v !== null && k !== 'region')
            );
            // Region filter → passed as `zone` so hotspot_service expands it to city list
            if (currentFilters.region) {
                cleanFilters.zone = currentFilters.region;
            }
            const params = new URLSearchParams(cleanFilters).toString();
            const response = await api.get(`/api/v1/analytics/hotspots/recurring?${params}`);
            setHotspots(response.data.hotspots);
        } catch (error) {
            console.error('Failed to fetch hotspots:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVerifiedEvents = async (ward) => {
        try {
            const response = await api.get(`/api/v1/inspections/?zone=${ward}&status=completed`);
            setVerifiedEvents(response.data || []);
        } catch (error) {
            console.error('Failed to fetch verified events:', error);
            setVerifiedEvents([]);
        }
    };

    const fetchInsightBriefing = async (hotspot) => {
        setSelectedHotspot(hotspot);
        setLoadingInsight(true);
        setVerifiedEvents([]); // Reset history
        try {
            // Parallel fetch for Timeline and SHAP
            const [timelineRes, shapRes, verifiedEventsRes] = await Promise.allSettled([
                api.get(`/api/v1/analytics/hotspots/timeline/${encodeURIComponent(hotspot.zone)}?days=30`),
                api.get(`/api/v1/analytics/shap/ward/${encodeURIComponent(hotspot.ward || hotspot.zone.split(',')[0].trim())}/${encodeURIComponent(hotspot.city || hotspot.zone.split(',')[1]?.trim() || 'Kochi')}`),
                api.get(`/api/v1/inspections/?zone=${encodeURIComponent(hotspot.ward || '')}&status=completed`)
            ]);

            // Timeline and SHAP fetches now rely on real backend logic
            if (timelineRes.status === 'fulfilled' && timelineRes.value.data.timeline?.length > 0) {
                setTimeline(timelineRes.value.data);
            } else {
                setTimeline({
                    timeline: [],
                    statistics: { high_risk_count: 0, avg_risk_score: 0, max_risk_score: 0 },
                    message: "No historical or predictive data available for this zone yet."
                });
            }

            if (verifiedEventsRes.status === 'fulfilled') {
                setVerifiedEvents(verifiedEventsRes.value.data || []);
            }
            if (shapRes.status === 'fulfilled' && shapRes.value.data.data?.data_available) {
                const rawShap = shapRes.value.data.data;

                const featureDisplayNames = {
                    'complaint_adj': 'Complaint Volume Adj',
                    'c_x_quarter': 'Seasonal Complaint Trend',
                    'log_complaint': 'Complaint Intensity',
                    'c_x_lat': 'Location Risk Factor',
                    'pop_x_c': 'Population Density Risk',
                    'complaint_per_1000': 'Complaint Rate per 1000',
                    'c_x_festival': 'Festival Risk Factor',
                };

                const processedFeatures = (rawShap.shap_features || []).map(feat => {
                    const featName = feat.feature.toLowerCase();
                    const mappedLabel = featureDisplayNames[featName] ?? feat.feature.toUpperCase();
                    return {
                        ...feat,
                        label: mappedLabel,
                        direction: feat.impact === 'positive' ? 'INCREASE' : 'DECREASE',
                        value: Math.abs(feat.shap_value || feat.impact === 'positive' ? feat.value : -feat.value || 0)
                    };
                });

                setShapData({ ...rawShap, shap_features: processedFeatures });
            } else {
                setShapData(null);
            }

        } catch (error) {
            console.error('Failed to fetch insight briefing:', error);
        } finally {
            setLoadingInsight(false);
        }
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        if (!assignmentData.officerId || !selectedHotspot) return;

        try {
            setIsAssigning(true);
            const officer = officers.find(o => o.id === assignmentData.officerId);

            const inspectionPayload = {
                zone: selectedHotspot.zone,
                location: selectedHotspot.zone,
                assigned_officer_id: assignmentData.officerId,
                assigned_officer_name: officer?.full_name || 'Officer',
                priority: assignmentData.priority.toLowerCase(),
                description: assignmentData.description || `Tactical inspection requested for ${selectedHotspot.top_issue} in ${selectedHotspot.zone}.`,
                scheduled_date: new Date().toISOString()
            };

            await api.post('/api/v1/inspections/', inspectionPayload);

            // Show success and close
            setIsAssignmentModalOpen(false);
            setAssignmentData({ officerId: '', priority: 'High', description: '' });
            alert(`Tactical Mission Assigned to ${officer?.full_name || 'Officer'}`);
        } catch (error) {
            console.error('Failed to assign inspection:', error.response?.data || error.message);
            const detail = error.response?.data?.detail;
            const errorMsg = typeof detail === 'string' ? detail :
                Array.isArray(detail) ? detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ') :
                    'Verify admin privileges or check field validation.';
            alert(`Failed to assign inspection: ${errorMsg}`);
        } finally {
            setIsAssigning(false);
        }
    };

    const getRiskColor = (level) => {
        const severity = (level || '').toUpperCase();
        if (severity === 'CRITICAL') return '#ef4444';
        if (severity === 'HIGH') return '#f59e0b';
        if (severity === 'MEDIUM') return '#fbbf24';
        return '#22c55e';
    };

    const formatTimelineData = () => {
        if (!timeline || !timeline.timeline || timeline.timeline.length === 0) return [];
        return timeline.timeline.map(item => ({
            date: item.date,
            risk_score: item.risk_score,
            alert: item.risk_score >= 70,
            is_historical: item.is_historical
        }));
    };

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="border-b border-[var(--border-subtle)] pb-6">
                <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                    <TrendingUp className="text-orange-500" size={28} />
                    Hotspot Insights & Analysis
                    {!loading && (
                        <span className="ml-2 px-3 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-xs font-black border border-orange-200 dark:border-orange-900/50">
                            {hotspots.length} zones
                        </span>
                    )}
                </h1>
                <p className="text-[var(--text-secondary)] text-sm mt-1 font-medium">
                    Identify zones with repeated high-risk patterns for preventive action
                </p>
            </div>

            {/* DSS Filter Panel */}
            <div className="glass-panel p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-alt)]/30">
                {/* Region Filter — admin only */}
                {userRole === 'admin' && (
                    <div className="mb-5 pb-5 border-b border-[var(--border-subtle)]">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2 flex items-center gap-2">
                            🧭 Geographic Region
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: '', label: '🌐 All Regions' },
                                { value: 'North', label: '🧭 North', sub: 'Delhi · Shimla · Jaipur' },
                                { value: 'South-West', label: '🧭 South-West', sub: 'Kerala districts' },
                                { value: 'South-East', label: '🧭 South-East', sub: 'Bengaluru · Chennai · Hyderabad' },
                                { value: 'West', label: '🧭 West', sub: 'Mumbai · Pune · Ahmedabad' },
                                { value: 'East', label: '🧭 East', sub: 'Kolkata' },
                            ].map(r => (
                                <button
                                    key={r.value}
                                    onClick={() => setFilters({ ...filters, region: r.value })}
                                    title={r.sub || ''}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${filters.region === r.value
                                        ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                                        : 'bg-[var(--surface-alt)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-orange-500/50 hover:text-orange-500'
                                        }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Issue Type Filter */}
                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Issue Category</label>
                        <select
                            value={filters.issue_type}
                            onChange={(e) => setFilters({ ...filters, issue_type: e.target.value })}
                            className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] focus:border-orange-500/50 rounded-lg px-3 py-2.5 text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                        >
                            <option value="">All Focus Categories</option>
                            <option value="Water Supply">Water Supply</option>
                            <option value="Sanitation">Sanitation</option>
                            <option value="Solid Waste">Solid Waste</option>
                            <option value="Traffic">Traffic</option>
                            <option value="Public Safety">Public Safety</option>
                            <option value="Crowd Management">Crowd Management</option>
                        </select>
                    </div>

                    {/* Risk Severity Filter */}
                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Risk Severity</label>
                        <select
                            value={filters.min_risk_level}
                            onChange={(e) => setFilters({ ...filters, min_risk_level: e.target.value, hotspot_level: e.target.value })}
                            className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] focus:border-orange-500/50 rounded-lg px-3 py-2.5 text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                        >
                            <option value="Medium">Medium, High & Critical</option>
                            <option value="High">High & Critical</option>
                            <option value="Critical">Critical Only</option>
                        </select>
                    </div>

                    {/* Occurrence Score Slider */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block">Min Recurrences</label>
                            <span className="text-orange-500 font-black text-xs">{filters.min_priority_score}+</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={filters.min_priority_score}
                            onChange={(e) => setFilters({ ...filters, min_priority_score: parseInt(e.target.value) })}
                            className="w-full accent-orange-500 h-1.5 bg-[var(--surface-alt)] rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1 font-black uppercase tracking-tighter">
                            <span>Rare</span>
                            <span>Highly Recurring</span>
                        </div>
                    </div>

                    {/* Cluster/Category Filter */}
                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Cluster Profile</label>
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                            className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] focus:border-orange-500/50 rounded-lg px-3 py-2.5 text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                        >
                            <option value="">All Risk Profiles</option>
                            <option value="Festival Crowd & Waste">Festival Crowd & Waste</option>
                            <option value="Public Event & Gathering">Public Event & Gathering</option>
                            <option value="Summer Water Service">Summer Water Service</option>
                            <option value="Tourist Season Sanitation">Tourist Season Sanitation</option>
                            <option value="Weekend Market Congestion">Weekend Market Congestion</option>
                        </select>
                    </div>

                    {/* Month Filter */}
                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Month History</label>
                        <select
                            value={filters.month}
                            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                            className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] focus:border-orange-500/50 rounded-lg px-3 py-2.5 text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                        >
                            <option value="">Full Year</option>
                            <option value="1">January</option>
                            <option value="2">February</option>
                            <option value="3">March</option>
                            <option value="4">April</option>
                            <option value="5">May</option>
                            <option value="6">June</option>
                            <option value="7">July</option>
                            <option value="8">August</option>
                            <option value="9">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                        </select>
                    </div>

                    {/* Fiscal Year Filter */}
                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Fiscal Year</label>
                        <select
                            value={filters.year}
                            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                            className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] focus:border-orange-500/50 rounded-lg px-3 py-2.5 text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                        >
                            <option value="">All Time (2016-2025)</option>
                            <option value="2016">2016</option>
                            <option value="2017">2017</option>
                            <option value="2018">2018</option>
                            <option value="2019">2019</option>
                            <option value="2020">2020</option>
                            <option value="2021">2021</option>
                            <option value="2022">2022</option>
                            <option value="2023">2023</option>
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Hotspots List */}
            {loading ? (
                <div className="text-center py-12 text-[var(--text-muted)] font-bold">
                    <BarChart3 className="mx-auto mb-3 animate-bounce text-orange-500" size={32} />
                    <p className="uppercase tracking-widest text-xs">Analyzing patterns...</p>
                </div>
            ) : hotspots.length === 0 ? (
                <div className="text-center py-12 border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-alt)]/20">
                    <AlertTriangle className="mx-auto mb-3 text-green-500" size={48} />
                    <p className="text-[var(--text-secondary)] font-medium">No recurring hotspots found with current filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {hotspots.map((hotspot, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-5 border-l-4 border-orange-500 cursor-pointer hover:bg-[var(--surface-alt)]/50 transition-all border border-[var(--border-subtle)] rounded-xl bg-[var(--surface)] shadow-sm group"
                            onClick={() => fetchInsightBriefing(hotspot)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-[var(--surface-alt)] border ${(hotspot.hotspot_level || '').toUpperCase() === 'CRITICAL' ? 'border-red-500/30' :
                                        (hotspot.hotspot_level || '').toUpperCase() === 'HIGH' ? 'border-amber-500/30' : 'border-blue-500/30'
                                        }`}>
                                        <MapPin className={
                                            (hotspot.hotspot_level || '').toUpperCase() === 'CRITICAL' ? 'text-red-500' :
                                                (hotspot.hotspot_level || '').toUpperCase() === 'HIGH' ? 'text-amber-500' : 'text-blue-500'
                                        } size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-[var(--text-primary)]">{hotspot.zone}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-sm border border-blue-200 dark:border-blue-900/50 font-black uppercase tracking-tighter">
                                                {hotspot.top_issue}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.5 bg-[var(--surface-alt)] text-[var(--text-muted)] rounded-sm border border-[var(--border-subtle)] font-bold uppercase tracking-tighter">
                                                {hotspot.top_season}
                                            </span>
                                            {hotspot.real_incident && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-sm border border-purple-200 dark:border-purple-900/50 font-black uppercase tracking-tighter flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {hotspot.real_incident.split(/[-,(]/)[0].trim().substring(0, 25)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-black border tracking-widest uppercase ${(hotspot.hotspot_level || '').toUpperCase() === 'CRITICAL' ? 'badge-critical' :
                                        (hotspot.hotspot_level || '').toUpperCase() === 'HIGH' ? 'badge-high' : 'badge-medium'
                                        }`}>
                                        {hotspot.hotspot_level}
                                    </span>
                                    <p className="text-[9px] text-[var(--text-muted)] mt-1 font-black uppercase tracking-widest">Risk Level</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest">Priority Score</p>
                                    <p className="text-orange-600 dark:text-orange-400 font-black text-lg">{typeof hotspot.avg_risk_score === 'number' ? hotspot.avg_risk_score.toFixed(2) : hotspot.avg_risk_score}<span className="text-xs opacity-50 font-medium">/100</span></p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest">Last Occurrence</p>
                                    <p className="text-[var(--text-primary)] font-bold">
                                        {hotspot.last_occurrence ? new Date(hotspot.last_occurrence).toLocaleDateString() : 'Historical'}
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 flex items-center gap-1 font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                <Activity size={12} />
                                View Insight Briefing
                            </p>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Insight Briefing Modal */}
            {selectedHotspot && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 lg:p-4"
                    onClick={() => setSelectedHotspot(null)}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="rounded-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface)] shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-4 lg:p-6 border-b border-[var(--border-subtle)] bg-[var(--surface-alt)]/30 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl shadow-lg text-white ${(selectedHotspot.hotspot_level || '').toUpperCase() === 'CRITICAL' ? 'bg-red-500 shadow-red-500/20' :
                                    (selectedHotspot.hotspot_level || '').toUpperCase() === 'HIGH' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-blue-500 shadow-blue-500/20'
                                    }`}>
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h1 className="text-xl lg:text-2xl font-black text-[var(--text-primary)] leading-none">
                                        Risk Assessment: {selectedHotspot.zone}
                                    </h1>
                                    <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                        <Activity size={12} /> Regional Data Briefing • {selectedHotspot.top_issue}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedHotspot(null)}
                                className="p-2.5 rounded-xl hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
                            >
                                ✕
                            </button>
                        </div>

                        {loadingInsight ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-20 text-[var(--text-muted)]">
                                <Brain className="animate-pulse mb-4 text-purple-500" size={48} />
                                <p className="font-black uppercase tracking-widest text-sm">Synthesizing AI Insights...</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    {/* Column 1: AI Drivers & Analysis */}
                                    <div className="space-y-6">

                                        {/* Current Situation: Field Truth & Verification */}
                                        <div className="bg-[var(--surface-alt)]/50 rounded-2xl border border-[var(--border-subtle)] p-5 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <ShieldCheck size={48} className="text-green-500" />
                                            </div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className={`w-2 h-2 rounded-full ${verifiedEvents.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
                                                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
                                                    {verifiedEvents.length > 0 ? 'Live Field Truth' : 'Historical Intelligence'}
                                                </h3>
                                            </div>

                                            <p className="text-base font-bold text-[var(--text-primary)] leading-relaxed relative z-10">
                                                {verifiedEvents.length > 0
                                                    ? verifiedEvents[0].findings
                                                    : selectedHotspot.real_incident || "No verified field reports or historical records found for this specific cluster yet."
                                                }
                                            </p>

                                            {verifiedEvents.length > 0 && selectedHotspot.real_incident && (
                                                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2">
                                                    <Calendar size={12} className="text-[var(--text-muted)]" />
                                                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic opacity-70">
                                                        Related Goal: {selectedHotspot.real_incident}
                                                    </p>
                                                </div>
                                            )}

                                            {verifiedEvents.length > 0 && (
                                                <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">
                                                    <span className="flex items-center gap-1">
                                                        <User size={12} /> Unit {verifiedEvents[0].assigned_officer_name}
                                                    </span>
                                                    <span>
                                                        {new Date(verifiedEvents[0].completed_at || verifiedEvents[0].updated_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Brain className="text-purple-500" size={20} />
                                                <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">AI Risk Drivers</h3>
                                            </div>
                                            {shapData?.is_fallback && (
                                                <span className="text-[8px] px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-sm border border-purple-200 dark:border-purple-900/50 font-black uppercase tracking-widest">
                                                    Global Profile
                                                </span>
                                            )}
                                        </div>

                                        {shapData ? (
                                            <div className="space-y-3">
                                                {shapData.shap_features?.slice(0, 5).map((feat, idx) => (
                                                    <div key={idx} className="bg-[var(--surface-alt)]/50 p-4 rounded-xl border border-[var(--border-subtle)] transition-all hover:border-purple-500/30 group">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <TrendingUp className={feat.direction === 'INCREASE' ? 'text-red-500' : 'text-green-500'} size={14} />
                                                                <span className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-tight">
                                                                    {feat.label}
                                                                </span>
                                                            </div>
                                                            <span className={`text-[9px] font-black ${feat.direction === 'INCREASE' ? 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20' : 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20'} px-2 py-0.5 rounded-full border`}>
                                                                {feat.direction === 'INCREASE' ? '↑ INCREASE' : '↓ DECREASE'}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-[var(--surface-alt)] h-1.5 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(100, (feat.value || Math.abs(feat.shap_value || 0)) * 100)}%` }}
                                                                className={`h-full ${feat.direction === 'INCREASE' ? 'bg-red-500' : 'bg-green-500'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center bg-[var(--surface-alt)]/30 rounded-2xl border border-dashed border-[var(--border-subtle)]">
                                                <Activity size={32} className="mx-auto text-blue-500 mb-3 opacity-30" />
                                                <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest leading-relaxed">
                                                    Historical profile analyzing...<br />
                                                    Ward context syncing.
                                                </p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/20">
                                                <p className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Peak Season</p>
                                                <p className="text-lg font-black text-[var(--text-primary)] leading-tight">{selectedHotspot.top_season}</p>
                                            </div>
                                            <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                                                <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Next Peak</p>
                                                <p className="text-lg font-black text-[var(--text-primary)] leading-tight">{selectedHotspot.next_peak}</p>
                                            </div>
                                        </div>

                                        {/* Verified Operations History */}
                                        {verifiedEvents.length > 0 && (
                                            <div className="mt-8 space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle size={14} className="text-green-500" />
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
                                                        Verified Operations History
                                                    </h3>
                                                </div>
                                                <div className="space-y-3">
                                                    {verifiedEvents.slice(0, 3).map((event, idx) => (
                                                        <div key={idx} className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 flex gap-4">
                                                            <div className="mt-1">
                                                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Mission Complete</h4>
                                                                    <span className="text-[10px] font-black text-[var(--text-muted)]">
                                                                        {new Date(event.completed_at || event.updated_at).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                                                    <span className="font-bold text-green-500/80">Officer {event.assigned_officer_name || 'Field Unit'}: </span>
                                                                    {event.findings || "Inspection completed with no critical findings reported."}
                                                                </p>
                                                                {event.actions_taken && (
                                                                    <p className="text-[10px] mt-2 text-[var(--text-muted)] italic font-medium">
                                                                        Action: {event.actions_taken}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Column 2: Local Map View */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapIcon className="text-orange-500" size={20} />
                                            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Ward Location View</h3>
                                        </div>

                                        <div className="h-[300px] lg:h-[400px] w-full rounded-2xl border border-[var(--border-subtle)] overflow-hidden relative shadow-inner">
                                            {selectedHotspot.latitude && selectedHotspot.longitude ? (
                                                <MapContainer
                                                    center={[selectedHotspot.latitude, selectedHotspot.longitude]}
                                                    zoom={13}
                                                    scrollWheelZoom={false}
                                                    style={{ height: '100%', width: '100%' }}
                                                >
                                                    <TileLayer
                                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                                    />
                                                    <ChangeMapCenter center={[selectedHotspot.latitude, selectedHotspot.longitude]} />
                                                    <Circle
                                                        center={[selectedHotspot.latitude, selectedHotspot.longitude]}
                                                        pathOptions={{
                                                            color: getRiskColor(selectedHotspot.hotspot_level),
                                                            fillColor: getRiskColor(selectedHotspot.hotspot_level),
                                                            fillOpacity: 0.3,
                                                            weight: 2
                                                        }}
                                                        radius={500}
                                                    />
                                                    <Marker
                                                        position={[selectedHotspot.latitude, selectedHotspot.longitude]}
                                                        icon={getMarkerIcon(getRiskColor(selectedHotspot.hotspot_level))}
                                                    />
                                                </MapContainer>
                                            ) : (
                                                <div className="h-full w-full bg-[var(--surface-alt)] flex flex-col items-center justify-center text-[var(--text-muted)]">
                                                    <Navigation size={48} className="mb-2 opacity-20" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">Coordinates Unavailable</p>
                                                </div>
                                            )}

                                            <div className="absolute bottom-4 left-4 z-[1000]">
                                                <div className="bg-[var(--surface)]/90 backdrop-blur-md px-3 py-2 rounded-lg border border-[var(--border-subtle)] shadow-lg flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full animate-pulse bg-orange-500" />
                                                    <span className="text-[9px] font-black text-[var(--text-primary)] uppercase tracking-widest">● Ward Location View</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 3: Trend Chart & Stats */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <BarChart3 className="text-blue-500" size={20} />
                                            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">30-Day Risk Trend</h3>
                                        </div>

                                        <div className="bg-[var(--surface-alt)]/30 p-4 lg:p-6 rounded-2xl border border-[var(--border-subtle)] relative overflow-hidden h-[300px] lg:h-[400px] flex flex-col">
                                            <div className="flex-1 min-h-0">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={formatTimelineData()}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} opacity={0.3} />
                                                        <XAxis
                                                            dataKey="date"
                                                            stroke="var(--text-muted)"
                                                            style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}
                                                            tickMargin={10}
                                                            axisLine={false}
                                                            tickLine={false}
                                                        />
                                                        <YAxis
                                                            stroke="var(--text-muted)"
                                                            style={{ fontSize: '9px', fontWeight: '900' }}
                                                            tickMargin={10}
                                                            axisLine={false}
                                                            tickLine={false}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: 'var(--surface)',
                                                                border: '1px solid var(--border-subtle)',
                                                                borderRadius: '12px',
                                                                padding: '10px',
                                                                boxShadow: 'var(--card-shadow)'
                                                            }}
                                                            labelStyle={{ color: 'var(--text-primary)', fontWeight: '900', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px' }}
                                                            itemStyle={{ fontWeight: '700', fontSize: '11px' }}
                                                        />

                                                        {/* Dynamic Annotation for lowest point */}
                                                        {(() => {
                                                            const data = formatTimelineData();
                                                            if (data.length === 0) return null;
                                                            const minPoint = data.reduce((min, p) => p.risk_score < min.risk_score ? p : min, data[0]);
                                                            return (
                                                                <ReferenceLine
                                                                    x={minPoint.date}
                                                                    stroke="#6b7280"
                                                                    strokeDasharray="4 4"
                                                                    label={{
                                                                        value: 'Low Activity',
                                                                        fill: '#6b7280',
                                                                        fontSize: 11,
                                                                        position: 'top',
                                                                        fontWeight: 900
                                                                    }}
                                                                />
                                                            );
                                                        })()}

                                                        <Line
                                                            type="monotone"
                                                            dataKey="risk_score"
                                                            stroke="#60a5fa"
                                                            strokeWidth={2}
                                                            dot={{ r: 3 }}
                                                            activeDot={{ r: 5 }}
                                                            name="Risk Score"
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* Quick Stats Mini-Grid */}
                                            <div className="grid grid-cols-3 gap-2 mt-4">
                                                <div className="bg-[var(--surface)]/50 p-3 rounded-xl border border-[var(--border-subtle)] text-center relative overflow-hidden">
                                                    {timeline?.data_source === 'historical_training_data' && (
                                                        <div className="absolute top-0 right-0 bg-blue-500 text-[6px] text-white px-1 font-black uppercase">Hist</div>
                                                    )}
                                                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Alerts</p>
                                                    <p className="text-sm font-black text-[var(--text-primary)]">{timeline?.statistics.high_risk_count || 0}</p>
                                                </div>
                                                <div className="bg-[var(--surface)]/50 p-3 rounded-xl border border-[var(--border-subtle)] text-center">
                                                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Avg Score</p>
                                                    <p className="text-sm font-black text-[var(--text-primary)]">{timeline?.statistics.avg_risk_score || 0}</p>
                                                </div>
                                                <div className="bg-[var(--surface)]/50 p-3 rounded-xl border border-[var(--border-subtle)] text-center">
                                                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Max Risk</p>
                                                    <p className="text-sm font-black text-red-500">{timeline?.statistics.max_risk_score || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Modal Footer / Actions */}
                        <div className="p-4 lg:p-6 bg-[var(--surface-alt)]/50 border-t border-[var(--border-subtle)] flex flex-wrap gap-4 items-center justify-between">
                            <div className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest flex items-center gap-2">
                                <Info size={14} className="text-blue-500" />
                                DSS ADVISORY: AI analysis suggests proactive field inspection. Final decision rests with the officer.
                            </div>
                            <div className="flex gap-3">
                                {userRole === 'officer' && (
                                    <button
                                        onClick={() => navigate('/tasks')}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-[var(--surface-alt)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl font-black text-[11px] uppercase tracking-widest hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                                    >
                                        <Edit3 size={15} /> Draft Field Report
                                    </button>
                                )}
                                {userRole === 'admin' && (
                                    <button
                                        onClick={() => {
                                            setAssignmentData({
                                                ...assignmentData,
                                                priority: selectedHotspot.hotspot_level || 'High',
                                                description: `Verify ${selectedHotspot.top_issue} levels in ${selectedHotspot.zone}. AI predicts ${selectedHotspot.hotspot_level} risk.`
                                            });
                                            setIsAssignmentModalOpen(true);
                                        }}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
                                    >
                                        <CheckSquare size={15} /> Mark for Inspection
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Tactical Assignment Modal */}
            {isAssignmentModalOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/70 backdrop-blur-xl z-[60] flex items-center justify-center p-4"
                    onClick={() => setIsAssignmentModalOpen(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 30 }}
                        animate={{ scale: 1, y: 0 }}
                        className="rounded-2xl max-w-lg w-full overflow-hidden border border-orange-500/30 bg-[var(--surface)] shadow-[0_25px_60px_rgba(0,0,0,0.3)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-[var(--border-subtle)] bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-500 rounded-xl text-white shadow-lg shadow-orange-500/30">
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight uppercase">Tactical Assignment</h2>
                                    <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">
                                        Deploying Field Resources • {selectedHotspot?.zone}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleAssignSubmit} className="p-6 space-y-5">
                            {/* Field Officer Selector */}
                            <div>
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Assign Field Officer</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                    <select
                                        required
                                        value={assignmentData.officerId}
                                        onChange={(e) => setAssignmentData({ ...assignmentData, officerId: e.target.value })}
                                        className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl pl-10 pr-4 py-3 text-[var(--text-primary)] font-bold text-sm outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/10 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Available Officer</option>
                                        {officers.map(officer => (
                                            <option key={officer.id} value={officer.id}>
                                                {officer.full_name} ({officer.username})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Priority Selector */}
                            <div>
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Mission Priority</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Medium', 'High', 'Critical'].map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setAssignmentData({ ...assignmentData, priority: p })}
                                            className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${assignmentData.priority === p
                                                ? 'bg-orange-500 border-orange-400 text-white shadow-md shadow-orange-500/20'
                                                : 'bg-[var(--surface-alt)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-orange-500/40 hover:text-[var(--text-primary)]'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Instructions Textarea */}
                            <div>
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Tactical Instructions</label>
                                <textarea
                                    value={assignmentData.description}
                                    onChange={(e) => setAssignmentData({ ...assignmentData, description: e.target.value })}
                                    placeholder="Provide specific details for the field unit..."
                                    className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium text-sm outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/10 transition-all min-h-[100px] resize-none"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAssignmentModalOpen(false)}
                                    className="flex-1 py-3.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] font-black text-[11px] uppercase tracking-widest hover:bg-[var(--surface-alt)] hover:text-[var(--text-primary)] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAssigning || !assignmentData.officerId}
                                    className="flex-[2] bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                                >
                                    {isAssigning ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Send size={15} /> Deploy Officer
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default RecurringHotspots;
