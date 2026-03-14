import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Brain, TrendingUp, TrendingDown, Info } from 'lucide-react';
import api from '../services/api';

const ShapExplanation = ({ predictionData }) => {
    const [globalImportance, setGlobalImportance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('global'); // global or individual

    useEffect(() => {
        fetchGlobalImportance();
    }, []);

    const fetchGlobalImportance = async () => {
        try {
            const response = await api.get('/api/v1/analytics/shap/global-importance');
            setGlobalImportance(response.data.data);
        } catch (error) {
            console.error('Failed to fetch SHAP importance:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-slate-400">Loading model explanations...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Brain className="text-purple-500" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Model Explainability
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            SHAP (SHapley Additive exPlanations) analysis
                        </p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('global')}
                    className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'global'
                            ? 'text-purple-600 border-b-2 border-purple-600 dark:text-purple-400 dark:border-purple-400'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Global Feature Importance
                </button>
                {predictionData && (
                    <button
                        onClick={() => setActiveTab('individual')}
                        className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'individual'
                                ? 'text-purple-600 border-b-2 border-purple-600 dark:text-purple-400 dark:border-purple-400'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        Individual Explanation
                    </button>
                )}
            </div>

            {/* Content */}
            {activeTab === 'global' && globalImportance && (
                <GlobalFeatureImportance data={globalImportance} />
            )}

            {activeTab === 'individual' && predictionData && (
                <IndividualExplanation predictionData={predictionData} />
            )}
        </div>
    );
};

const GlobalFeatureImportance = ({ data }) => {
    const { features, top_5_features } = data;

    // Prepare chart data
    const chartData = top_5_features.map(f => ({
        name: f.feature.replace(/_/g, ' '),
        importance: f.importance,
        rank: f.rank
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Info Card */}
            <div className="glass-card p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-start gap-3">
                    <Info className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                        <p className="font-medium mb-1">What is Feature Importance?</p>
                        <p className="text-blue-700 dark:text-blue-300">
                            These values show which factors have the biggest impact on risk predictions across all cases.
                            Higher values mean the feature is more influential in determining risk scores.
                        </p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                    Top 5 Most Important Features
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                        <XAxis type="number" stroke="#64748b" fontSize={12} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            stroke="#64748b"
                            fontSize={12}
                            width={150}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#ffffff',
                                borderColor: '#e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        />
                        <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#8b5cf6" />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Feature List */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                    All Features Ranked by Importance
                </h3>
                <div className="space-y-2">
                    {features.slice(0, 10).map((feature, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-400 w-6">
                                    #{feature.rank}
                                </span>
                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                    {feature.feature.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 rounded-full"
                                        style={{ width: `${(feature.importance / features[0].importance) * 100}%` }}
                                    />
                                </div>
                                <span className="text-sm text-slate-600 dark:text-slate-400 w-16 text-right">
                                    {feature.importance.toFixed(3)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const IndividualExplanation = ({ predictionData }) => {
    const [explanation, setExplanation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExplanation();
    }, [predictionData]);

    const fetchExplanation = async () => {
        try {
            const response = await api.post('/api/v1/analytics/shap/explain', {
                feature_values: predictionData.features || {},
                prediction_score: predictionData.risk_score || 0.5
            });
            setExplanation(response.data.data);
        } catch (error) {
            console.error('Failed to fetch explanation:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center p-8 text-slate-400">Loading explanation...</div>;
    }

    if (!explanation) {
        return <div className="text-center p-8 text-slate-400">No explanation available</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Prediction Summary */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                    Prediction Breakdown
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Base Value</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {(explanation.base_value * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Average prediction
                        </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Final Prediction</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {(explanation.prediction_score * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                            Risk score
                        </p>
                    </div>
                </div>
            </div>

            {/* Feature Contributions */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                    Feature Contributions
                </h3>
                <div className="space-y-3">
                    {explanation.contributions.map((contrib, index) => (
                        <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {contrib.direction === 'positive' ? (
                                        <TrendingUp className="text-green-500" size={16} />
                                    ) : (
                                        <TrendingDown className="text-red-500" size={16} />
                                    )}
                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                        {contrib.feature.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className={`font-bold ${contrib.direction === 'positive'
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                        }`}>
                                        {contrib.contribution > 0 ? '+' : ''}{(contrib.contribution * 100).toFixed(1)}%
                                    </span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Value: {contrib.value}
                                    </p>
                                </div>
                            </div>
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${contrib.direction === 'positive' ? 'bg-green-500' : 'bg-red-500'
                                        }`}
                                    style={{
                                        width: `${Math.abs(contrib.contribution) * 200}%`,
                                        marginLeft: contrib.direction === 'negative' ? 'auto' : '0'
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default ShapExplanation;
