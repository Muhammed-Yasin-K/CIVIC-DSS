import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, CheckCircle, AlertTriangle, Upload, Download, FileText, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import api from '../services/api';

const DataManagement = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const resp = await api.get('/api/v1/analytics/data-stats');
            setStats(resp.data);
        } catch (err) {
            console.error("Failed to fetch data stats:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            setLoading(true);
            try {
                await api.post('/api/v1/analytics/data-ingest/predictions', formData);
                alert("Data Imported Successfully");
                fetchStats();
            } catch (err) {
                console.error("Import failed:", err);
                alert("Import Failed: Schema validation error");
            } finally {
                setLoading(false);
            }
        };
        input.click();
    };

    const handleExportAll = async () => {
        setExporting('all');
        try {
            const response = await api.get(`/api/v1/analytics/data-export-all`, { responseType: 'blob' });

            const blob = new Blob([response.data], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `civicrisk_full_export_${new Date().getTime()}.zip`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export all failed:", err);
            alert('Export failed.');
        } finally {
            setExporting(false);
        }
    };

    const handleExport = async (collection) => {
        setExporting(collection);
        try {
            const response = await api.get(`/api/v1/analytics/data-export/${collection}`);
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `data_export_${collection}_${new Date().getTime()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed:", err);
            alert('Export failed.');
        } finally {
            setExporting(false);
        }
    };

    const handleValidation = async () => {
        setLoading(true);
        try {
            const resp = await api.post('/api/v1/analytics/consistency-check');
            alert(`Validation Complete: ${resp.data.anomalies_found} anomalies found.`);
            fetchStats();
        } catch (err) {
            console.error("Validation failed:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto pb-12 px-4">
            {/* Glass Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
                            Data Infrastructure
                        </span>
                        <Database className="text-emerald-500" size={32} />
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-1 font-semibold flex items-center gap-2">
                        <Layers size={14} className="text-blue-500" />
                        Intelligence Pipelines & Quality Assurance
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchStats}
                        className="glass-card flex items-center gap-2 px-5 py-2.5 text-xs font-bold hover:bg-[var(--surface-alt)] transition-all active:scale-95"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        Synchronize Data
                    </button>
                </div>
            </div>

            {/* Glass Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div whileHover={{ y: -5 }} className="glass-card p-6 border-l-4 border-l-emerald-500">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Quality Score</span>
                        <div className="p-2 bg-emerald-500/10 rounded-lg"><ShieldCheck size={18} className="text-emerald-500" /></div>
                    </div>
                    {loading ? <div className="h-10 w-24 bg-[var(--surface-alt)] animate-pulse rounded-lg" /> : (
                        <p className="text-3xl font-black text-[var(--text-primary)]">
                            {stats?.quality_score?.toFixed(1) || "0.0"}%
                        </p>
                    )}
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-card p-6 border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Records</span>
                        <div className="p-2 bg-blue-500/10 rounded-lg"><Layers size={18} className="text-blue-500" /></div>
                    </div>
                    {loading ? <div className="h-10 w-24 bg-[var(--surface-alt)] animate-pulse rounded-lg" /> : (
                        <p className="text-3xl font-black text-[var(--text-primary)]">
                            {stats?.total_records?.toLocaleString() || "0"}
                        </p>
                    )}
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-card p-6 border-l-4 border-l-indigo-500">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Active Sources</span>
                        <div className="p-2 bg-indigo-500/10 rounded-lg"><FileText size={18} className="text-indigo-500" /></div>
                    </div>
                    {loading ? <div className="h-10 w-24 bg-[var(--surface-alt)] animate-pulse rounded-lg" /> : (
                        <p className="text-3xl font-black text-[var(--text-primary)]">
                            {stats?.active_sources || "0"}
                        </p>
                    )}
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-card p-6 border-l-4 border-l-rose-500">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Anomalies</span>
                        <div className="p-2 bg-rose-500/10 rounded-lg"><AlertTriangle size={18} className="text-rose-500" /></div>
                    </div>
                    {loading ? <div className="h-10 w-24 bg-[var(--surface-alt)] animate-pulse rounded-lg" /> : (
                        <p className={`text-3xl font-black ${stats?.anomalies > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {stats?.anomalies || 0}
                        </p>
                    )}
                </motion.div>
            </div>

            {/* Core Operations */}
            <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl -mr-32 -mt-32" />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-8 border-b border-[var(--border-subtle)] pb-4">Lifecycle Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleImport}
                        className="p-8 bg-gradient-to-br from-[var(--surface)] to-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-2xl text-left shadow-lg shadow-emerald-500/5 group"
                    >
                        <Upload className="text-emerald-500 mb-4 group-hover:translate-y-[-4px] transition-transform" size={32} />
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Import Intelligence</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-bold leading-relaxed">Upload CSV datasets to the primary inference buffer.</p>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleExportAll}
                        disabled={exporting === 'all'}
                        className="p-8 bg-gradient-to-br from-[var(--surface)] to-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-2xl text-left shadow-lg shadow-blue-500/5 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Download className={`text-blue-500 mb-4 ${exporting === 'all' ? 'animate-bounce' : 'group-hover:translate-y-[4px]'} transition-transform relative z-10`} size={32} />
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight relative z-10">{exporting === 'all' ? 'Packaging Data...' : 'Export Intelligence'}</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-bold leading-relaxed relative z-10">Download a complete, unified ZIP archive of all database collections.</p>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleValidation}
                        className="p-8 bg-gradient-to-br from-[var(--surface)] to-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-2xl text-left shadow-lg shadow-indigo-500/5 group"
                    >
                        <CheckCircle className="text-indigo-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Integrity Check</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-bold leading-relaxed">Execute autonomous consistency scan across all nodes.</p>
                    </motion.button>
                </div>
            </div>

            {/* Data Pipeline Table */}
            <div className="glass-panel rounded-3xl overflow-hidden">
                <div className="p-6 bg-[var(--surface-alt)]/30 border-b border-[var(--border-subtle)]/50 backdrop-blur-md">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">Active Engine Pipelines</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase bg-[var(--surface-alt)]/20 border-b border-[var(--border-subtle)]/30">
                            <tr>
                                <th className="px-8 py-5">Node Identity</th>
                                <th className="px-8 py-5">Communication</th>
                                <th className="px-8 py-5">Density</th>
                                <th className="px-8 py-5 text-right">Operational Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]/30">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i}><td colSpan="4" className="px-8 py-6 h-16 animate-pulse bg-[var(--surface-alt)]/10" /></tr>
                                ))
                            ) : (
                                stats?.pipelines?.map((pipe, idx) => (
                                    <tr key={idx} className="hover:bg-[var(--surface-alt)]/40 transition-all group">
                                        <td className="px-8 py-5 font-black text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">{pipe.name}</td>
                                        <td className="px-8 py-5 text-[var(--text-secondary)] font-bold text-xs">{pipe.protocol}</td>
                                        <td className="px-8 py-5 font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">{pipe.density.toLocaleString()}</td>
                                        <td className="px-8 py-5 text-right">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${pipe.status === 'STABLE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                                {pipe.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default DataManagement;
