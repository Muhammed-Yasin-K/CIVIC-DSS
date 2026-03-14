import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle, CheckCircle, Clock, Search,
    ShieldAlert, AlertOctagon, Activity, ChevronRight, ClipboardCheck, List, MapPin
} from 'lucide-react';
import api from '../services/api';

const AlertRow = ({ alert }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isPending = alert.status === 'active' || alert.status === 'acknowledged';
    const hasReport = alert.metadata?.extra_details;
    const details = alert.metadata?.extra_details || {};

    const statusLabel = isPending ? 'RECORDED' : 'RESOLVED';
    const statusColor = isPending ? 'text-blue-500 bg-blue-500/10' : 'text-green-500 bg-green-500/10';
    const indicatorColor = isPending ? 'bg-blue-500' : 'bg-green-500 border-none';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden flex flex-col p-5 border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all rounded-3xl bg-white dark:bg-[var(--surface-alt)] shadow-sm hover:shadow-xl hover:shadow-[var(--primary)]/5"
        >
            {/* Status indicator bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${indicatorColor} transition-transform group-hover:scale-y-110`} />

            <div className="flex items-center gap-6">
                {/* Icon Circle */}
                <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center border transition-transform group-hover:rotate-6 ${statusColor} border-current/10`}>
                    <ShieldAlert size={26} className="opacity-80" />
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight truncate">
                            {alert.title}
                        </h3>
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-current ${statusColor}`}>
                            {statusLabel}
                        </span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-secondary)] line-clamp-1 mb-3">
                        {alert.message}
                    </p>
                    <div className="flex items-center gap-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                        <span className="flex items-center gap-2">
                            <Clock size={14} className="text-[var(--primary)]" />
                            {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </span>
                        <span className="opacity-30">/</span>
                        <span className="flex items-center gap-2">
                            <MapPin size={14} className="text-orange-500" />
                            {alert.zone || 'Global'}
                        </span>
                    </div>
                </div>

                {/* Toggle Button for Reports */}
                {hasReport && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-3 rounded-2xl border transition-all ${isExpanded ? 'bg-[var(--primary)] text-white border-[var(--primary)] rotate-90' : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--primary)] hover:border-[var(--primary)]/50 shadow-sm'}`}
                    >
                        <ChevronRight size={20} />
                    </button>
                )}
            </div>

            {/* Expandable Mission Report Section */}
            <AnimatePresence>
                {isExpanded && hasReport && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-6 pt-6 border-t-2 border-dashed border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="p-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] shadow-inner relative overflow-hidden group/card">
                                <Search size={40} className="absolute -right-4 -top-4 opacity-[0.03] group-hover/card:scale-125 transition-transform" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] mb-3 flex items-center gap-2">
                                    <Search size={14} /> Mission Updates
                                </p>
                                <p className="text-xs font-bold text-[var(--text-secondary)] leading-relaxed italic">
                                    "{details["Mission Updates"] || 'Successfully completed report.'}"
                                </p>
                            </div>

                            <div className="p-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] shadow-inner relative overflow-hidden group/card">
                                <List size={40} className="absolute -right-4 -top-4 opacity-[0.03] group-hover/card:scale-125 transition-transform" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-2">
                                    <List size={14} /> Tactical Actions
                                </p>
                                <p className="text-xs font-bold text-[var(--text-secondary)] leading-relaxed italic">
                                    "{details["Actions Taken"] || 'Routine protocol followed.'}"
                                </p>
                            </div>

                            <div className="md:col-span-2 flex items-center justify-between p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                        <ClipboardCheck size={16} />
                                    </div>
                                    <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Official Record: {details["Status"] || "RESOLVED"}</span>
                                </div>
                                <span className="text-[10px] font-bold text-[var(--text-muted)] italic">Logged: {details["Resolved On"]}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default function AlertsPage() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    // Only Pending (Active/Acknowledged) or Resolved
    const [filterStatus, setFilterStatus] = useState('pending'); // 'pending' or 'resolved'

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/v1/alerts?status=${filterStatus}`);
            setAlerts(response.data);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 15000); // 15s polling
        return () => clearInterval(interval);
    }, [filterStatus]);

    // Simple filtering: 'pending' (active/acknowledged) vs 'resolved'
    const filteredAlerts = alerts.filter(alert => {
        if (filterStatus === 'pending') {
            return alert.status === 'active' || alert.status === 'acknowledged';
        }
        return alert.status === 'resolved';
    });

    const pendingCount = alerts.filter(a => a.status === 'active' || a.status === 'acknowledged').length;

    return (
        <div className="max-w-[1000px] mx-auto py-12 px-4 space-y-10 mb-20">
            {/* Simple Minimal Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[var(--border-subtle)] pb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2">Operational Logs</h1>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-full bg-red-500/10 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{pendingCount} Active Logs</span>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest italic">Live Synchronizing</span>
                    </div>
                </div>

                <div className="flex bg-[var(--surface-alt)]/80 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--border-subtle)] shadow-xl shadow-black/5">
                    {[
                        { id: 'pending', label: 'Active Logs' },
                        { id: 'resolved', label: 'Archived' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === tab.id
                                ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Spaced Card List */}
            <div className="space-y-6">
                {loading && alerts.length === 0 ? (
                    <div className="p-24 flex flex-col items-center justify-center gap-4 bg-[var(--surface)] rounded-3xl border border-[var(--border-subtle)] shadow-sm">
                        <div className="w-8 h-8 border-3 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin"></div>
                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Accessing Logs...</span>
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="p-32 text-center bg-[var(--surface)] rounded-3xl border border-dashed border-[var(--border-subtle)]">
                        <CheckCircle className="mx-auto mb-6 text-[var(--primary)] opacity-10" size={64} />
                        <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-2 uppercase">Zero Active Alerts</h3>
                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">System Clear / All Missions Resolved</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <AnimatePresence mode='popLayout'>
                            {filteredAlerts.map((alert) => (
                                <AlertRow
                                    key={alert.id || alert._id}
                                    alert={alert}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
