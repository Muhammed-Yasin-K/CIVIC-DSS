import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ClipboardCheck, User, MapPin, Clock,
    AlertCircle, CheckCircle, XCircle, BarChart3, Search
} from 'lucide-react';
import api from '../services/api';

const STATUS = {
    pending: { label: 'Pending', cls: 'text-blue-500   bg-blue-500/10   border-blue-500/25', Icon: Clock },
    in_progress: { label: 'In Progress', cls: 'text-amber-500  bg-amber-500/10  border-amber-500/25', Icon: AlertCircle },
    completed: { label: 'Completed', cls: 'text-green-500  bg-green-500/10  border-green-500/25', Icon: CheckCircle },
    cancelled: { label: 'Cancelled', cls: 'text-red-500    bg-red-500/10    border-red-500/25', Icon: XCircle },
};

const PRIORITY_BAR = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
};

const PRIORITY_BADGE = {
    critical: 'text-red-600    dark:text-red-400    bg-red-500/10    border-red-500/25',
    high: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/25',
    medium: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
    low: 'text-blue-600   dark:text-blue-400   bg-blue-500/10   border-blue-500/25',
};

const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const AdminInspections = () => {
    const [inspections, setInspections] = useState([]);
    const [stats, setStats] = useState(null);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.allSettled([
            api.get('/api/v1/inspections/'),
            api.get('/api/v1/inspections/stats'),
        ]).then(([a, b]) => {
            if (a.status === 'fulfilled') setInspections(a.value.data || []);
            if (b.status === 'fulfilled') setStats(b.value.data);
        }).finally(() => setLoading(false));
    }, []);

    const matchesSearch = (i, s) => {
        if (!s) return true;
        return (i.assigned_officer_name || '').toLowerCase().includes(s) ||
            (i.location || '').toLowerCase().includes(s) ||
            (i.zone || '').toLowerCase().includes(s);
    };

    const searchFiltered = inspections.filter(i => matchesSearch(i, searchTerm.toLowerCase()));
    const finalFiltered = searchFiltered.filter(i => filter === 'all' || i.status === filter);

    // Dynamic counts for buttons based on search
    const counts = {
        all: searchFiltered.length,
        pending: searchFiltered.filter(i => i.status === 'pending').length,
        in_progress: searchFiltered.filter(i => i.status === 'in_progress').length,
        completed: searchFiltered.filter(i => i.status === 'completed').length,
        cancelled: searchFiltered.filter(i => i.status === 'cancelled').length,
    };

    const byOfficer = finalFiltered.reduce((acc, i) => {
        const key = i.assigned_officer_name || 'Unassigned';
        if (!acc[key]) acc[key] = [];
        acc[key].push(i);
        return acc;
    }, {});

    const completionOf = (items) => {
        const total = items.length;
        const done = items.filter(i => i.status === 'completed').length;
        return total ? Math.round((done / total) * 100) : 0;
    };

    return (
        <div className="space-y-7 max-w-[1050px] mx-auto">

            {/* ── Header ── */}
            <div className="flex items-start justify-between border-b border-[var(--border-subtle)] pb-5">
                <div>
                    <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                            <ClipboardCheck size={20} className="text-[var(--primary)]" />
                        </div>
                        Inspection Management
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1.5 ml-12 font-medium">
                        Field officer activity — findings &amp; actions
                    </p>
                </div>
            </div>

            {/* ── Filter Tabs & Search ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-2 flex-wrap">
                    {[
                        { id: 'all', label: 'All', count: counts.all, active: 'bg-gray-600  border-gray-600  shadow-lg shadow-gray-600/20' },
                        { id: 'pending', label: 'Pending', count: counts.pending, active: 'bg-amber-500 border-amber-500 shadow-lg shadow-amber-500/20' },
                        { id: 'in_progress', label: 'In Progress', count: counts.in_progress, active: 'bg-blue-500  border-blue-500  shadow-lg shadow-blue-500/20' },
                        { id: 'completed', label: 'Completed', count: counts.completed, active: 'bg-green-500 border-green-500 shadow-lg shadow-green-500/20' },
                        { id: 'cancelled', label: 'Cancelled', count: counts.cancelled, active: 'bg-red-500   border-red-500   shadow-lg shadow-red-500/20' },
                    ].map(s => (
                        <button
                            key={s.id}
                            onClick={() => setFilter(s.id)}
                            className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200 ${filter === s.id
                                ? `${s.active} text-white shadow-lg`
                                : 'bg-[var(--surface-alt)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--primary)]/40'
                                }`}
                        >
                            <span>{s.label}</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] transition-colors ${filter === s.id
                                ? 'bg-white/20 text-white'
                                : 'bg-[var(--border-subtle)] text-[var(--text-muted)] group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]'
                                }`}>
                                {s.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                    <input
                        type="text"
                        placeholder="Search by officer, ward or zone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:border-[var(--primary)] outline-none transition-all"
                    />
                </div>
            </div>

            {/* ── Officer Groups ── */}
            {loading ? (
                <div className="text-center py-16 text-[var(--text-muted)]">
                    <Clock className="mx-auto mb-3 animate-spin text-[var(--primary)]" size={28} />
                    <p className="text-xs font-bold uppercase tracking-widest">Loading...</p>
                </div>
            ) : Object.keys(byOfficer).length === 0 ? (
                <div className="text-center py-20 glass-panel rounded-3xl border border-[var(--border-subtle)] flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] flex items-center justify-center mb-4">
                        <ClipboardCheck size={28} className="text-[var(--text-muted)] opacity-20" />
                    </div>
                    <p className="text-[var(--text-primary)] font-black text-lg">No {filter !== 'all' ? filter.replace('_', ' ') : ''} inspections found</p>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Try adjusting your search or filters to see more results.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {Object.entries(byOfficer).map(([officer, items], gi) => {
                        const rate = completionOf(items);
                        return (
                            <motion.div
                                key={officer}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: gi * 0.06 }}
                                className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--surface)]"
                            >
                                {/* Officer Header */}
                                <div className="px-5 py-3.5 flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-alt)]/40">
                                    <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-[11px] font-black shrink-0">
                                        {officer === 'Unassigned' ? <User size={14} /> : initials(officer)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-[var(--text-primary)] text-sm leading-none">{officer}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">
                                            {items.length} inspection{items.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    {/* Completion bar */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="w-20 h-1.5 rounded-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${rate >= 80 ? 'bg-green-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                                                style={{ width: `${rate}%` }}
                                            />
                                        </div>
                                        <span className={`text-[10px] font-black ${rate >= 80 ? 'text-green-500' : rate >= 40 ? 'text-amber-500' : 'text-red-400'}`}>
                                            {rate}%
                                        </span>
                                    </div>
                                </div>

                                {/* Inspection Rows */}
                                <div className="divide-y divide-[var(--border-subtle)]">
                                    {items.map((insp) => {
                                        const sm = STATUS[insp.status] || STATUS.pending;
                                        const pri = (insp.priority || 'low').toLowerCase();
                                        const StatusIcon = sm.Icon;
                                        return (
                                            <div key={insp.id} className="flex gap-0">
                                                {/* Priority accent bar */}
                                                <div className={`w-1 shrink-0 ${PRIORITY_BAR[pri] || 'bg-blue-500'}`} />

                                                <div className="flex-1 px-5 py-4">
                                                    {/* Row top */}
                                                    <div className="flex items-center gap-2 flex-wrap mb-3">
                                                        <MapPin size={13} className="text-[var(--text-muted)] shrink-0" />
                                                        <span className="font-black text-[var(--text-primary)] text-sm">{insp.location || insp.zone}</span>
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase ${PRIORITY_BADGE[pri] || PRIORITY_BADGE.low}`}>
                                                            {insp.priority}
                                                        </span>
                                                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black border ${sm.cls}`}>
                                                            <StatusIcon size={10} /> {sm.label}
                                                        </span>
                                                        <span className="ml-auto text-[10px] text-[var(--text-muted)] font-medium">
                                                            {new Date(insp.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>

                                                    {/* Findings + Actions */}
                                                    {(insp.findings || insp.actions_taken) ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {insp.findings && (
                                                                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-blue-500 mb-1.5">Officer Findings</p>
                                                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{insp.findings}</p>
                                                                </div>
                                                            )}
                                                            {insp.actions_taken && (
                                                                <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/15">
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-green-500 mb-1.5">Actions Taken</p>
                                                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{insp.actions_taken}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-[var(--text-muted)] italic">Awaiting officer findings...</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminInspections;
