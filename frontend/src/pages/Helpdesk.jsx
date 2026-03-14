import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LifeBuoy,
    HelpCircle,
    MessageSquare,
    Send,
    ChevronRight,
    FileText,
    Search,
    Clock,
    CheckCircle,
    AlertCircle,
    Phone,
    Mail,
    Globe,
    Activity,
    Shield
} from 'lucide-react';

const FAQS = [
    {
        q: "How do I reset my password?",
        a: "Use the 'Forgot Password?' link on the login page. Enter your registered civic email and a secure reset link will be sent to your inbox. The link expires in 15 minutes. If you have access, you can also change your password from the 'My Profile' page.",
        category: "Account"
    },
    {
        q: "I can't see charts for my assigned city.",
        a: "Ensure your jurisdiction is correctly set in your profile. If issues persist, the data sync may be pending for your region.",
        category: "Data"
    },
    {
        q: "What browsers are supported?",
        a: "The Civic Risk Intelligence platform is optimized for modern browsers like Chrome, Firefox, and Edge. Safari (iOS) is also supported.",
        category: "Technical"
    },
    {
        q: "How is risk score calculated?",
        a: "We use a multi-weighted DBSCAN algorithm considering historical incidents, density, and seasonal trends (e.g., monsoon impact).",
        category: "Analytics"
    }
];

export default function Helpdesk() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('faq'); // 'faq' or 'tickets'
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedFaq, setExpandedFaq] = useState(null);
    const [ticketData, setTicketData] = useState({ subject: '', category: 'Technical Bug', description: '' });
    const [showSuccess, setShowSuccess] = useState(false);
    const [systemStatus, setSystemStatus] = useState({
        api: 'checking',
        db: 'checking',
        ml: 'checking'
    });

    const checkSystemHealth = async () => {
        try {
            await api.get('/api/v1/health');
            setSystemStatus({ api: 'Optimal', db: 'Active', ml: 'Nominal' });
        } catch {
            setSystemStatus({ api: 'Degraded', db: 'Unknown', ml: 'Unknown' });
        }
    };


    const filteredFaqs = FAQS.filter(faq =>
        faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'resolved': return 'bg-green-100 text-green-700 border-green-200';
            case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/v1/support/tickets');
            setTickets(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch tickets:', err);
            setError('Could not load your tickets. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'tickets') {
            fetchTickets();
        }
    }, [activeTab]);

    useEffect(() => {
        checkSystemHealth();
    }, []);

    const handleTicketSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.post('/api/v1/support/tickets', ticketData);
            setShowSuccess(true);
            setTicketData({ subject: '', category: 'Technical Bug', description: '' });
            fetchTickets();
            setTimeout(() => setShowSuccess(false), 5000);
        } catch (err) {
            console.error('Failed to submit ticket:', err);
            setError('Failed to submit ticket. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };



    const statusColor = (val) => {
        if (val === 'checking') return 'text-slate-400';
        if (['Optimal', 'Active', 'Nominal'].includes(val)) return 'text-green-500';
        return 'text-red-500';
    };
    const statusDot = (val) => {
        if (val === 'checking') return 'bg-slate-400 animate-pulse';
        if (['Optimal', 'Active', 'Nominal'].includes(val)) return 'bg-green-500';
        return 'bg-red-500 animate-pulse';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen bg-[var(--background)]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <LifeBuoy className="text-[var(--primary)] w-8 h-8" /> Central Helpdesk
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">Technical Support & Intelligence Knowledge Base</p>
                </div>

                <div className="flex bg-[var(--card-bg)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    <button
                        onClick={() => setActiveTab('faq')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'faq' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        Knowledge Base
                    </button>
                    <button
                        onClick={() => setActiveTab('tickets')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'tickets' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        Support Tickets
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="grid lg:grid-cols-3 gap-8">

                {/* Left/Main Column: FAQ search or Ticket form */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'faq' ? (
                        <div className="space-y-6">
                            {/* Search bar */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search knowledge base articles..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl text-[var(--text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all font-medium"
                                />
                            </div>

                            {/* FAQ List */}
                            <div className="space-y-3">
                                {filteredFaqs.map((faq, i) => (
                                    <motion.div
                                        key={i}
                                        layout
                                        className="bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm hover:border-[var(--primary)]/30 transition-colors"
                                    >
                                        <button
                                            onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                                            className="w-full px-6 py-5 flex items-center justify-between text-left group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${expandedFaq === i ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background)] text-[var(--text-secondary)] group-hover:text-[var(--primary)]'}`}>
                                                    <HelpCircle size={18} />
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-1 block opacity-60">{faq.category}</span>
                                                    <h3 className="font-bold text-[var(--text-primary)]">{faq.q}</h3>
                                                </div>
                                            </div>
                                            <ChevronRight className={`w-5 h-5 text-[var(--text-secondary)] transition-transform ${expandedFaq === i ? 'rotate-90 text-[var(--primary)]' : ''}`} />
                                        </button>
                                        <AnimatePresence>
                                            {expandedFaq === i && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                >
                                                    <div className="px-6 pb-6 pt-2 ml-12 border-t border-[var(--border-subtle)]/50">
                                                        <p className="text-[var(--text-secondary)] leading-relaxed">{faq.a}</p>
                                                        <div className="mt-4 flex gap-3">
                                                            <button className="text-xs font-bold text-[var(--primary)] hover:underline">Useful</button>
                                                            <button className="text-xs font-bold text-[var(--text-secondary)] hover:underline">Not Useful</button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Support Tickets Section */
                        <div className="space-y-6">
                            {/* Ticket Submission Form */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl shadow-xl overflow-hidden"
                            >
                                <div className="p-8 border-b border-[var(--border-subtle)] bg-gradient-to-r from-[var(--primary)]/5 to-transparent">
                                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                                        <MessageSquare className="text-[var(--primary)]" /> Submit Support Ticket
                                    </h2>
                                    <p className="text-[var(--text-secondary)] text-sm mt-1">Our technical team typical responds within 4-6 business hours.</p>
                                </div>

                                <form onSubmit={handleTicketSubmit} className="p-8 space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Subject</label>
                                            <input
                                                type="text"
                                                required
                                                value={ticketData.subject}
                                                onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
                                                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                                                placeholder="What's the issue?"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Category</label>
                                            <select
                                                value={ticketData.category}
                                                onChange={(e) => setTicketData({ ...ticketData, category: e.target.value })}
                                                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-[var(--text-primary)] cursor-pointer"
                                            >
                                                <option value="Technical Bug">Technical Bug</option>
                                                <option value="Data Correction">Data Correction</option>
                                                <option value="Feature Request">Feature Request</option>
                                                <option value="Account Access">Account Access</option>
                                                <option value="Analytics Inquiry">Analytics Inquiry</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Detailed Description</label>
                                        <textarea
                                            required
                                            rows={5}
                                            value={ticketData.description}
                                            onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                                            className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                                            placeholder="Please provide as much detail as possible..."
                                        ></textarea>
                                    </div>
                                    <div className="flex items-center justify-between pt-4">
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                            <Clock size={14} /> Average response: 4h
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex items-center gap-2 px-8 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <Send size={18} /> {loading ? 'Sending...' : 'Send Ticket'}
                                        </button>
                                    </div>
                                </form>

                                <AnimatePresence>
                                    {showSuccess && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-green-500 text-white p-4 text-center font-bold flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={18} /> Ticket submitted successfully!
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {/* Ticket History */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <Clock className="text-[var(--primary)]" size={20} /> Your Recent Tickets
                                </h3>

                                {loading && tickets.length === 0 ? (
                                    <div className="py-12 text-center text-[var(--text-secondary)]">Loading tickets...</div>
                                ) : tickets.length === 0 ? (
                                    <div className="py-12 bg-[var(--card-bg)] border border-dashed border-[var(--border-subtle)] rounded-2xl text-center text-[var(--text-secondary)]">
                                        No tickets found. Submit a ticket above if you need help.
                                    </div>
                                ) : (
                                    tickets.map((ticket) => (
                                        <motion.div
                                            key={ticket._id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getStatusColor(ticket.status)}`}>
                                                        {ticket.status.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-[var(--text-secondary)] font-medium">#{ticket._id.slice(-6).toUpperCase()}</span>
                                                    <span className="text-xs text-[var(--text-secondary)]">•</span>
                                                    <span className="text-xs text-[var(--text-secondary)]">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <h4 className="font-bold text-[var(--text-primary)]">{ticket.subject}</h4>
                                                <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-1">{ticket.description}</p>

                                                {ticket.admin_response && (
                                                    <div className="mt-4 p-4 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-xs font-bold text-[var(--primary)] uppercase flex items-center gap-1">
                                                                <Shield size={12} /> Admin Response
                                                            </p>
                                                            {ticket.status === 'resolved' && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-green-100 text-green-700 border border-green-200">
                                                                    <CheckCircle size={10} /> Issue Resolved
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-[var(--text-primary)] leading-relaxed italic border-l-2 border-[var(--primary)] pl-3 ml-1">{ticket.admin_response}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button className="p-2 hover:bg-[var(--background)] rounded-lg text-[var(--text-secondary)] transition-colors">
                                                    <ChevronRight size={20} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar: Quick Contact & Status */}
                <div className="space-y-6">
                    {/* System Status Card */}
                    <div className="bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm">
                        <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-[var(--primary)]" /> System Integrity
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: 'API Services', val: systemStatus.api },
                                { label: 'Data Sync', val: systemStatus.db },
                                { label: 'AI Engines', val: systemStatus.ml },
                            ].map(({ label, val }) => (
                                <div key={label} className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                                    <span className={`text-xs font-bold ${statusColor(val)} flex items-center gap-1`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${statusDot(val)}`}></div>
                                        {val === 'checking' ? '...' : val}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Support Card */}
                    <div className="bg-[var(--primary)] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <AlertCircle size={18} /> Emergency Contact
                        </h3>
                        <p className="text-blue-100 text-sm mb-6 leading-relaxed">For critical system outages affecting field operations only.</p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                    <Phone size={14} />
                                </div>
                                <span className="text-sm font-bold tracking-wider">+91 1800-CIVIC-HELP</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                    <Mail size={14} />
                                </div>
                                <span className="text-sm font-bold">admin@civicrisk.gov.in</span>
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
}
