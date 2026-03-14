import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckSquare, Clock, AlertCircle, Calendar, MapPin,
    CheckCircle2, Search, List, Circle
} from 'lucide-react';
import api from '../services/api';

const TaskManagement = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/v1/tasks');
            setTasks(response.data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskUpdated = (updatedTask) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    };

    const activeCriticalTasks = tasks.filter(task => task.priority === 'Critical' && task.status !== 'completed' && task.status !== 'cancelled');

    const filteredTasks = tasks.filter(task => {
        // Critical tasks handled in top section if pending
        if (task.priority === 'Critical' && task.status !== 'completed' && task.status !== 'cancelled') return false;

        return filter === 'all' || task.status === filter;
    });

    const stats = {
        pending: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length
    };

    // Determine if we should show the standard assignments section
    const showStandardAssignments = loading || filteredTasks.length > 0 || activeCriticalTasks.length === 0;

    return (
        <motion.div
            className="space-y-8 max-w-[1200px] mx-auto pb-12 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header section with cleaner modern layout */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[var(--border-subtle)] pb-6">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                        <CheckSquare className="text-[var(--primary)]" size={28} />
                        My Tasks
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-2 font-medium">
                        Track and manage your operational field assignments
                    </p>
                </div>
            </div>

            {/* Stats section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MiniStatCard icon={Clock} label="Pending Tasks" value={stats.pending} color="amber" />
                <MiniStatCard icon={CheckCircle2} label="Completed Tasks" value={stats.completed} color="emerald" />
            </div>

            {/* Sudden Action Section */}
            {activeCriticalTasks.length > 0 && (
                <div className="space-y-4 mt-8 pb-4 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="text-rose-500" size={24} />
                        <h2 className="text-xl font-black text-rose-500 tracking-tight">Sudden Action Required</h2>
                    </div>
                    <div className="space-y-4">
                        <AnimatePresence mode='popLayout'>
                            {activeCriticalTasks.map(task => (
                                <TaskCard key={task.id} task={task} onUpdated={handleTaskUpdated} />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Task list section */}
            {showStandardAssignments && (
                <div className="space-y-4 mt-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-2 bg-[var(--surface)] p-1.5 rounded-xl border border-[var(--border-subtle)] shadow-sm ml-auto">
                            {['all', 'pending', 'completed'].map((s) => {
                                let activeColor = 'bg-[var(--primary)]';
                                if (s === 'pending') activeColor = 'bg-amber-600';
                                if (s === 'completed') activeColor = 'bg-emerald-600';

                                return (
                                    <button
                                        key={s}
                                        onClick={() => setFilter(s)}
                                        className={`px-4 py-2 rounded-lg text-[13px] font-bold capitalize transition-all ${filter === s
                                            ? `${activeColor} text-white shadow-md`
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)]'
                                            }`}
                                    >
                                        {s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-4 bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] shadow-sm">
                                <div className="w-8 h-8 border-3 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin"></div>
                                <span className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest">Loading Tasks...</span>
                            </div>
                        ) : filteredTasks.length > 0 ? (
                            <AnimatePresence mode='popLayout'>
                                {filteredTasks.map(task => (
                                    <TaskCard key={task.id} task={task} onUpdated={handleTaskUpdated} />
                                ))}
                            </AnimatePresence>
                        ) : (
                            <div className="py-24 text-center text-[var(--text-muted)] bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] shadow-sm flex flex-col items-center justify-center">
                                <div className="p-4 bg-[var(--surface-alt)] rounded-full mb-4">
                                    <List size={32} className="opacity-40" />
                                </div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No tasks found</h3>
                                <p className="text-sm font-medium">You don't have any assignments matching this criteria.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const TaskCard = ({ task, onUpdated }) => {
    const isCompleted = task.status === 'completed';
    const isCancelled = task.status === 'cancelled';
    const isCritical = task.priority === 'Critical';

    const [missionUpdates, setMissionUpdates] = useState('');
    const [actionsTaken, setActionsTaken] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const response = await api.put(`/api/v1/tasks/${task.id}`, {
                status: 'completed',
                notes: missionUpdates,
                actions_taken: actionsTaken
            });
            onUpdated(response.data);
        } catch (error) {
            console.error('Failed to complete task:', error);
            alert(error.response?.data?.detail || 'Failed to complete task');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={`bg-[var(--surface)] w-full rounded-2xl border p-6 transition-all shadow-sm ${isCompleted || isCancelled
                ? 'border-[var(--border-subtle)] opacity-85 grayscale-[0.2]'
                : isCritical
                    ? 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10'
                    : 'border-[var(--border-subtle)]'
                }`}
        >
            <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 mt-1 rounded-full w-8 h-8 flex items-center justify-center transition-all ${isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCancelled
                        ? 'bg-slate-400 text-white'
                        : 'bg-[var(--surface-alt)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                    }`}>
                    {isCompleted ? <CheckCircle2 size={18} /> : isCancelled ? <Circle size={14} /> : <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h4 className={`text-lg font-black tracking-tight ${isCompleted || isCancelled ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                            }`}>
                            {task.title}
                        </h4>

                        <div className="flex gap-2">
                            {isCritical && !isCompleted && !isCancelled && (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider rounded border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                                    <AlertCircle size={10} /> Critical
                                </span>
                            )}
                            {task.event_id && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                    <Calendar size={10} /> Event
                                </span>
                            )}
                        </div>
                    </div>

                    <p className={`text-sm font-medium mb-6 leading-relaxed ${isCompleted || isCancelled ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>
                        {task.description || 'No additional instructions provided for this task.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] bg-[var(--surface-alt)]/50 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)]/50">
                            <MapPin size={14} className={isCompleted || isCancelled ? "" : "text-[var(--primary)]"} />
                            <span className="truncate max-w-[200px]">{task.location || 'Location TBD'}</span>
                        </div>
                        {task.due_date && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] bg-[var(--surface-alt)]/50 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)]/50">
                                <Clock size={14} className={isCompleted || isCancelled ? "" : "text-orange-500"} />
                                <span>{isCompleted ? 'Finished:' : 'Due:'} {new Date(isCompleted ? (task.completed_at || task.updated_at) : task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        )}
                    </div>

                    {/* Inline Form for Pending Tasks */}
                    {!isCompleted && !isCancelled && (
                        <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t-2 border-dashed border-[var(--border-subtle)] space-y-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                        <Search size={14} className="text-[var(--primary)]" /> Mission Updates & Findings
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={missionUpdates}
                                        onChange={(e) => setMissionUpdates(e.target.value)}
                                        className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[var(--text-primary)] text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all resize-none shadow-inner"
                                        placeholder="Record field observations and risk changes..."
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                        <List size={14} className="text-emerald-500" /> Tactical Actions Taken
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={actionsTaken}
                                        onChange={(e) => setActionsTaken(e.target.value)}
                                        className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[var(--text-primary)] text-sm font-medium outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all resize-none shadow-inner"
                                        placeholder="Detailed steps taken to resolve the mission..."
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-8 py-4 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:scale-100"
                                >
                                    {submitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={16} />
                                    )}
                                    {submitting ? 'Submitting Report...' : 'Finalize & Complete Mission'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Display Results for Completed Tasks */}
                    {isCompleted && (task.notes || task.actions_taken) && (
                        <div className="space-y-4 pt-6 mt-6 border-t-2 border-dashed border-[var(--border-subtle)] animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {task.notes && (
                                    <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl relative overflow-hidden group">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-1.5">
                                            <Search size={12} /> Officer Findings
                                        </p>
                                        <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed font-semibold">
                                            "{task.notes}"
                                        </p>
                                    </div>
                                )}
                                {task.actions_taken && (
                                    <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl relative overflow-hidden group">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3 flex items-center gap-1.5">
                                            <List size={12} /> Tactical Execution
                                        </p>
                                        <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed font-semibold">
                                            "{task.actions_taken}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const MiniStatCard = ({ icon: Icon, label, value, color }) => {
    const colorMap = {
        amber: 'text-amber-500',
        emerald: 'text-emerald-500',
        rose: 'text-rose-500'
    };

    return (
        <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
            <div>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{label}</p>
                <p className="text-3xl font-black text-[var(--text-primary)] leading-none">{value}</p>
            </div>
            <div className={`${colorMap[color]} opacity-80 p-3 bg-[var(--surface-alt)] rounded-xl`}>
                <Icon size={24} />
            </div>
        </div>
    );
};

export default TaskManagement;

