import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Trash2, Save, X, ShieldAlert, Target, Building, MapPin, AlertCircle, Send, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

const REGIONS = ["North", "South-West", "South-East", "West", "East"];

const REGION_OFFICERS = {
    "North": "Rajesh Kumar",
    "South-West": "Arjun Nair",
    "South-East": "Karthik S.",
    "West": "Vikram Shah",
    "East": "Ananya Bose"
};

const EventManagement = () => {
    const { isAdmin, isOfficer, role } = usePermissions();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        region: 'North',
        officer_assigned: REGION_OFFICERS['North'],
        ward: '',
        place: '',
        priority: 'normal',
        description: '',
        auto_deploy: true // Default to true for "officer automate to deploy"
    });
    const [officerUsers, setOfficerUsers] = useState([]);
    const [isDeploying, setIsDeploying] = useState(false);


    useEffect(() => {
        if (role && !isAdmin && !isOfficer) {
            navigate('/');
        }
    }, [isAdmin, isOfficer, role, navigate]);

    useEffect(() => {
        fetchEvents();
        fetchOfficers();
    }, []);

    const fetchOfficers = async () => {
        try {
            // Since we need IDs for deployment, fetch all officer users
            const response = await api.get('/api/v1/users?role=officer');
            // Check if response has 'users' property as per /api/v1/users endpoint
            const users = response.data.users || response.data;
            setOfficerUsers(users);
        } catch (error) {
            console.error('Failed to fetch officer users:', error);
        }
    };

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/v1/events/');
            setEvents(response.data);
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsDeploying(true);
            const { auto_deploy, ...restFormData } = formData;
            const eventData = {
                ...restFormData,
                start_date: `${formData.start_date}T00:00:00`,
                end_date: `${formData.end_date}T23:59:59`,
                risk_multiplier: 1.0,
                zones_affected: [formData.ward, formData.place].filter(i => i.trim() !== '')
            };

            delete eventData.ward;
            delete eventData.place;

            const response = await api.post('/api/v1/events/', eventData);
            const savedEvent = response.data;

            // Always auto-deploy task for new events
            try {
                console.log('Deploying task for event:', savedEvent.id || savedEvent._id);
                // Map the region directly to the correct officer username based on seed_users.py
                const regionOfficerMap = {
                    "North": "off_north",
                    "South-West": "off_south_west",
                    "South-East": "off_south_east",
                    "West": "off_west",
                    "East": "off_east"
                };

                const targetUsername = regionOfficerMap[savedEvent.region];
                const officer = (officerUsers || []).find(u => u.username === targetUsername);

                if (!officer) {
                    console.warn('No matching officer found in system for username:', targetUsername);
                }

                const taskPayload = {
                    title: `Deployed Mission: ${savedEvent.name}`,
                    description: savedEvent.description ? `${savedEvent.description}` : `Strategic field operation at ${savedEvent.zones_affected?.[1] || 'event location'}.`,
                    priority: savedEvent.priority === 'sudden_action' ? 'Critical' : 'Medium',
                    due_date: `${savedEvent.start_date.split('T')[0]}T09:00:00Z`,
                    location: `${savedEvent.region} — ${savedEvent.zones_affected?.[0] || 'TBD'}`,
                    event_id: String(savedEvent.id || savedEvent._id || ''),
                    assigned_to: officer ? String(officer.id || officer._id) : '',
                    status: 'pending'
                };

                console.log('Task Payload:', taskPayload);
                await api.post('/api/v1/tasks', taskPayload);
                console.log('Automated task deployment successful');
            } catch (taskError) {
                console.error('Failed to auto-deploy task:', taskError);
                const errorMsg = taskError.response?.data?.detail
                    ? (typeof taskError.response.data.detail === 'string'
                        ? taskError.response.data.detail
                        : JSON.stringify(taskError.response.data.detail))
                    : taskError.message;
                alert(`Event registered, but mission deployment failed: ${errorMsg}`);
            }

            setShowForm(false);
            resetForm();
            fetchEvents();
            alert('Event registered and mission automatically assigned to officer!');
        } catch (error) {
            console.error('Failed to save event:', error);
            alert('Failed to save event.');
        } finally {
            setIsDeploying(false);
        }
    };

    const handleDelete = async (eventId) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return;
        try {
            await api.delete(`/api/v1/events/${eventId}`);
            fetchEvents();
        } catch (error) {
            console.error('Failed to delete event:', error);
            alert('Failed to delete event');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            start_date: '',
            end_date: '',
            region: 'North',
            officer_assigned: REGION_OFFICERS['North'],
            ward: '',
            place: '',
            priority: 'normal',
            description: '',
            auto_deploy: true
        });
    };


    if (!isAdmin && !isOfficer) return null;

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto pb-12 px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[var(--border-subtle)] pb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 text-[var(--text-primary)]">
                        <Calendar size={24} className="text-[var(--primary)]" />
                        Event Management
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Register and manage events for field officers
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => {
                            resetForm();
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-[var(--primary-rgb)]/20"
                    >
                        <Plus size={18} />
                        Add New Event
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <div className="w-10 h-10 border-3 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin"></div>
                    <p className="text-xs font-medium text-[var(--text-muted)]">Loading events...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-[var(--surface)] rounded-2xl border ${event.priority === 'sudden_action' ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-[var(--border-subtle)]'} p-6 transition-all hover:shadow-xl flex flex-col relative overflow-hidden`}
                        >
                            {event.priority === 'sudden_action' && (
                                <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1.5">
                                    <AlertCircle size={10} />
                                    Sudden Action
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <h3 className={`text-lg font-bold ${event.priority === 'sudden_action' ? 'text-red-700' : 'text-[var(--text-primary)]'} line-clamp-1`}>{event.name}</h3>
                            </div>

                            <p className="text-sm text-[var(--text-secondary)] mb-6 line-clamp-2 min-h-[2.5rem]">
                                {event.description || 'No additional details provided.'}
                            </p>

                            <div className="mt-auto space-y-3 bg-[var(--surface-alt)] p-4 rounded-xl border border-[var(--border-subtle)]/50">
                                <div className="grid grid-cols-2 gap-4 border-b border-[var(--border-subtle)]/30 pb-3">
                                    <div>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Region</p>
                                        <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mt-0.5">
                                            <Building size={12} className="text-indigo-500" /> {event.region}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Officer In-Charge</p>
                                        <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mt-0.5 truncate">
                                            <ShieldAlert size={12} className="text-blue-500" /> {event.officer_assigned || 'Unassigned'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                                        <Calendar size={14} className="text-[var(--primary)]" />
                                        <span>{new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                                            <Target size={14} className="text-emerald-500" />
                                            <span className="truncate">Ward: {event.zones_affected?.[0] || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                                            <MapPin size={14} className="text-rose-500" />
                                            <span className="truncate">Place: {event.zones_affected?.[1] || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => handleDelete(event.id)}
                                        className="flex-1 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 text-red-600 rounded-xl py-2 text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={12} />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ))}

                    {!loading && events.length === 0 && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center bg-[var(--surface-alt)]/30 border-2 border-dashed border-[var(--border-subtle)] rounded-3xl text-center">
                            <Calendar size={48} className="text-[var(--primary)] opacity-20 mb-4" />
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">No Events Found</h3>
                            <p className="text-[var(--text-muted)] text-sm max-w-xs mx-auto mt-1">
                                Registered events will appear here for officer tracking.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Event Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[var(--surface)] p-8 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-subtle)] shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                { 'Register New Event' }
                            </h2>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-[var(--surface-alt)] rounded-full transition-colors">
                                <X size={20} className="text-[var(--text-muted)]" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                                    Event Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-medium outline-none focus:border-[var(--primary)] transition-all"
                                    placeholder="e.g., Summer Festival"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-medium outline-none focus:border-[var(--primary)] transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-medium outline-none focus:border-[var(--primary)] transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                                        Select Region
                                    </label>
                                    <select
                                        value={formData.region}
                                        onChange={(e) => {
                                            const newRegion = e.target.value;
                                            setFormData({
                                                ...formData,
                                                region: newRegion,
                                                officer_assigned: REGION_OFFICERS[newRegion]
                                            });
                                        }}
                                        className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-medium outline-none focus:border-[var(--primary)] transition-all"
                                    >
                                        {REGIONS.map(reg => (
                                            <option key={reg} value={reg}>{reg}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                                        Priority Level
                                    </label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className={`w-full border rounded-xl px-4 py-3 font-bold outline-none transition-all ${formData.priority === 'sudden_action'
                                            ? 'bg-red-50 border-red-500 text-red-700'
                                            : 'bg-[var(--surface-alt)] border-[var(--border-subtle)] text-[var(--text-primary)]'
                                            }`}
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="sudden_action">Sudden Action</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                                        Automated Officer In-Charge
                                    </label>
                                    <div className="w-full bg-[var(--surface-alt)]/50 border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-bold flex items-center gap-2">
                                        <ShieldAlert size={16} className="text-blue-500" />
                                        {formData.officer_assigned}
                                        <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase tracking-tighter ml-auto">Region Bound</span>
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <div className="w-full bg-[var(--surface-alt)]/50 border border-indigo-500/30 rounded-xl px-4 py-3 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                        Mission Auto-Deployment Active
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                                        Ward Number / ID
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.ward}
                                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                        className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-medium outline-none focus:border-[var(--primary)] transition-all"
                                        placeholder="e.g., Ward 12"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                                        Specific Place / Venue
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.place}
                                        onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                                        className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-medium outline-none focus:border-[var(--primary)] transition-all"
                                        placeholder="e.g., Main Square Park"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                                    Additional Info
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-medium outline-none focus:border-[var(--primary)] transition-all h-24 resize-none text-sm"
                                    placeholder="Enter event details"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="submit" 
                                    disabled={isDeploying}
                                    className="flex-1 bg-[var(--primary)] text-white rounded-xl py-3 text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isDeploying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                                    {isDeploying ? 'Deploying...' : 'Create Event'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 bg-[var(--surface-alt)] text-[var(--text-primary)] rounded-xl py-3 text-sm font-bold hover:bg-[var(--border-subtle)] transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div >
                </div >
            )}

        </div >
    );
};

export default EventManagement;
