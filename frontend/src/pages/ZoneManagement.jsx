import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Map, Users, Building, Plus, Search,
    Edit2, Trash2, X, AlertCircle, Save,
    Globe, TrendingUp
} from 'lucide-react';
import api from '../services/api';

const REGIONS = ["North", "South-West", "South-East", "West", "East"];

const ZoneManagement = () => {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [regionFilter, setRegionFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedZone, setSelectedZone] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        city: '',
        region: 'West',
        ward_id: '',
        population: 0,
        area_sq_km: 0,
        description: '',
        risk_level_override: null
    });

    useEffect(() => {
        fetchZones();
    }, []);

    const fetchZones = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/v1/zones');
            setZones(response.data);
        } catch (error) {
            console.error('Error fetching zones:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (mode, zone = null) => {
        setModalMode(mode);
        if (mode === 'edit' && zone) {
            setSelectedZone(zone);
            setFormData({
                name: zone.name,
                city: zone.city,
                region: zone.region,
                ward_id: zone.ward_id || '',
                population: zone.population || 0,
                area_sq_km: zone.area_sq_km || 0,
                description: zone.description || '',
                risk_level_override: zone.risk_level_override || null
            });
        } else {
            setFormData({
                name: '',
                city: '',
                region: 'West',
                ward_id: '',
                population: 0,
                area_sq_km: 0,
                description: '',
                risk_level_override: null
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (modalMode === 'create') {
                await api.post('/api/v1/zones', formData);
            } else {
                await api.put(`/api/v1/zones/${selectedZone.id}`, formData);
            }
            setShowModal(false);
            fetchZones();
        } catch (error) {
            console.error('Error saving zone:', error);
            alert(error.response?.data?.detail || 'Failed to save zone');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this zone? This action is irreversible.')) return;
        try {
            await api.delete(`/api/v1/zones/${id}`);
            fetchZones();
        } catch (error) {
            console.error('Error deleting zone:', error);
        }
    };

    const filteredZones = zones.filter(z => {
        const matchesSearch = z.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            z.city.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRegion = regionFilter === 'all' || z.region === regionFilter;
        return matchesSearch && matchesRegion;
    });

    const stats = {
        total: zones.length,
        wards: zones.filter(z => z.ward_id).length,
        population: zones.reduce((acc, z) => acc + (z.population || 0), 0),
        criticalRisk: zones.filter(z => z.risk_level_override === 'CRITICAL').length
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10 px-4">
            {/* Professional Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
                <div>
                    <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                        <MapPin className="text-blue-600" size={28} />
                        Zone Management
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-1 font-medium">
                        Configure geographic boundaries and administrative metadata
                    </p>
                </div>

                <button
                    onClick={() => handleOpenModal('create')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all shadow-sm active:scale-95"
                >
                    <Plus size={18} />
                    Add New Zone
                </button>
            </div>

            {/* Statistics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Zones', val: stats.total, icon: Map, color: 'blue' },
                    { label: 'Active Wards', val: stats.wards, icon: Building, color: 'indigo' },
                    { label: 'Total Population', val: (stats.population / 1000000).toFixed(1) + 'M', icon: Users, color: 'emerald' },
                    { label: 'Critical Risk Zones', val: stats.criticalRisk, icon: AlertCircle, color: 'rose' }
                ].map((stat, i) => (
                    <div key={i} className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border-subtle)] shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg bg-${stat.color}-500/10`}>
                                <stat.icon size={20} className={`text-${stat.color}-600`} />
                            </div>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{stat.label}</h3>
                        </div>
                        <p className="text-3xl font-black text-[var(--text-primary)]">{stat.val}</p>
                    </div>
                ))}
            </div>

            {/* Content Registry */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-sm">
                <div className="p-5 border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--surface-alt)]/30">
                    <div className="flex-1 relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <input
                            type="text"
                            placeholder="Find zone or city..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mr-2">Region:</span>
                        {['all', ...REGIONS].map(r => (
                            <button
                                key={r}
                                onClick={() => setRegionFilter(r)}
                                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all border ${regionFilter === r
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-[var(--background)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--surface-alt)]'
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--surface-alt)]/50 border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                <th className="px-6 py-4">Zone / Ward</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Population</th>
                                <th className="px-6 py-4">Risk Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="py-20 text-center animate-pulse text-[var(--text-muted)] font-bold text-sm">
                                        Synchronizing records...
                                    </td>
                                </tr>
                            ) : filteredZones.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-20 text-center text-[var(--text-muted)] font-medium text-sm">
                                        No registered zones found
                                    </td>
                                </tr>
                            ) : filteredZones.map((zone) => (
                                <tr key={zone.id} className="hover:bg-[var(--surface-alt)]/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="text-sm font-bold text-[var(--text-primary)]">
                                                {zone.name}
                                            </div>
                                            <div className="text-[11px] text-[var(--text-muted)] font-medium">
                                                {zone.ward_id ? `Ward ID: ${zone.ward_id}` : 'Main District'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-[var(--text-secondary)] font-medium">
                                            {zone.city}
                                        </div>
                                        <div className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                                            {zone.region}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-[var(--text-primary)]">
                                            {zone.population.toLocaleString()}
                                        </div>
                                        <div className="text-[11px] text-[var(--text-muted)]">
                                            {zone.area_sq_km ? `${zone.area_sq_km} km²` : '-- Area'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {zone.risk_level_override ? (
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${zone.risk_level_override === 'CRITICAL'
                                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50'
                                                : zone.risk_level_override === 'HIGH'
                                                    ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/50'
                                                    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50'
                                                }`}>
                                                {zone.risk_level_override}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] font-medium text-[var(--text-muted)] italic">Dynamic</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleOpenModal('edit', zone)}
                                                className="p-2 rounded-md hover:bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-blue-600 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(zone.id)}
                                                className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 text-[var(--text-muted)] hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Management Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="relative w-full max-w-xl bg-[var(--surface)] rounded-xl border border-[var(--border-strong)] shadow-2xl overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-alt)]/30">
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                    {modalMode === 'create' ? 'Add New Zone' : 'Edit Zone Parameters'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-1 hover:bg-[var(--surface-alt)] rounded-lg transition-colors text-[var(--text-muted)]"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider ml-1">Zone Name</label>
                                        <input
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                                            placeholder="e.g. Bandra West"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider ml-1">City</label>
                                        <input
                                            required
                                            value={formData.city}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                                            placeholder="e.g. Mumbai"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider ml-1">Region</label>
                                        <select
                                            value={formData.region}
                                            onChange={e => setFormData({ ...formData, region: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                                        >
                                            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider ml-1">Ward ID</label>
                                        <input
                                            value={formData.ward_id}
                                            onChange={e => setFormData({ ...formData, ward_id: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                                            placeholder="e.g. W-124"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider ml-1">Population</label>
                                        <input
                                            type="number"
                                            value={formData.population}
                                            onChange={e => setFormData({ ...formData, population: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider ml-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm min-h-[80px] resize-none"
                                        placeholder="Add administrative notes or specific risk factors..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-6 py-3 bg-[var(--surface-alt)] hover:bg-[var(--border-strong)] text-[var(--text-primary)] font-bold text-sm rounded-lg transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                Save Settings
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ZoneManagement;
