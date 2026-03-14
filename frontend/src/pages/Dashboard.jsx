import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Activity, Users, AlertTriangle, MapPin, TrendingUp, Filter,
    Brain, Server, CheckCircle, Clock, Target, Database, Wifi, WifiOff, Flame
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import MapComponent from '../components/MapComponent';
import ShapExplanation from '../components/ShapExplanation';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const StatCard = ({ title, value, subtext, icon: Icon, color, trend }) => (
    <motion.div
        whileHover={{ y: -4 }}
        className="glass-card p-5 border border-[var(--border-subtle)] bg-[var(--surface)] transition-all group"
    >
        <div className="flex justify-between items-start mb-2">
            <div className={`p-2 rounded-lg bg-[var(--surface-alt)] text-[var(--text-secondary)] group-hover:bg-[var(--primary-rgb)]/10 group-hover:text-[var(--primary)] transition-colors border border-[var(--border-subtle)]`}>
                <Icon size={20} />
            </div>
            {trend && (
                <span className={`text-xs font-semibold flex items-center gap-1 ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {trend.startsWith('+') ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
                    {trend}
                </span>
            )}
        </div>
        <h3 className="text-2xl font-bold mt-2 text-[var(--text-primary)]">{value}</h3>
        <p className="text-[var(--text-secondary)] text-sm font-medium">{title}</p>
        {subtext && <p className="text-xs text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border-subtle)]">{subtext}</p>}
    </motion.div>
);

const RiskRow = ({ id, location, type, score, status, category }) => {
    const s = (status || '').toUpperCase();

    const getBgColor = () => {
        if (s === 'CRITICAL') return 'bg-red-100/50 dark:bg-red-900/10';
        if (s === 'HIGH') return 'bg-orange-100/50 dark:bg-orange-900/10';
        if (s === 'MEDIUM') return 'bg-yellow-100/50 dark:bg-yellow-900/10';
        return '';
    };

    return (
        <tr className={`border-b border-[var(--border-subtle)] hover:bg-[var(--surface-alt)]/50 transition-colors text-sm ${getBgColor()}`}>
            <td className="py-3 px-4 text-[var(--text-muted)] font-medium">#{id}</td>
            <td className="py-3 px-4 font-bold text-[var(--text-primary)]">{location}</td>
            <td className="py-3 px-4 text-[var(--text-secondary)]">{category || type}</td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-secondary)]">{typeof score === 'number' ? score.toFixed(2) : score}</span>
                    <div className="w-12 h-1 bg-[var(--surface-alt)] rounded-full overflow-hidden">
                        <div
                            className={`h-full ${s === 'CRITICAL' ? 'bg-red-500' : s === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'}`}
                            style={{ width: `${Math.min(100, (score / 100) * 100)}%` }}
                        ></div>
                    </div>
                </div>
            </td>
            <td className="py-3 px-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-widest ${s === 'CRITICAL' ? 'badge-critical' :
                    s === 'HIGH' ? 'badge-high' :
                        'badge-medium'
                    }`}>
                    {status}
                </span>
            </td>
        </tr>
    );
};

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const navigate = useNavigate();
    const [hotspots, setHotspots] = useState([]);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, performance, health, explainability
    const role = localStorage.getItem('role');
    const jurisdiction = localStorage.getItem('jurisdiction');

    const fetchDashboardData = async () => {
        try {
            const role = localStorage.getItem('role');
            const jurisdiction = localStorage.getItem('jurisdiction');
            const isOfficer = role === 'officer' && jurisdiction;
            const zoneParam = isOfficer ? `?zone=${encodeURIComponent(jurisdiction)}` : '';

            const [statsRes, hotspotsRes, weeklyTrendRes, modelPerfRes, configRes] = await Promise.allSettled([
                api.get(`/api/v1/analytics/dashboard/stats${zoneParam}`),
                api.get(`/api/v1/analytics/hotspots/recurring${isOfficer ? zoneParam + '&limit=500' : '?limit=500'}`),
                api.get(`/api/v1/analytics/weekly-trend${zoneParam}`),
                api.get('/api/v1/analytics/model-performance'),
                api.get('/api/v1/config')
            ]);

            if (configRes.status === 'fulfilled') setConfig(configRes.value.data);

            const stats = statsRes.status === 'fulfilled' ? statsRes.value.data : {};
            const hotspotsData = hotspotsRes.status === 'fulfilled' ? hotspotsRes.value.data : {};
            const modelPerf = modelPerfRes.status === 'fulfilled' ? modelPerfRes.value.data : {};

            // Normalize weekly trend
            let weeklyTrend = [];
            if (weeklyTrendRes.status === 'fulfilled') {
                const raw = weeklyTrendRes.value.data;
                weeklyTrend = Array.isArray(raw) ? raw : (raw?.data || []);
            }

            const xgb = modelPerf?.xgboost || {};
            const arima = modelPerf?.arima || {};
            const dbscan = modelPerf?.dbscan || {};

            const modelAccuracy = xgb.accuracy
                ? (xgb.accuracy * 100).toFixed(1)
                : '0.0';

            let modelTrend = '+0.0%';
            const history = xgb.history || [];
            if (history.length >= 2) {
                const current = history[history.length - 1].accuracy;
                const previous = history[history.length - 2].accuracy;
                const diff = ((current - previous) * 100).toFixed(1);
                modelTrend = diff >= 0 ? `+ ${diff}% ` : `${diff}% `;
            }

            const dataSources = modelPerf?.overall?.models
                ? modelPerf.overall.models.map(m => ({
                    name: m.name.toUpperCase(),
                    status: (m.status === 'ready' || m.status === 'active') ? 'active' : 'inactive',
                    lastSync: 'Real-time'
                }))
                : [
                    { name: 'XGBOOST', status: (xgb.model_loaded || xgb.loaded) ? 'active' : 'inactive', lastSync: 'Real-time' },
                    { name: 'ARIMA', status: (arima.model_loaded || arima.loaded) ? 'active' : 'inactive', lastSync: 'Real-time' },
                    { name: 'DBSCAN', status: (dbscan.model_loaded || dbscan.loaded) ? 'active' : 'inactive', lastSync: 'Real-time' }
                ];

            setDashboardData({
                stats,
                hotspots: hotspotsData.hotspots || [],
                weeklyTrend,
                modelPerf,
                modelAccuracy,
                modelTrend,
                activeOfficers: stats.active_officers || 0,
                onlineOfficers: stats.online_officers || 0,
                monitoredZones: stats.monitored_zones || 0,
                totalWards: stats.monitored_zones || 0,
                systemUptime: stats.system_uptime || 99.9,
                uptimePeriod: 'Last 30 days',
                dataSources,
                systemAlerts: stats.alerts || []
            });

            setHotspots(hotspotsData.hotspots || []);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setDashboardData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleViewAll = () => {
        navigate('/hotspots');
    };

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 60000); // Reduce frequency to 60s
        return () => clearInterval(interval);
    }, []);

    // Memoize the normalized data to prevent layout jumps and heavy recalc on every minor state change
    const normalizedData = (dashboardData || {});

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Synchronizing Intelligence...</div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <div className="text-slate-400 font-bold">Intelligence Feed Offline</div>
                <button
                    onClick={fetchDashboardData}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                >
                    Reconnect System
                </button>
            </div>
        );
    }

    const {
        modelAccuracy, modelTrend, activeOfficers, onlineOfficers,
        monitoredZones, totalWards, systemUptime, uptimePeriod, weeklyTrend,
        dataSources, systemAlerts
    } = normalizedData;

    const isAdmin = role === 'admin';

    return (
        <motion.div
            className="space-y-6 max-w-[1600px] mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[var(--border-subtle)] pb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                        {isAdmin ? 'System Administration' : (
                            <div className="flex flex-col">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                                    Welcome Back, Officer
                                </span>
                                {jurisdiction && (
                                    <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 w-fit mt-1 uppercase tracking-wider">
                                        Jurisdiction: {jurisdiction}
                                    </span>
                                )}
                            </div>
                        )}
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                        {isAdmin
                            ? `Monitoring ${monitoredZones} zones across ${totalWards} wards`
                            : 'Real-time situational awareness and predictive analytics'
                        }
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-[var(--text-muted)] self-center hidden md:block">Last updated: Just now</span>
                    <ThemeToggle />
                </div>
            </div>

            {/* System-Level KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Model Accuracy"
                    value={`${dashboardData.modelAccuracy}% `}
                    subtext={`${dashboardData.modelTrend} vs last period`}
                    icon={Brain}
                    color="purple"
                    trend={dashboardData.modelTrend}
                />
                <StatCard
                    title="Active Officers"
                    value={activeOfficers}
                    subtext={`${onlineOfficers} online now`}
                    icon={Users}
                    color="blue"
                />
                <StatCard
                    title="Monitored Zones"
                    value={monitoredZones}
                    subtext={`Across ${totalWards} wards`}
                    icon={MapPin}
                    color="green"
                />
                <StatCard
                    title="System Uptime"
                    value={`${systemUptime}% `}
                    subtext={uptimePeriod}
                    icon={Server}
                    color="green"
                />
            </div>

            {/* Main Content Split */}
            {/* Dashboard Content - Vertical Stack */}
            <div className="space-y-6">
                {/* Top Section: Multi-Tab Analytics */}
                <div className="glass-panel rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface)]/50">
                    <div className="flex bg-[var(--surface-alt)]/50 border-b border-[var(--border-subtle)] p-1 gap-1">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex-1 px-6 py-3 text-sm font-bold transition-all rounded-lg flex items-center justify-center gap-2.5 ${activeTab === 'overview'
                                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)]'
                                }`}
                        >
                            <MapPin size={18} className={activeTab === 'overview' ? 'text-[var(--primary)]' : ''} />
                            <span>System Overview</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('performance')}
                            className={`flex-1 px-6 py-3 text-sm font-bold transition-all rounded-lg flex items-center justify-center gap-2.5 ${activeTab === 'performance'
                                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)]'
                                }`}
                        >
                            <Target size={18} className={activeTab === 'performance' ? 'text-[var(--primary)]' : ''} />
                            <span>Model Performance</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('health')}
                            className={`flex-1 px-6 py-3 text-sm font-bold transition-all rounded-lg flex items-center justify-center gap-2.5 ${activeTab === 'health'
                                ? 'bg-[var(--surface)] text-[var(--primary)] border border-[var(--border-subtle)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)]'
                                }`}
                        >
                            <Database size={18} className={activeTab === 'health' ? 'text-[var(--primary)]' : ''} />
                            <span>Data Health</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('explainability')}
                            className={`flex-1 px-6 py-3 text-sm font-bold transition-all rounded-lg flex items-center justify-center gap-2.5 ${activeTab === 'explainability'
                                ? 'bg-[var(--surface)] text-[var(--primary)] border border-[var(--border-subtle)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)]'
                                }`}
                        >
                            <Brain size={18} className={activeTab === 'explainability' ? 'text-[var(--primary)]' : ''} />
                            <span>Explainability</span>
                        </button>
                    </div>

                    <div className="p-0">
                        {activeTab === 'overview' && (
                            <div className="flex flex-col lg:flex-row h-[70vh] w-full bg-[var(--surface-alt)] overflow-hidden">
                                <div className="flex-1 relative">
                                    <MapComponent />
                                </div>
                            </div>
                        )}

                        {activeTab === 'performance' && (
                            <div className="p-8 space-y-6">
                                <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                                    <TrendingUp className="text-purple-500" />
                                    Accuracy Trends Over Time
                                </h3>
                                <div className="h-[500px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={(dashboardData.modelPerf.xgboost.history && dashboardData.modelPerf.xgboost.history.length > 0) ? dashboardData.modelPerf.xgboost.history : dashboardData.weeklyTrend}>
                                            <defs>
                                                <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                                            <XAxis
                                                dataKey={(dashboardData.modelPerf.xgboost.history && dashboardData.modelPerf.xgboost.history.length > 0) ? "date" : "name"}
                                                stroke="var(--text-muted)"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(dashboardData.modelPerf.xgboost.history && dashboardData.modelPerf.xgboost.history.length > 0) ? (date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : undefined}
                                            />
                                            <YAxis domain={['auto', 'auto']} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'var(--surface)',
                                                    borderColor: 'var(--border-subtle)',
                                                    color: 'var(--text-primary)',
                                                    borderRadius: '8px',
                                                    boxShadow: 'var(--card-shadow)',
                                                    border: '1px solid var(--border-subtle)'
                                                }}
                                                itemStyle={{ color: 'var(--text-primary)' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="accuracy"
                                                stroke="#a78bfa"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorAccuracy)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {activeTab === 'health' && (
                            <div className="p-8 space-y-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Database className="text-blue-500" />
                                    Data Source Status
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {dashboardData.dataSources && dashboardData.dataSources.map((source, index) => (
                                        <div key={index} className="flex flex-col p-5 bg-[var(--surface-alt)]/50 rounded-xl border border-[var(--border-subtle)] transition hover:shadow-md">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className={`p-2 rounded-lg ${source.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                    {source.status === 'active' ? <Wifi size={20} /> : <WifiOff size={20} />}
                                                </div>
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${source.status === 'active'
                                                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                                                    : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                                                    }`}>
                                                    {source.status === 'active' ? 'Operational' : 'Delayed'}
                                                </span>
                                            </div>
                                            <div className="font-black text-[var(--text-primary)] mb-1">{source.name}</div>
                                            <div className="text-xs text-[var(--text-muted)] font-medium flex items-center gap-1">
                                                <Clock size={12} /> Last sync: {source.lastSync}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'explainability' && (
                            <div className="p-8">
                                <ShapExplanation />
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Section: Priority Hotspots Table (Full Width) */}
                <div className="glass-panel rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface)]">
                    <div className="p-5 bg-[var(--surface-alt)]/30 border-b border-[var(--border-subtle)] flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500 rounded-lg text-white shadow-lg shadow-red-500/20">
                                <Flame size={20} />
                            </div>
                            <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-tight">Priority Hotspots</h3>
                        </div>
                        <button
                            onClick={handleViewAll}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-blue-600/20"
                        >
                            View All →
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--surface-alt)]/50 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-subtle)]">
                                    <th className="py-4 px-4"># Rank</th>
                                    <th className="py-4 px-4">Zone (Ward + City)</th>
                                    <th className="py-2 px-4">Category</th>
                                    <th className="py-4 px-4">Priority Score</th>
                                    <th className="py-4 px-4">Risk Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hotspots.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center">
                                            <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                                                <Database size={40} className="opacity-20 mb-2" />
                                                <p className="font-medium text-sm">No critical patterns detected</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    hotspots.slice(0, 10).map((hotspot, index) => (
                                        <RiskRow
                                            key={hotspot.zone || index}
                                            id={index + 1}
                                            location={hotspot.zone}
                                            category={hotspot.category}
                                            type={hotspot.category || hotspot.issue_type || 'General'}
                                            score={hotspot.avg_risk_score}
                                            status={hotspot.hotspot_level || (
                                                config ? (
                                                    hotspot.avg_risk_score >= config.risk_thresholds.high_min ? 'CRITICAL' :
                                                        hotspot.avg_risk_score >= config.risk_thresholds.low_max ? 'HIGH' : 'MEDIUM'
                                                ) : 'MEDIUM'
                                            )}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </motion.div >
    );
};

export default Dashboard;
