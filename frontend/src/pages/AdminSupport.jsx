import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LifeBuoy,
    MessageSquare,
    Clock,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Send,
    Filter,
    Search
} from 'lucide-react';

export default function AdminSupport() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedTicket, setExpandedTicket] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, open, in_progress, resolved, closed

    // Response state
    const [responseForm, setResponseForm] = useState({
        status: 'in_progress',
        admin_response: ''
    });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/v1/support/tickets');
            setTickets(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch support tickets:', err);
            setError('Could not load support tickets. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTicket = async (ticketId, e) => {
        e.preventDefault();
        try {
            setUpdating(true);
            await api.patch(`/api/v1/support/tickets/${ticketId}`, responseForm);

            // Re-fetch to get updated data
            await fetchTickets();

            // Reset form but keep expanded
            setResponseForm({ status: 'in_progress', admin_response: '' });

        } catch (err) {
            console.error('Failed to update ticket:', err);
            alert('Failed to update ticket. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    const toggleExpand = (ticket) => {
        const ticketId = ticket.id || ticket._id;
        if (expandedTicket === ticketId) {
            setExpandedTicket(null);
        } else {
            setExpandedTicket(ticketId);
            setResponseForm({
                status: ticket.status,
                admin_response: ticket.admin_response || ''
            });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'resolved': return 'bg-green-100 text-green-700 border-green-200';
            case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'text-red-500 bg-red-50 border-red-100';
            case 'medium': return 'text-orange-500 bg-orange-50 border-orange-100';
            case 'low': return 'text-green-500 bg-green-50 border-green-100';
            default: return 'text-slate-500 bg-slate-50 border-slate-100';
        }
    };

    // Filter tickets based on search and status
    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch =
            ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.username.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <LifeBuoy className="text-[var(--primary)] w-8 h-8" /> Support Tickets
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">Manage and respond to officer support requests</p>
                </div>

                {/* Stats Summary */}
                <div className="flex gap-4">
                    <div className="bg-white dark:bg-[var(--card-bg)] px-4 py-2 border border-[var(--border-subtle)] rounded-xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                            {tickets.filter(t => t.status === 'open').length}
                        </div>
                        <span className="text-sm font-bold text-[var(--text-secondary)]">Open</span>
                    </div>
                    <div className="bg-white dark:bg-[var(--card-bg)] px-4 py-2 border border-[var(--border-subtle)] rounded-xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                            {tickets.filter(t => t.status === 'in_progress').length}
                        </div>
                        <span className="text-sm font-bold text-[var(--text-secondary)]">In Progress</span>
                    </div>
                    <div className="bg-white dark:bg-[var(--card-bg)] px-4 py-2 border border-[var(--border-subtle)] rounded-xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                            {tickets.filter(t => t.status === 'resolved').length}
                        </div>
                        <span className="text-sm font-bold text-[var(--text-secondary)]">Resolved</span>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border-subtle)] mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search subject, description, or user..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg text-sm font-medium text-[var(--text-primary)] focus:outline-none cursor-pointer"
                    >
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3 mb-6">
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {/* Ticket List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center p-12 bg-white dark:bg-[var(--card-bg)] rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="mr-3">
                            <Clock size={20} />
                        </motion.div>
                        Loading tickets...
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--border-subtle)] text-center">
                        <CheckCircle className="w-12 h-12 text-[var(--text-muted)] mb-3" />
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">No Tickets Found</h3>
                        <p className="text-[var(--text-secondary)] mt-1 text-sm">You're all caught up on support requests.</p>
                    </div>
                ) : (
                    filteredTickets.map((ticket) => (
                        <div key={ticket.id || ticket._id} className="bg-white dark:bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),_0_4px_16px_-4px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08),_0_12px_32px_-8px_rgba(0,0,0,0.04)] hover:border-[var(--primary)]/40 hover:-translate-y-0.5 group">
                            {/* Ticket Header (Clickable) */}
                            <div
                                onClick={() => toggleExpand(ticket)}
                                className="cursor-pointer p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden"
                            >
                                {/* Subtle hover highlight effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/0 via-[var(--primary)]/5 to-[var(--primary)]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                                <div className="flex-1 relative z-10">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getStatusColor(ticket.status)}`}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getPriorityColor(ticket.priority)}`}>
                                            {ticket.priority} Priority
                                        </span>
                                        <span className="text-xs text-[var(--text-secondary)] font-medium bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                                            {ticket.category}
                                        </span>
                                        <span className="text-xs text-[var(--text-secondary)] font-medium">#{(ticket.id || ticket._id).slice(-6).toUpperCase()}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{ticket.subject}</h3>
                                    <div className="flex items-center gap-2 mt-2 text-sm text-[var(--text-secondary)]">
                                        <span className="font-medium text-[var(--text-primary)]">{ticket.username}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(ticket.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between lg:justify-end gap-4 min-w-[120px]">
                                    {ticket.status === 'resolved' || ticket.status === 'closed' ? null : ticket.admin_response ? (
                                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                                            <CheckCircle size={12} /> Responded
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                            Needs Reply
                                        </span>
                                    )}
                                    <div className="text-[var(--text-secondary)] p-1 bg-[var(--background)] rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                        {expandedTicket === (ticket.id || ticket._id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                            </div>

                            {/* Ticket Expanded Content */}
                            <AnimatePresence>
                                {expandedTicket === (ticket.id || ticket._id) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-[var(--border-subtle)]"
                                    >
                                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Left Col: Original Details */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Original Request</h4>
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-[var(--border-subtle)] rounded-xl whitespace-pre-wrap text-[var(--text-primary)] text-sm leading-relaxed">
                                                        {ticket.description}
                                                    </div>
                                                </div>

                                                {ticket.admin_response && (
                                                    <div>
                                                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Previous Response</h4>
                                                        <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl whitespace-pre-wrap text-[var(--text-primary)] text-sm leading-relaxed italic">
                                                            {ticket.admin_response}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Col: Admin Action */}
                                            <div>
                                                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Admin Action</h4>

                                                {ticket.status === 'resolved' || ticket.status === 'closed' ? (
                                                    <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border border-[var(--border-subtle)] rounded-xl text-center space-y-3">
                                                        <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                                            <CheckCircle size={24} />
                                                        </div>
                                                        <div>
                                                            <h5 className="font-bold text-[var(--text-primary)]">Ticket Resolved</h5>
                                                            <p className="text-sm text-[var(--text-secondary)] mt-1">This ticket has been marked as resolved and can no longer be updated.</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <form onSubmit={(e) => handleUpdateTicket(ticket.id || ticket._id, e)} className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-[var(--border-subtle)] rounded-xl space-y-4">
                                                        <div>
                                                            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Update Status</label>
                                                            <select
                                                                value={responseForm.status}
                                                                onChange={(e) => setResponseForm({ ...responseForm, status: e.target.value })}
                                                                className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer"
                                                            >
                                                                <option value="open">Open</option>
                                                                <option value="in_progress">In Progress</option>
                                                                <option value="resolved">Resolved</option>
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Response Message</label>
                                                            <textarea
                                                                rows={4}
                                                                value={responseForm.admin_response}
                                                                onChange={(e) => setResponseForm({ ...responseForm, admin_response: e.target.value })}
                                                                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)]"
                                                                placeholder="Type a response to the officer..."
                                                            ></textarea>
                                                            <p className="text-xs text-[var(--text-muted)] mt-1">This message will be visible to the user who created the ticket.</p>
                                                        </div>

                                                        <div className="flex justify-end pt-2">
                                                            <button
                                                                type="submit"
                                                                disabled={updating}
                                                                className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-white rounded-lg font-bold text-sm hover:-translate-y-0.5 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                                                            >
                                                                {updating ? 'Saving...' : <><Send size={16} /> Update Ticket</>}
                                                            </button>
                                                        </div>
                                                    </form>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
