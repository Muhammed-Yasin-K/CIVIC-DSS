import { useState, useEffect } from 'react';
import {
    Save, RotateCcw, Shield, Bell, Database,
    AlertCircle, CheckCircle2, Info, Clock, User,
    Settings2, BarChart, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

export default function SystemConfig() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('thresholds');
    const [formData, setFormData] = useState({
        risk_thresholds: { low_max: 40, medium_max: 70, high_min: 70 },
        prediction_confidence_threshold: 0.6,
        max_alerts_per_hour: 10,
        enable_audit_logging: true,
        data_retention_days: 90
    });
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/api/v1/config');
            setConfig(response.data);
            setFormData({
                risk_thresholds: response.data.risk_thresholds,
                prediction_confidence_threshold: response.data.prediction_confidence_threshold,
                max_alerts_per_hour: response.data.max_alerts_per_hour,
                enable_audit_logging: response.data.enable_audit_logging,
                data_retention_days: response.data.data_retention_days
            });
        } catch (error) {
            console.error('Error fetching config:', error);
            setError('Failed to communicate with intelligence node. Systems may be offline.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Validation: thresholds should be sequential
        const { low_max, medium_max, high_min } = formData.risk_thresholds;
        if (low_max < 0 || high_min > 100) {
            alert('Calibration Error: Risk thresholds must be realistic percentages between 0 and 100.');
            return;
        }
        if (low_max >= medium_max || medium_max > high_min) {
            alert('Calibration Error: Thresholds must be logically sequential (Medium < High ≤ Critical)');
            return;
        }

        try {
            setSaving(true);
            await api.put('/api/v1/config', {
                ...formData,
                change_description: `Adaptive synchronization: Calibrated ${activeTab} parameters.`
            });
            await fetchConfig();
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 4000);
        } catch (error) {
            console.error('Error saving config:', error);
            alert('Synchronization Failed: Backend rejected commit.');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (config) {
            setFormData({
                risk_thresholds: config.risk_thresholds,
                prediction_confidence_threshold: config.prediction_confidence_threshold,
                max_alerts_per_hour: config.max_alerts_per_hour,
                enable_audit_logging: config.enable_audit_logging,
                data_retention_days: config.data_retention_days
            });
        }
    };

    const hasChanges = config ? (
        formData.risk_thresholds.low_max !== config.risk_thresholds.low_max ||
        formData.risk_thresholds.medium_max !== config.risk_thresholds.medium_max ||
        formData.risk_thresholds.high_min !== config.risk_thresholds.high_min ||
        formData.prediction_confidence_threshold !== config.prediction_confidence_threshold ||
        formData.max_alerts_per_hour !== config.max_alerts_per_hour ||
        formData.enable_audit_logging !== config.enable_audit_logging ||
        formData.data_retention_days !== config.data_retention_days
    ) : false;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] animate-pulse">Establishing Neural Link...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6 px-4 text-center">
                <div className="glass-panel p-8 rounded-[2rem] border-rose-500/20 max-w-md">
                    <div className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl w-fit mx-auto mb-6">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-black text-[var(--text-primary)] mb-2 uppercase tracking-tight">Node Offline</h2>
                    <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed mb-8">{error}</p>
                    <button
                        onClick={fetchConfig}
                        className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-rose-500/20"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'thresholds', label: 'Risk Thresholds', icon: BarChart, description: 'Define score boundaries for risk levels.' },
        { id: 'prediction', label: 'Prediction Model', icon: Cpu, description: 'Adjust AI confidence and sensitivity.' },
        { id: 'alerts', label: 'Alerting', icon: Bell, description: 'Configure notification limits and frequency.' },
        { id: 'system', label: 'System & Security', icon: Shield, description: 'Manage audit logs and data retention.' }
    ];

    return (
        <div className="max-w-[1400px] mx-auto pb-10 px-4">
            {/* Glass Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                            System Intelligence
                        </span>
                        <Settings2 className="text-blue-500" size={32} />
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-1 font-semibold flex items-center gap-2">
                        <Cpu size={14} className="text-indigo-500" />
                        Global Configuration & Logic Calibration
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <AnimatePresence>
                        {hasChanges && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="text-[10px] font-black text-amber-500 uppercase tracking-widest px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20"
                            >
                                Modified State
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={handleReset}
                        disabled={!hasChanges}
                        className={`px-3 py-2 text-[10px] font-black rounded-xl transition-all border uppercase tracking-widest ${hasChanges ? 'text-rose-500 border-rose-500 hover:bg-rose-500/10 shadow-lg shadow-rose-500/10 active:scale-95' : 'text-[var(--text-secondary)] border-[var(--border-subtle)] opacity-30 cursor-not-allowed'}`}
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className={`px-8 py-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-widest ${hasChanges ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 active:scale-95' : 'bg-[var(--surface-alt)] text-[var(--text-muted)] border border-[var(--border-subtle)] opacity-50 cursor-not-allowed'}`}
                    >
                        {saving ? 'Syncing...' : 'Commit Changes'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Glass Navigation Sidebar */}
                <div className="w-full lg:w-80 space-y-3">
                    <div className="glass-panel p-4 rounded-3xl space-y-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-left p-4 rounded-2xl transition-all group ${activeTab === tab.id
                                    ? 'bg-[var(--primary)] text-white shadow-xl shadow-blue-500/25'
                                    : 'hover:bg-[var(--surface-alt)] border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-4 mb-1">
                                    <div className={`p-2 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-white/20' : 'bg-[var(--surface-alt)] group-hover:bg-blue-500/10'}`}>
                                        <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-blue-500'} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-[0.1em]">
                                        {tab.label}
                                    </span>
                                </div>
                                <p className={`text-[10px] font-bold pl-12 opacity-60 line-clamp-1`}>
                                    {tab.description}
                                </p>
                            </button>
                        ))}
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border border-[var(--border-subtle)]/30">
                        <div className="space-y-6">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Node Last Synchronized</p>
                                <div className="flex items-center gap-3 text-xs font-black text-[var(--text-primary)]">
                                    <div className="p-2 bg-blue-500/10 rounded-lg"><Clock size={16} className="text-blue-500" /></div>
                                    {new Date(config?.updated_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </div>
                            </div>
                            <div className="pt-6 border-t border-[var(--border-subtle)]/30">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Authorized Operator</p>
                                <div className="flex items-center gap-3 text-xs font-black text-[var(--text-primary)]">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg"><User size={16} className="text-indigo-500" /></div>
                                    {config?.updated_by || 'ROOT_ADMIN'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Settings Display */}
                <div className="flex-1 glass-panel p-8 md:p-12 rounded-[40px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[100px] -mr-48 -mt-48" />
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'thresholds' && (
                                <div className="space-y-12">
                                    <div>
                                        <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Intelligence Calibration</h2>
                                        <p className="text-xs text-[var(--text-muted)] mt-2 font-black uppercase tracking-widest opacity-60">Fine-tune boundary logic for risk classification</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {[
                                            { key: 'low_max', label: 'Medium', color: 'emerald', icon: CheckCircle2 },
                                            { key: 'medium_max', label: 'High', color: 'amber', icon: Info },
                                            { key: 'high_min', label: 'Critical', color: 'rose', icon: AlertCircle }
                                        ].map((field) => (
                                            <div key={field.key} className="glass-card p-6 border-t-4 transition-all hover:scale-[1.02]" style={{ borderColor: `var(--${field.color}-500)` }}>
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className={`p-2 rounded-xl bg-${field.color}-500/10 text-${field.color}-500`}>
                                                        <field.icon size={20} />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{field.label}</span>
                                                </div>
                                                <div className="flex items-end gap-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="1"
                                                        value={formData.risk_thresholds[field.key]}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            risk_thresholds: { ...formData.risk_thresholds, [field.key]: parseFloat(e.target.value) }
                                                        })}
                                                        className="w-full bg-[var(--surface-alt)] p-4 rounded-2xl text-3xl font-black text-[var(--text-primary)] border border-[var(--border-subtle)]/30 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-mono"
                                                    />
                                                    <span className="text-xl font-black text-[var(--text-muted)] mb-4">%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-4 items-start">
                                        <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
                                        <p className="text-xs leading-relaxed text-[var(--text-secondary)] font-bold">
                                            Operational Guide: Thresholds define the percentage maximums for risk segments.
                                            Adjusting these values will retroactively re-classify all active hotspots across the dashboard.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'prediction' && (
                                <div className="space-y-12">
                                    <div>
                                        <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Model Sensitivity</h2>
                                        <p className="text-xs text-[var(--text-muted)] mt-2 font-black uppercase tracking-widest opacity-60">Calibrate inference confidence requirements</p>
                                    </div>

                                    <div className="max-w-2xl">
                                        <div className="glass-card p-10 space-y-10 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 blur-3xl -mr-20 -mt-20 group-hover:bg-blue-500/20 transition-all" />
                                            <div className="flex justify-between items-center relative z-10">
                                                <div>
                                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Confidence Floor</span>
                                                    <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase">Minimum Probability Requirement</p>
                                                </div>
                                                <span className="text-5xl font-black text-blue-500 font-mono tracking-tighter">
                                                    {Math.round(formData.prediction_confidence_threshold * 100)}%
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                value={formData.prediction_confidence_threshold}
                                                onChange={(e) => setFormData({ ...formData, prediction_confidence_threshold: parseFloat(e.target.value) })}
                                                className="w-full h-3 bg-[var(--surface-alt)] rounded-full appearance-none cursor-pointer accent-blue-600 border border-[var(--border-subtle)]/30 shadow-inner"
                                            />
                                            <div className="flex justify-between text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">
                                                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Balanced Inference</div>
                                                <div className="flex items-center gap-2">Maximum Precision <div className="w-2 h-2 rounded-full bg-rose-500" /></div>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex gap-6 p-6 border-l-4 border-l-blue-500 bg-blue-500/5 rounded-r-2xl">
                                            <Cpu className="text-blue-500 shrink-0" size={24} />
                                            <p className="text-xs text-[var(--text-secondary)] font-bold leading-relaxed">
                                                Impact Analysis: Higher thresholds significantly reduce false-positive indicators but may delay recognition of emerging crime patterns.
                                                Synchronized models require at least 60% confidence for mission-critical deployments.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'alerts' && (
                                <div className="space-y-12">
                                    <div>
                                        <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Intelligence Routing</h2>
                                        <p className="text-xs text-[var(--text-muted)] mt-2 font-black uppercase tracking-widest opacity-60">Manage notification bandwidth & officer focus</p>
                                    </div>

                                    <div className="max-w-md glass-card p-10 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-amber-500/10 transition-all" />
                                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] block mb-6">Inbound Velocity Cap</label>
                                        <div className="flex items-end gap-4 relative z-10">
                                            <input
                                                type="number"
                                                value={formData.max_alerts_per_hour}
                                                onChange={(e) => setFormData({ ...formData, max_alerts_per_hour: parseInt(e.target.value) })}
                                                className="w-full bg-[var(--surface-alt)] p-6 rounded-2xl text-5xl font-black text-[var(--text-primary)] border border-[var(--border-subtle)]/30 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all font-mono"
                                            />
                                            <div className="mb-4">
                                                <span className="text-xs font-black text-amber-500 uppercase tracking-widest block">Signals</span>
                                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block">Per Hour</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 border border-dashed border-[var(--border-subtle)] rounded-3xl flex gap-4 items-center opacity-60">
                                        <Bell className="text-[var(--text-muted)]" size={20} />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Global alert suppression is currently inactive</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'system' && (
                                <div className="space-y-12">
                                    <div>
                                        <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Engine Governance</h2>
                                        <p className="text-xs text-[var(--text-muted)] mt-2 font-black uppercase tracking-widest opacity-60">Compliance protocols and data persistence</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <motion.div
                                            whileHover={{ y: -5 }}
                                            onClick={() => setFormData({ ...formData, enable_audit_logging: !formData.enable_audit_logging })}
                                            className="glass-card p-8 cursor-pointer border-2 border-transparent hover:border-blue-500/30 transition-all flex flex-col justify-between h-64 group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
                                                    <Database size={28} />
                                                </div>
                                                <div className={`w-14 h-7 rounded-full relative transition-colors ${formData.enable_audit_logging ? 'bg-blue-600' : 'bg-[var(--surface-alt)] border border-[var(--border-subtle)]'}`}>
                                                    <motion.div
                                                        animate={{ x: formData.enable_audit_logging ? 28 : 4 }}
                                                        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Cryptographic Auditing</h3>
                                                <p className="text-[11px] text-[var(--text-muted)] font-black mt-2 uppercase tracking-widest leading-relaxed opacity-60">Maintain immutable logs of all system state transitions</p>
                                            </div>
                                        </motion.div>

                                        <motion.div whileHover={{ y: -5 }} className="glass-card p-8 flex flex-col justify-between h-64">
                                            <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl w-fit">
                                                <Clock size={28} />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Persistence Horizon</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="number"
                                                        value={formData.data_retention_days}
                                                        onChange={(e) => setFormData({ ...formData, data_retention_days: parseInt(e.target.value) })}
                                                        className="w-full bg-[var(--surface-alt)] p-4 rounded-2xl text-3xl font-black text-[var(--text-primary)] border border-[var(--border-subtle)]/30 focus:outline-none focus:ring-4 focus:ring-amber-500/10 font-mono"
                                                    />
                                                    <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">SOLAR_DAYS</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Glass Success Toast */}
            <AnimatePresence>
                {showSuccessToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.9 }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] px-8 py-5 bg-black/80 backdrop-blur-2xl text-white rounded-[2rem] border border-white/10 shadow-2xl flex items-center gap-4"
                    >
                        <div className="p-2 bg-emerald-500 rounded-full">
                            <CheckCircle2 size={20} className="text-white" />
                        </div>
                        <div className="pr-4">
                            <p className="text-sm font-black tracking-tight uppercase">Synchronization Complete</p>
                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-0.5">Global parameters up to date</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
