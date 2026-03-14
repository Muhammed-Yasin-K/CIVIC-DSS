import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, FileText, X, AlertTriangle, MapPin, CheckSquare, ShieldAlert, BellRing, Target, Activity } from 'lucide-react';
import api from '../services/api';

// Map icon strings from DB tags to actual Lucide components
const ICON_MAP = {
    'icon:AlertTriangle': AlertTriangle,
    'icon:CheckSquare': CheckSquare,
    'icon:MapPin': MapPin,
    'icon:ShieldAlert': ShieldAlert,
    'icon:BellRing': BellRing,
    'icon:Target': Target,
    'icon:Activity': Activity
};

const KnowledgeBase = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeArticle, setActiveArticle] = useState(null);
    const [thresholds, setThresholds] = useState({ lowMax: 39, highMin: 90 });
    const [dbArticles, setDbArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch dynamic risk boundaries
                const res = await api.get('/api/v1/analytics/models/thresholds');
                if (res.data?.risk_thresholds) {
                    setThresholds({
                        lowMax: res.data.risk_thresholds.low_max,
                        highMin: res.data.risk_thresholds.high_min
                    });
                }

                // Fetch live articles from Database
                const articleRes = await api.get('/api/v1/knowledge-base?limit=100');
                setDbArticles(articleRes.data);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // Process articles, replacing threshold tokens with live data
    const articles = dbArticles.map(a => {
        // Find icon tag or default to FileText
        const iconTag = a.tags?.find(t => t.startsWith('icon:'));
        const IconComponent = iconTag && ICON_MAP[iconTag] ? ICON_MAP[iconTag] : FileText;

        // Interpolate live thresholds into HTML content
        let htmlContent = a.content || '';
        if (htmlContent) {
            htmlContent = htmlContent
                .replace(/{{LOW_MAX}}/g, thresholds.lowMax)
                .replace(/{{LOW_MAX_MINUS_1}}/g, thresholds.lowMax - 1)
                .replace(/{{HIGH_MIN}}/g, thresholds.highMin)
                .replace(/{{HIGH_MIN_MINUS_1}}/g, thresholds.highMin - 1);
        }

        return {
            id: a._id,
            title: a.title,
            category: a.category,
            updated: new Date(a.updated_at).toLocaleDateString(),
            icon: IconComponent,
            content: <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        };
    });

    const filteredArticles = articles.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <motion.div
            className="space-y-6 max-w-[1200px] mx-auto px-4 pb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[var(--border-subtle)] pb-6">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                        <BookOpen className="text-[var(--primary)]" size={28} />
                        Intelligence Portal
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-2 font-medium">
                        Platform SOPs, Risk Thresholds, and Operational Guidelines
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search protocols & guides..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-medium text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {filteredArticles.map((article) => {
                    const Icon = article.icon;
                    return (
                        <motion.div
                            key={article.id}
                            layoutId={`card-${article.id}`}
                            onClick={() => setActiveArticle(article)}
                            className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-subtle)] group-hover:scale-110 transition-transform">
                                    <Icon className="text-[var(--primary)]" size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-black text-[var(--text-primary)] mb-1 truncate">{article.title}</h3>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="px-2 py-0.5 bg-[var(--surface-alt)] text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider rounded border border-[var(--border-subtle)]">
                                            {article.category}
                                        </span>
                                        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">{article.updated}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Modal for viewing the article */}
            <AnimatePresence>
                {activeArticle && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setActiveArticle(null)}
                    >
                        <motion.div
                            layoutId={`card-${activeArticle.id}`}
                            className="bg-[var(--surface)] w-full max-w-[800px] max-h-[85vh] rounded-3xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setActiveArticle(null)}
                                className="absolute top-6 right-6 p-2 rounded-full bg-[var(--surface-alt)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors z-10"
                            >
                                <X size={20} />
                            </button>

                            <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--surface-alt)]/30 pr-20">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-[var(--surface)] rounded-xl border border-[var(--border-subtle)] shadow-sm">
                                        {activeArticle.icon && <activeArticle.icon className="text-[var(--primary)]" size={28} />}
                                    </div>
                                    <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{activeArticle.title}</h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 text-xs font-bold uppercase tracking-wider rounded">
                                        {activeArticle.category}
                                    </span>
                                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">{activeArticle.updated}</span>
                                </div>
                            </div>

                            <div className="p-8 overflow-y-auto">
                                {activeArticle.content}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
    );
};

export default KnowledgeBase;
