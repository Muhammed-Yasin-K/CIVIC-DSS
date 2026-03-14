import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardCheck, Calendar, User, CheckCircle,
    Clock, AlertCircle, XCircle, MapPin, Shield,
    FileText, Wrench, Send, CheckSquare
} from 'lucide-react';
import api from '../services/api';

const Inspections = () => {
    const [inspections, setInspections] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedInspection, setSelectedInspection] = useState(null);
    const [updateForm, setUpdateForm] = useState({ status: '', findings: '', actions_taken: '' });
    const [successMsg, setSuccessMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchInspections();
        fetchStats();
    }, [filter]);

    const fetchInspections = async () => {
        try {
            const jurisdiction = localStorage.getItem('jurisdiction');
            const role = localStorage.getItem('role');

            let params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);
            // Do NOT add zone — backend scopes by officer_id automatically

            const queryString = params.toString() ? `?${params.toString()}` : '';
            const response = await api.get(`/api/v1/inspections/${queryString}`);
            setInspections(response.data);
        } catch (error) {
            console.error('Failed to fetch inspections:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const jurisdiction = localStorage.getItem('jurisdiction');
            const role = localStorage.getItem('role');

            let params = new URLSearchParams();
            if (role === 'officer' && jurisdiction) params.append('zone', jurisdiction);

            const queryString = params.toString() ? `?${params.toString()}` : '';
            const response = await api.get(`/api/v1/inspections/stats${queryString}`);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleUpdateInspection = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await api.put(`/api/v1/inspections/${selectedInspection.id}`, updateForm);
            setSelectedInspection(null);
            fetchInspections();
            fetchStats();
            setSuccessMsg(`Inspection for ${selectedInspection.location || selectedInspection.zone} updated successfully.`);
            setTimeout(() => setSuccessMsg(''), 3500);
        } catch (error) {
            console.error('Failed to update inspection:', error);
            alert('Failed to update inspection. Check console for details.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStartInspection = async (inspection) => {
        try {
            setSubmitting(true);
            await api.put(`/api/v1/inspections/${inspection.id}`, { status: 'in_progress' });
            fetchInspections();
            fetchStats();
            setSuccessMsg(`Inspection for ${inspection.location || inspection.zone} started — now In Progress.`);
            setTimeout(() => setSuccessMsg(''), 3500);
        } catch (error) {
            console.error('Failed to start inspection:', error);
            alert('Failed to start inspection.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock className="text-blue-500" size={18} />;
            case 'in_progress': return <AlertCircle className="text-orange-500" size={18} />;
            case 'completed': return <CheckCircle className="text-green-500" size={18} />;
            case 'cancelled': return <XCircle className="text-red-500" size={18} />;
            default: return <Clock size={18} />;
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            pending: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
            in_progress: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50',
            completed: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/50',
            cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50',
        };
        return map[status] || 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border-subtle)]';
    };

    const getPriorityBorder = (priority) => {
        switch ((priority || '').toLowerCase()) {
            case 'critical': return 'border-l-red-500';
            case 'high': return 'border-l-orange-500';
            case 'medium': return 'border-l-yellow-500';
            default: return 'border-l-blue-500';
        }
    };

    const criticalHighCount = stats
        ? (stats.by_priority?.critical || 0) + (stats.by_priority?.high || 0)
        : 0;

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            {/* Toast */}
            <AnimatePresence>
                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3 bg-green-500 text-white rounded-xl shadow-xl shadow-green-500/20 font-bold text-sm"
                    >
                        <CheckCircle size={18} /> {successMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="border-b border-[var(--border-subtle)] pb-6">
                <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                    <ClipboardCheck className="text-[var(--primary)]" size={28} />
                    Inspection Management
                </h1>
                <p className="text-[var(--text-secondary)] text-sm mt-1 font-medium">
                    Track and manage preventive maintenance inspections
                </p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { label: 'Total', value: stats.total, color: 'text-[var(--primary)]' },
                        { label: 'Pending', value: stats.pending, color: 'text-blue-500' },
                        { label: 'In Progress', value: stats.in_progress, color: 'text-orange-500' },
                        { label: 'Completed', value: stats.completed, color: 'text-green-500' },
                        { label: 'Critical & High', value: criticalHighCount, color: 'text-red-500' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="glass-panel p-4 rounded-xl border border-[var(--border-subtle)] shadow-[var(--card-shadow)]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{label}</p>
                            <p className={`text-2xl font-black ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { value: 'all', label: 'All', active: 'bg-gray-600 text-white border-gray-600 shadow-lg shadow-gray-600/20' },
                    { value: 'pending', label: 'Pending', active: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20' },
                    { value: 'in_progress', label: 'In Progress', active: 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' },
                    { value: 'completed', label: 'Completed', active: 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20' },
                    { value: 'cancelled', label: 'Cancelled', active: 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' },
                ].map(({ value, label, active }) => (
                    <button
                        key={value}
                        onClick={() => setFilter(value)}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition whitespace-nowrap border ${filter === value
                                ? active
                                : 'bg-[var(--surface-alt)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--primary)]/40'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Inspections List */}
            {loading ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                    <Clock className="mx-auto mb-3 animate-spin text-[var(--primary)]" size={32} />
                    <p className="font-bold text-sm uppercase tracking-widest">Loading inspections...</p>
                </div>
            ) : inspections.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-xl border border-[var(--border-subtle)]">
                    <CheckCircle className="mx-auto mb-3 text-green-500 opacity-40" size={48} />
                    <p className="text-[var(--text-muted)] font-bold text-sm">No {filter !== 'all' ? filter.replace('_', ' ') : ''} inspections found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {inspections.map((inspection) => (
                        <motion.div
                            key={inspection.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`glass-card p-5 border-l-4 ${getPriorityBorder(inspection.priority)} border border-[var(--border-subtle)] rounded-xl`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(inspection.status)}
                                    <div>
                                        <h3 className="font-black text-[var(--text-primary)]">{inspection.location || inspection.zone}</h3>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-0.5">
                                            Priority: {inspection.priority}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest border ${getStatusBadge(inspection.status)}`}>
                                    {inspection.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>

                            <div className="space-y-1.5 text-sm mb-4">
                                <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
                                    <Calendar size={13} className="text-[var(--text-muted)]" />
                                    <span className="text-xs">Scheduled: {new Date(inspection.scheduled_date).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
                                    <User size={13} className="text-[var(--text-muted)]" />
                                    <span className="text-xs">Assigned to: <span className="font-bold text-[var(--primary)]">{inspection.assigned_officer_name || 'Unassigned'}</span></span>
                                </div>
                                {inspection.description && (
                                    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-[var(--surface-alt)] border border-[var(--border-subtle)]">
                                        <FileText size={12} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-relaxed">{inspection.description}</p>
                                    </div>
                                )}
                            </div>

                            {inspection.status === 'pending' && (
                                <button
                                    onClick={() => handleStartInspection(inspection)}
                                    disabled={submitting}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-[11px] uppercase tracking-widest transition-all shadow-md disabled:opacity-50"
                                >
                                    {submitting ? <Clock size={14} className="animate-spin" /> : <CheckSquare size={14} />} 
                                    {submitting ? 'Starting...' : 'Start Inspection'}
                                </button>
                            )}

                            {inspection.status === 'in_progress' && (
                                <button
                                    onClick={() => {
                                        setSelectedInspection(inspection);
                                        setUpdateForm({
                                            status: 'completed',
                                            findings: inspection.findings || '',
                                            actions_taken: ''
                                        });
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--primary)] hover:opacity-90 text-white font-black text-[11px] uppercase tracking-widest transition-all shadow-md"
                                >
                                    <Wrench size={14} /> Update Findings
                                </button>
                            )}

                            {(inspection.findings || inspection.actions_taken) && (
                                <div className="mt-3 space-y-2">
                                    {inspection.findings && (
                                        <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                                                <FileText size={10} /> Officer Findings
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">{inspection.findings}</p>
                                        </div>
                                    )}
                                    {inspection.actions_taken && (
                                        <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                                                <Wrench size={10} /> Actions Taken
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">{inspection.actions_taken}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Update Inspection Modal */}
            <AnimatePresence>
                {selectedInspection && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedInspection(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-[var(--surface)] rounded-2xl max-w-lg w-full overflow-hidden border border-[var(--border-subtle)] shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header with context */}
                            <div className="p-5 border-b border-[var(--border-subtle)] bg-gradient-to-r from-[var(--primary)]/10 via-[var(--primary)]/5 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-[var(--primary)] rounded-xl text-white shadow-md">
                                        <ClipboardCheck size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight">
                                            {selectedInspection.status === 'pending' ? 'Start Inspection' : 'Update Findings'}
                                        </h2>
                                        <p className="text-[var(--primary)] text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-80">
                                            {selectedInspection.location || selectedInspection.zone}
                                        </p>
                                    </div>
                                </div>

                                {/* Context info strip */}
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                                        <MapPin size={11} />
                                        <span className="text-[10px] font-bold">{selectedInspection.location || selectedInspection.zone}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                                        <User size={11} />
                                        <span className="text-[10px] font-bold">{selectedInspection.assigned_officer_name || 'Unassigned'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Shield size={11} className={
                                            (selectedInspection.priority || '').toLowerCase() === 'critical' ? 'text-red-500' :
                                                (selectedInspection.priority || '').toLowerCase() === 'high' ? 'text-orange-500' : 'text-yellow-500'
                                        } />
                                        <span className={`text-[10px] font-black uppercase ${(selectedInspection.priority || '').toLowerCase() === 'critical' ? 'text-red-500' :
                                            (selectedInspection.priority || '').toLowerCase() === 'high' ? 'text-orange-500' : 'text-yellow-500'
                                            }`}>{selectedInspection.priority}</span>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateInspection} className="p-5 space-y-4">
                                {/* Status row — badge + compact override */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-subtle)]">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">New Status</span>
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest border ${getStatusBadge(updateForm.status)}`}>
                                        {updateForm.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                    <select
                                        value={updateForm.status}
                                        onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                                        className="ml-auto bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[10px] font-black text-[var(--text-muted)] uppercase outline-none cursor-pointer"
                                    >
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                {/* Findings */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                        <FileText size={11} /> Findings
                                    </label>
                                    <textarea
                                        value={updateForm.findings}
                                        onChange={(e) => setUpdateForm({ ...updateForm, findings: e.target.value })}
                                        className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm font-medium outline-none focus:border-[var(--primary)]/60 focus:ring-2 focus:ring-[var(--primary)]/10 transition-all h-24 resize-none"
                                        placeholder="Describe what you found during inspection..."
                                    />
                                </div>

                                {/* Actions Taken */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                        <Wrench size={11} /> Actions Taken
                                    </label>
                                    <textarea
                                        value={updateForm.actions_taken}
                                        onChange={(e) => setUpdateForm({ ...updateForm, actions_taken: e.target.value })}
                                        className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm font-medium outline-none focus:border-[var(--primary)]/60 focus:ring-2 focus:ring-[var(--primary)]/10 transition-all h-24 resize-none"
                                        placeholder="Describe actions taken to address issues..."
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedInspection(null)}
                                        className="flex-1 py-3 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-primary)] font-black text-[11px] uppercase tracking-widest transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--primary)] hover:opacity-90 text-white font-black text-[11px] uppercase tracking-widest shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Send size={14} />
                                        )}
                                        {submitting 
                                            ? 'Processing...' 
                                            : updateForm.status === 'completed'
                                                ? 'Mark Complete'
                                                : selectedInspection?.status === 'pending'
                                                    ? 'Start Inspection'
                                                    : 'Save Update'
                                        }
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Inspections;
