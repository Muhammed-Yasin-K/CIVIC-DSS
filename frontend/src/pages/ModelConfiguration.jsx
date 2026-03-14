import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, BarChart3, Settings, RefreshCw, Sliders, AlertCircle, X, Activity, Target, Zap, Calendar } from 'lucide-react';
import api from '../services/api';

const ModelConfiguration = () => {
    const [modelData, setModelData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchModelStats();
    }, []);

    const fetchModelStats = async () => {
        setLoading(true);
        try {
            const [perfRes, statsRes] = await Promise.allSettled([
                api.get('/api/v1/analytics/model-performance'),
                api.get('/api/v1/analytics/dashboard/stats')
            ]);

            const perf = perfRes.status === 'fulfilled' ? perfRes.value.data : null;
            const stats = statsRes.status === 'fulfilled' ? statsRes.value.data : null;

            const xgbAccuracy = perf?.xgboost?.accuracy
                ? (perf.xgboost.accuracy * 100).toFixed(1)
                : perf?.xgboost?.model_loaded === false
                    ? 'N/A'
                    : '—';

            const totalPredictions = stats?.total_events || 0;
            const trainingDateStr = perf?.xgboost?.training_date;
            const trainingDate = (trainingDateStr && trainingDateStr !== 'Unknown') ? new Date(trainingDateStr) : null;

            let daysSinceTraining = null;
            if (trainingDate && !isNaN(trainingDate.getTime())) {
                daysSinceTraining = Math.floor((Date.now() - trainingDate.getTime()) / (1000 * 60 * 60 * 24));
            }

            setModelData({
                accuracy: xgbAccuracy,
                totalPredictions,
                daysSinceTraining,
                xgboostLoaded: perf?.xgboost?.model_loaded ?? false,
                arimaLoaded: perf?.arima?.model_loaded ?? false,
                xgboostMetrics: perf?.xgboost || {},
                arimaMetrics: perf?.arima || {},
                calibration: perf?.xgboost?.calibration || {}
            });
        } catch (error) {
            console.error('Failed to fetch model stats:', error);
            setModelData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleReload = async () => {
        if (!window.confirm('Reload model artifacts from disk? This will briefly interrupt inference services.')) return;
        setLoading(true);
        try {
            const res = await api.post('/api/v1/analytics/models/reload');
            if (res.data.success) {
                alert('Models Reloaded Successfully');
                fetchModelStats();
            }
        } catch (error) {
            console.error('Reload failed:', error);
            alert('Reload Failed: Check backend connectivity');
        } finally {
            setLoading(false);
        }
    };

    const [showThresholds, setShowThresholds] = useState(false);
    const [thresholds, setThresholds] = useState(null);
    const [savingThresholds, setSavingThresholds] = useState(false);

    const openThresholds = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/v1/analytics/models/thresholds');
            const data = res.data;
            setThresholds({
                confidence: data.prediction_confidence_threshold,
                lowMax: data.risk_thresholds.low_max,
                highMin: data.risk_thresholds.high_min
            });
            setShowThresholds(true);
        } catch (error) {
            console.error('Failed to fetch thresholds:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleThresholdUpdate = async () => {
        setSavingThresholds(true);
        try {
            await api.patch('/api/v1/analytics/models/thresholds', {
                prediction_confidence_threshold: thresholds.confidence,
                risk_thresholds: {
                    low_max: thresholds.lowMax,
                    high_min: thresholds.highMin
                }
            });
            setShowThresholds(false);
            fetchModelStats();
        } catch (error) {
            console.error('Failed to save thresholds:', error);
            alert('Validation Error');
        } finally {
            setSavingThresholds(false);
        }
    };

    const [showImportance, setShowImportance] = useState(false);
    const [importanceData, setImportanceData] = useState([]);
    const [importanceLoading, setImportanceLoading] = useState(false);

    const openImportance = async () => {
        setImportanceLoading(true);
        setShowImportance(true);
        try {
            const res = await api.get('/api/v1/analytics/models/importance');
            setImportanceData(res.data);
        } catch (error) {
            console.error('Failed to fetch importance:', error);
        } finally {
            setImportanceLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8 max-w-[1400px] mx-auto pb-12 px-4 relative"
        >

            {/* Glass Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                                Model Intelligence
                            </span>
                            <Brain className="text-blue-500" size={32} fill="currentColor" strokeWidth={0} />
                        </h1>
                        <p className="text-[var(--text-secondary)] text-sm mt-1 font-semibold flex items-center gap-2">
                            <Activity size={14} className="text-emerald-500" />
                            Autonomous Engine Configuration & Calibration
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchModelStats}
                        className="glass-card flex items-center gap-2 px-5 py-2.5 text-xs font-bold hover:bg-[var(--surface-alt)] transition-all active:scale-95"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        Synchronize Engine
                    </button>
                </div>
            </div>

            {/* Glass Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[var(--surface)] rounded-[1rem] p-6 shadow-sm border border-[var(--border-subtle)] flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Model Accuracy</span>
                        <div className="p-2 bg-indigo-500/10 rounded-xl"><Target size={18} className="text-indigo-500" /></div>
                    </div>
                    {loading ? (
                        <div className="h-10 w-24 bg-[var(--surface-alt)] animate-pulse rounded-lg mt-auto" />
                    ) : (
                        <div className="mt-auto">
                            <p className="text-[2.5rem] font-bold text-[var(--text-primary)] leading-none tracking-tight">
                                {modelData?.accuracy !== undefined && modelData.accuracy !== 'N/A' ? `${modelData.accuracy}%` : '---'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-[var(--surface)] rounded-[1rem] p-6 shadow-sm border border-[var(--border-subtle)] flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Inference Volume</span>
                        <div className="p-2 bg-indigo-500/10 rounded-xl"><Zap size={18} className="text-indigo-500" /></div>
                    </div>
                    {loading ? (
                        <div className="h-10 w-24 bg-[var(--surface-alt)] animate-pulse rounded-lg mt-auto" />
                    ) : (
                        <p className="text-[2.5rem] font-bold text-[var(--text-primary)] leading-none tracking-tight mt-auto">
                            {modelData ? modelData.totalPredictions.toLocaleString() : '0'}
                        </p>
                    )}
                </div>

                <div className="bg-[var(--surface)] rounded-[1rem] p-6 shadow-sm border border-[var(--border-subtle)] flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Retraining Status</span>
                        <div className="p-2 bg-orange-500/10 rounded-xl"><Calendar size={18} className="text-orange-400" /></div>
                    </div>
                    {loading ? (
                        <div className="h-10 w-24 bg-[var(--surface-alt)] animate-pulse rounded-lg mt-auto" />
                    ) : (
                        <div className="mt-auto">
                            <p className="text-[2.5rem] font-bold text-[var(--text-primary)] leading-none tracking-tight">
                                {modelData?.daysSinceTraining !== null ? `${modelData.daysSinceTraining}D` : 'N/A'}
                            </p>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mt-3">
                                Source: Model Artifact metadata
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Model Health Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-panel p-6 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-xl"><Brain size={20} className="text-blue-500" /></div>
                            <h3 className="font-black text-sm uppercase tracking-tighter text-[var(--text-primary)]">Classification Engine (XGB)</h3>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${modelData?.xgboostLoaded ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                            {modelData?.xgboostLoaded ? 'Online' : 'Warning'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {Object.keys(modelData?.xgboostMetrics || {}).length > 0 ? (
                            Object.entries(modelData.xgboostMetrics)
                                .filter(([k]) => ['accuracy', 'precision', 'recall', 'f1_score'].includes(k))
                                .map(([k, v]) => (
                                    <div key={k} className="bg-[var(--surface-alt)]/40 p-4 rounded-xl border border-[var(--border-subtle)]/30 backdrop-blur-md">
                                        <p className="text-[9px] font-black uppercase text-[var(--text-muted)] mb-1">{k.replace(/_/g, ' ')}</p>
                                        <p className="text-lg font-black text-[var(--text-primary)]">
                                            {typeof v === 'number' ? (v * 100).toFixed(1) + '%' : String(v)}
                                        </p>
                                    </div>
                                ))
                        ) : (
                            <div className="col-span-2 text-center py-10 opacity-30 italic text-xs font-bold uppercase tracking-widest">Awaiting Metric Stream...</div>
                        )}
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-xl"><TrendingUp size={20} className="text-indigo-500" /></div>
                            <h3 className="font-black text-sm uppercase tracking-tighter text-[var(--text-primary)]">Forecasting Node (ARIMA)</h3>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${modelData?.arimaLoaded ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                            {modelData?.arimaLoaded ? 'Online' : 'Warning'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {Object.keys(modelData?.arimaMetrics || {}).length > 0 ? (
                            Object.entries(modelData.arimaMetrics)
                                .filter(([k]) => ['accuracy', 'mae', 'rmse'].includes(k))
                                .map(([k, v]) => (
                                    <div key={k} className="bg-[var(--surface-alt)]/40 p-4 rounded-xl border border-[var(--border-subtle)]/30 backdrop-blur-md">
                                        <p className="text-[9px] font-black uppercase text-[var(--text-muted)] mb-1">{k.replace(/_/g, ' ')}</p>
                                        <p className="text-lg font-black text-[var(--text-primary)]">
                                            {typeof v === 'number' ? (k === 'accuracy' ? (v * 100).toFixed(1) + '%' : v.toFixed(3)) : String(v)}
                                        </p>
                                    </div>
                                ))
                        ) : (
                            <div className="col-span-2 text-center py-10 opacity-30 italic text-xs font-bold uppercase tracking-widest">Awaiting Metric Stream...</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Core Operations */}
            <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-8 border-b border-[var(--border-subtle)] pb-4">Engine Command Center</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleReload}
                        className="p-8 bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-blue-500/30 rounded-2xl text-left shadow-sm hover:shadow-md group relative overflow-hidden transition-all duration-300"
                    >
                        <RefreshCw className="text-blue-500 mb-4 group-hover:rotate-180 transition-transform duration-700" size={32} />
                        <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Reload Artifacts</h3>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-2 font-bold leading-relaxed">Hard reset model state from disk storage. Use after manual weights update.</p>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={openThresholds}
                        className="p-8 bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-indigo-500/30 rounded-2xl text-left shadow-sm hover:shadow-md group relative overflow-hidden transition-all duration-300"
                    >
                        <Sliders className="text-indigo-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
                        <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Calibrate Logic</h3>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-2 font-bold leading-relaxed">Tune classification sensitivity and risk score boundary mapping.</p>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={openImportance}
                        className="p-8 bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-emerald-500/30 rounded-2xl text-left shadow-sm hover:shadow-md group relative overflow-hidden transition-all duration-300"
                    >
                        <BarChart3 className="text-emerald-500 mb-4 group-hover:-translate-y-1 transition-transform" size={32} />
                        <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Global Importance</h3>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-2 font-bold leading-relaxed">Visualize the top features influencing the engine's current logic.</p>
                    </motion.button>
                </div>
            </div>

            {/* Thresholds Modal */}
            <AnimatePresence>
                {showThresholds && thresholds && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowThresholds(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[var(--surface)] w-full max-w-md p-8 rounded-3xl border border-[var(--border-subtle)] shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-16 -mt-16" />
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Engine Calibration</h3>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Confidence Floor</label>
                                        <span className="text-2xl font-black text-blue-500">{Math.round(thresholds.confidence * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={thresholds.confidence}
                                        onChange={(e) => setThresholds({ ...thresholds, confidence: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-[var(--surface-alt)] rounded-full appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">High Risk Boundary</label>
                                        <p className="text-[9px] text-[var(--text-muted)] font-bold leading-tight mb-2">Scores below this are <span className="text-blue-500">MEDIUM</span></p>
                                        <div className="relative">
                                            <input
                                                type="number" step="1"
                                                value={thresholds.lowMax}
                                                onChange={(e) => setThresholds({ ...thresholds, lowMax: parseFloat(e.target.value) })}
                                                className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl py-3 px-4 text-sm font-black text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">Critical Boundary</label>
                                        <p className="text-[9px] text-[var(--text-muted)] font-bold leading-tight mb-2">Scores above this are <span className="text-rose-500">CRITICAL</span></p>
                                        <div className="relative">
                                            <input
                                                type="number" step="1"
                                                value={thresholds.highMin}
                                                onChange={(e) => setThresholds({ ...thresholds, highMin: parseFloat(e.target.value) })}
                                                className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl py-3 px-4 text-sm font-black text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-center font-bold text-[var(--text-muted)] bg-[var(--surface-alt)]/50 py-2 rounded-lg border border-dashed border-[var(--border-subtle)]">
                                    Scores between these boundaries are classified as <span className="text-indigo-500 underline decoration-2 underline-offset-2">HIGH RISK</span>
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowThresholds(false)}
                                        className="flex-1 py-4 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)] font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleThresholdUpdate}
                                        disabled={savingThresholds}
                                        className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
                                    >
                                        {savingThresholds ? 'Calibrating...' : 'Update Logic'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Importance Modal */}
            <AnimatePresence>
                {showImportance && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowImportance(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[var(--surface)] w-full max-w-xl p-8 rounded-3xl border border-[var(--border-subtle)] shadow-2xl relative z-10"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Feature Contribution</h3>
                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Global AI Driving Factors</p>
                                </div>
                            </div>

                            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar mb-8">
                                {importanceLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <RefreshCw className="animate-spin text-blue-500" size={32} />
                                        <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Analyzing feature weights...</p>
                                    </div>
                                ) : importanceData.length > 0 ? (
                                    importanceData.map((item, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                                                <span className="text-[var(--text-primary)]">{(item.feature || '').replace(/_/g, ' ')}</span>
                                                <span className="text-blue-500">{(item.importance * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="h-2.5 bg-[var(--surface-alt)] rounded-full overflow-hidden border border-[var(--border-subtle)]/20">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${item.importance * 100}%` }}
                                                    transition={{ duration: 1, delay: i * 0.05 }}
                                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 bg-[var(--surface-alt)]/30 rounded-2xl border-2 border-dashed border-[var(--border-subtle)]">
                                        <Brain className="mx-auto mb-4 text-[var(--text-muted)] opacity-20" size={48} />
                                        <p className="text-xs text-[var(--text-muted)] font-black uppercase tracking-widest">Intelligence Data Unavailable</p>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setShowImportance(false)}
                                className="w-full py-4 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)] font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                            >
                                Close Intelligence Review
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ModelConfiguration;
