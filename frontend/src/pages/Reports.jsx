import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, CheckCircle, AlertTriangle, Download,
    TrendingUp, Shield, BarChart3, Database, Users,
    RefreshCcw, Search, ChevronRight, Archive, ArrowRight,
    MapPin, Globe, Filter
} from 'lucide-react';
import api from '../services/api';

const ReportTypeLabels = {
    daily_summary: 'Day Risk Summary',
    weekly_summary: 'Week Strategic Overview',
    monthly_summary: 'Month Strategic Report',
    zone_analysis: 'Regional Analysis',
    custom: 'Custom Analysis'
};

const REGIONS = ["All", "North", "South-West", "South-East", "West", "East"];

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [filters, setFilters] = useState({
        title: '',
        type: 'weekly_summary',
        days: 7,
        region: 'All'
    });
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            // unique_only=true is default on backend now
            const response = await api.get('/api/v1/reports');
            setReports(response.data);
            if (response.data.length > 0 && !selectedReport) {
                fetchFullReport(response.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFullReport = async (id) => {
        try {
            const response = await api.get(`/api/v1/reports/${id}`);
            setSelectedReport(response.data);
        } catch (error) {
            console.error('Failed to fetch full report:', error);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setGenerating(true);
        try {
            const payload = {
                title: filters.title || `${ReportTypeLabels[filters.type]} (${filters.region}) - ${new Date().toLocaleDateString()}`,
                report_type: filters.type,
                format: 'json',
                days: parseInt(filters.days),
                region: filters.region !== 'All' ? filters.region : undefined
            };
            await api.post('/api/v1/reports/generate', null, { params: payload });
            setSuccessMsg('Analysis Initialized');
            setTimeout(() => {
                fetchReports();
                setSuccessMsg('Intelligence Ready');
                setTimeout(() => setSuccessMsg(''), 3000);
            }, 2000);
        } catch (error) {
            console.error('Failed to generate report:', error);
        } finally {
            setGenerating(false);
        }
    };

    const handleExport = async (id, format = 'csv') => {
        try {
            const response = await api.get(`/api/v1/reports/${id}/export?format=${format}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report_${id}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setSuccessMsg(`Exported ${format.toUpperCase()}`);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const handleRawExport = async (entity) => {
        try {
            const response = await api.get(`/api/v1/reports/export/${entity}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `${entity}_export_${timestamp}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setSuccessMsg(`Archived ${entity}`);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error('Raw export failed:', error);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-6 font-sans antialiased text-[var(--text-primary)]">

            {/* Header: Professional & Concise */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-6 border-b border-[var(--border-subtle)] mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-1 text-[var(--text-primary)]">Reports Hub</h1>
                    <p className="text-[var(--text-secondary)] font-medium text-base">Strategic analysis and regional data archives.</p>
                </div>
                <AnimatePresence>
                    {successMsg && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-3 shadow-lg"
                        >
                            <RefreshCcw size={16} /> {successMsg}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* Section 1: Data Archives & Generator */}
                <div className="lg:col-span-4 space-y-12">
                    <section>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4 flex items-center gap-2 px-1">
                            <Database size={12} className="text-[var(--primary)]" /> Ground Data Archives
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
                            {[
                                { id: 'users', label: 'User Index', icon: Users, color: 'text-blue-500' },
                                { id: 'tasks', label: 'Task Logs', icon: CheckCircle, color: 'text-emerald-500' },
                                { id: 'inspections', label: 'Field Inspections', icon: Shield, color: 'text-purple-500' },
                                { id: 'alerts', label: 'Alert History', icon: AlertTriangle, color: 'text-orange-500' }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleRawExport(item.id)}
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-md transition-all group overflow-hidden relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--primary)]/5 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className={`p-2.5 rounded-lg bg-[var(--surface-alt)] border border-[var(--border-subtle)] ${item.color} group-hover:bg-[var(--primary)] group-hover:text-white group-hover:border-[var(--primary)] transition-all`}>
                                            <item.icon size={16} />
                                        </div>
                                        <span className="font-bold text-xs tracking-tight text-[var(--text-primary)]">{item.label}</span>
                                    </div>
                                    <Download size={14} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] relative z-10" />
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="p-6 rounded-2xl bg-[var(--surface-alt)]/20 border border-[var(--border-subtle)] backdrop-blur-sm">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-5 flex items-center gap-2 px-1">
                            <TrendingUp size={12} className="text-[var(--primary)]" /> Intelligence Generator
                        </h2>
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block ml-1">Analysis Period</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[7, 30].map(d => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setFilters({ ...filters, days: d })}
                                            className={`py-2.5 rounded-lg text-[10px] font-black transition-all border ${filters.days === d
                                                ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                                                : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--primary)]'}`}
                                        >
                                            {d} Days
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block ml-1">Target Region</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={12} />
                                        <select
                                            value={filters.region}
                                            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                                            className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg pl-9 pr-4 py-2.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] transition-all cursor-pointer appearance-none"
                                        >
                                            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block ml-1">Analysis Pattern</label>
                                    <select
                                        value={filters.type}
                                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                        className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] transition-all cursor-pointer"
                                    >
                                        {Object.entries(ReportTypeLabels).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={generating}
                                className="w-full bg-[var(--text-primary)] text-[var(--surface)] hover:bg-[var(--primary)] rounded-lg py-3.5 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {generating ? <RefreshCcw size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                                Start Analysis
                            </button>
                        </form>
                    </section>
                </div>

                {/* Section 2: Intelligence History */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-2">
                            <Archive size={14} /> Analysis History
                        </h2>
                        <div className="relative group/search">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within/search:text-[var(--primary)] transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Search records..."
                                className="bg-[var(--surface-alt)]/40 border border-[var(--border-subtle)] rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)] focus:shadow-sm w-64 lg:w-80 transition-all placeholder:text-[var(--text-muted)] placeholder:font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="h-16 bg-[var(--surface-alt)] animate-pulse rounded-xl" />
                            ))
                        ) : reports.length === 0 ? (
                            <div className="py-12 text-center border-2 border-dashed border-[var(--border-subtle)] rounded-2xl">
                                <p className="text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest">No analysis history found.</p>
                            </div>
                        ) : (
                            reports.map(r => (
                                <motion.div
                                    key={r.id}
                                    layout
                                    onClick={() => fetchFullReport(r.id)}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${selectedReport?.id === r.id
                                        ? 'bg-[var(--primary)]/5 border-[var(--primary)] shadow-sm'
                                        : 'bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-lg transition-colors ${selectedReport?.id === r.id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-alt)] text-[var(--text-muted)] group-hover:bg-[var(--text-primary)] group-hover:text-[var(--surface)]'}`}>
                                            <FileText size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold tracking-tight text-[var(--text-primary)]">{r.title}</p>
                                            <div className="flex items-center gap-2.5 mt-0.5">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{ReportTypeLabels[r.report_type]}</span>
                                                <span className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
                                                <span className="text-[9px] font-bold text-[var(--text-muted)] italic">{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleExport(r.id, 'csv'); }}
                                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                                            title="Export CSV"
                                        >
                                            <Download size={14} />
                                        </button>
                                        <ChevronRight size={14} className={`text-[var(--border-subtle)] transition-transform ${selectedReport?.id === r.id ? 'translate-x-0.5 text-[var(--primary)]' : 'group-hover:translate-x-0.5'}`} />
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Preview Panel: Pro Grade Presentation */}
                    <AnimatePresence>
                        {selectedReport && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-6 p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 blur-3xl -mr-16 -mt-16 rounded-full" />

                                <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8 pb-6 border-b border-[var(--border-subtle)] relative z-10">
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className="px-1.5 py-0.5 rounded bg-[var(--text-primary)] text-[var(--surface)] text-[9px] font-black uppercase tracking-widest">Intelligence Report</span>
                                            <span className="px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-muted)] text-[9px] font-bold">REF: {selectedReport.id.slice(-8).toUpperCase()}</span>
                                            {selectedReport.data?.region && (
                                                <span className="px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                    <MapPin size={10} /> {selectedReport.data.region}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-2xl font-black tracking-tight text-[var(--text-primary)] leading-tight">{selectedReport.title}</h3>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => handleExport(selectedReport.id, 'csv')}
                                            className="px-4 py-2 border border-[var(--border-subtle)] hover:border-[var(--text-primary)] rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 bg-[var(--surface-alt)]/30"
                                        >
                                            <Download size={14} /> CSV
                                        </button>
                                        <button
                                            onClick={() => handleExport(selectedReport.id, 'pdf')}
                                            className="px-4 py-2 bg-[var(--text-primary)] text-[var(--surface)] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[var(--primary)] transition-all flex items-center gap-2"
                                        >
                                            <FileText size={14} /> PDF
                                        </button>
                                    </div>
                                </div>

                                {selectedReport.data?.executive_summary && (
                                    <div className="mb-8 relative z-10">
                                        <div className="flex items-center gap-2 mb-3 text-[var(--primary)]">
                                            <Shield size={14} />
                                            <span className="text-[10px] uppercase tracking-[0.2em] font-black">Executive Summary</span>
                                        </div>
                                        <div className="text-sm font-medium leading-relaxed text-[var(--text-secondary)] bg-[var(--surface-alt)]/30 p-6 rounded-xl border border-l-[4px] border-[var(--border-subtle)] border-l-[var(--primary)]">
                                            {selectedReport.data.executive_summary.replace(/\*\*/g, '')}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
                                    {[
                                        { label: 'Incidents', value: selectedReport.total_events || 0, icon: Globe, color: 'text-blue-500' },
                                        { label: 'Critical Alerts', value: selectedReport.total_alerts || 0, icon: AlertTriangle, color: 'text-orange-500' },
                                        { label: 'Inspections', value: selectedReport.total_inspections || 0, icon: Shield, color: 'text-emerald-500' },
                                        { label: 'Field Tasks', value: selectedReport.total_tasks || 0, icon: CheckCircle, color: 'text-[var(--primary)]' },
                                    ].map(item => (
                                        <div key={item.label} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:shadow-inner transition-all group">
                                            <div className="flex items-center gap-2 mb-2">
                                                <item.icon size={12} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] whitespace-nowrap">{item.label}</p>
                                            </div>
                                            <p className={`text-2xl font-black ${item.color}`}>{item.value.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Reports;
