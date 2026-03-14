import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.knowledge_base import KnowledgeBaseArticle
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_knowledge_base():
    """Seed the database with real Knowledge Base articles."""
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=10000,
        tlsAllowInvalidCertificates=True
    )
    db = client[settings.DATABASE_NAME]
    
    await init_beanie(database=db, document_models=[KnowledgeBaseArticle])
    
    logger.info("Checking existing articles...")
    existing = await KnowledgeBaseArticle.find_all().count()
    if existing > 0:
        logger.info(f"Found {existing} articles. Dropping existing articles to re-seed...")
        await KnowledgeBaseArticle.delete_all()

    articles = [
        {
            "title": "Flood Risk Assessment & Water Logging SOP",
            "category": "Emergency Protocol",
            "tags": ["icon:AlertTriangle", "flooding", "monsoon"],
            "content": """
                <div class="space-y-4">
                    <p class="text-[var(--text-secondary)]">Standard Operating Procedure for handling high-risk water logging and flood alerts during monsoon seasons or heavy drainage blockages.</p>
                    <ul class="space-y-4 mt-6">
                        <li class="flex items-start gap-3 bg-[var(--surface-alt)] p-4 rounded-xl border border-amber-500/20">
                            <span class="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs font-black rounded uppercase">Phase 1: Early Warning (Risk {{LOW_MAX_MINUS_1}}-{{LOW_MAX}})</span>
                            <span class="text-[var(--text-primary)] font-medium text-sm">Monitor continuous rainfall data. Identify recurring hotspots in low-lying zones (e.g., specific wards in Kochi or Mumbai). Dispatch preventive drainage clearing tasks.</span>
                        </li>
                        <li class="flex items-start gap-3 bg-[var(--surface-alt)] p-4 rounded-xl border border-orange-500/20">
                            <span class="px-2 py-1 bg-orange-500/20 text-orange-500 text-xs font-black rounded uppercase">Phase 2: Active Logging (Risk {{HIGH_MIN_MINUS_1}}-{{HIGH_MIN}})</span>
                            <span class="text-[var(--text-primary)] font-medium text-sm">Water accumulation exceeding safe limits. Initiate traffic diversions. Deploy emergency pumping units to affected clusters identified by the DBSCAN model.</span>
                        </li>
                        <li class="flex items-start gap-3 bg-[var(--surface-alt)] p-4 rounded-xl border border-rose-500/20">
                            <span class="px-2 py-1 bg-rose-500/20 text-rose-500 text-xs font-black rounded uppercase">Phase 3: Critical Flood (Risk {{HIGH_MIN}}+)</span>
                            <span class="text-[var(--text-primary)] font-medium text-sm">Evacuation protocols activated. Coordination required with state emergency services. Shelter assignments must be updated in the spatial mapping portal.</span>
                        </li>
                    </ul>
                </div>
            """
        },
        {
            "title": "Public Health & Sanitation Hazards",
            "category": "Risk Management",
            "tags": ["icon:Activity", "health", "waste"],
            "content": """
                <div class="space-y-4">
                    <p class="text-[var(--text-secondary)]">Guidelines for mitigating public health crises stemming from civic infrastructure failures, specifically open waste and contaminated water.</p>
                    <div class="mt-4 p-5 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-subtle)] space-y-4">
                        <div>
                            <h4 class="font-bold text-[var(--text-primary)] mb-1">Waste Accumulation Clusters</h4>
                            <p class="text-sm text-[var(--text-secondary)]">Solid waste piling identified via the prediction engine often correlates highly with subsequent vector-borne disease outbreaks (Dengue, Malaria). Immediate sanitation dispatch is required when a waste hotspot persists for >72 hours.</p>
                        </div>
                        <div class="pt-4 border-t border-[var(--border-subtle)]">
                            <h4 class="font-bold text-orange-500 mb-1">Contaminated Water Sources</h4>
                            <p class="text-sm text-[var(--text-secondary)]">If civic reports indicate mixed sewage and drinking water, officers must immediately log a Critical Incident. Water supply in the affected Ward must be suspended until safety tests are passed.</p>
                        </div>
                    </div>
                </div>
            """
        },
        {
            "title": "Structural Integrity & Infrastructure Degradation",
            "category": "Inspections",
            "tags": ["icon:Target", "infrastructure", "safety"],
            "content": """
                <div class="space-y-4">
                    <p class="text-[var(--text-secondary)]">Analyzing historical data to predict and prevent infrastructure collapses, road sinkholes, and bridge failures.</p>
                    <div class="grid grid-cols-1 gap-4 mt-4">
                        <div class="p-4 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-subtle)]">
                            <h4 class="font-bold text-[var(--text-primary)] mb-2">Pothole / Sinkhole Modeling</h4>
                            <p class="text-sm text-[var(--text-secondary)] leading-relaxed">The Civic Risk model cross-references heavy vehicle traffic data with recent weather patterns (heavy rain). High-probability zones must undergo manual "My Inspections" checks weekly by assigned Regional Officers.</p>
                        </div>
                        <div class="p-4 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-subtle)]">
                            <h4 class="font-bold text-[var(--text-primary)] mb-2">Bridge & Flyover Audits</h4>
                            <p class="text-sm text-[var(--text-secondary)] leading-relaxed">Structural anomalies flagged by citizen reports must be escalated to the State Engineering board. Officers are responsible for securing the perimeter if Risk Probability exceeds {{HIGH_MIN}}%.</p>
                        </div>
                    </div>
                </div>
            """
        },
        {
            "title": "Crowd Control & Public Unrest",
            "category": "Event Management",
            "tags": ["icon:ShieldAlert", "crowd", "event"],
            "content": """
                <div class="space-y-4">
                    <p class="text-[var(--text-secondary)]">Procedures for managing high-density public gatherings, festivals, or protests to prevent stampedes and civic disruption.</p>
                    <div class="mt-4 p-5 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-subtle)]">
                        <p class="text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                            When an <strong>Event</strong> is scheduled in the Admin portal, the predictive engine analyzes expected turnout against the physical capacity of the Ward's infrastructure.
                        </p>
                        <ul class="list-disc pl-5 mt-4 space-y-2 text-sm text-[var(--text-primary)] marker:text-[var(--primary)]">
                            <li><strong>Route Mapping:</strong> Ensure emergency vehicle access routes are kept strictly clear.</li>
                            <li><strong>Surveillance:</strong> Activate mobile CCTV units in high-risk choke points identified by the historical Hotspot module.</li>
                            <li><strong>Deployment:</strong> Officers must assign barrier setups and crowd control units 48 hours prior to the event start time via Task Management.</li>
                        </ul>
                    </div>
                </div>
            """
        },
        {
            "title": "Understanding the Predictive AI Model",
            "category": "System Configuration",
            "tags": ["icon:Brain", "ai", "model"],
            "content": """
                <div class="space-y-4">
                    <p class="text-[var(--text-secondary)]">An overview of how the Spatio-Temporal Civic Risk Forecasting engine processes multi-variable data.</p>
                    <div class="mt-4 space-y-3">
                        <div class="p-4 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-subtle)]">
                            <h4 class="font-bold text-[var(--text-primary)] mb-1">DBSCAN Clustering</h4>
                            <p class="text-sm text-[var(--text-secondary)]">Our spatial algorithm identifies dense geographic clusters of recurring civic complaints, filtering out isolated noise to highlight systemic infrastructure failures.</p>
                        </div>
                        <div class="p-4 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-subtle)]">
                            <h4 class="font-bold text-[var(--text-primary)] mb-1">Temporal Forecasting</h4>
                            <p class="text-sm text-[var(--text-secondary)]">Using historical timestamps, the model predicts seasonal spikes (e.g., monsoon flooding, festival overcrowding) allowing Administration to preemptively allocate resources before incidents occur.</p>
                        </div>
                        <div class="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <h4 class="font-bold text-blue-500 mb-1">Feature Importance</h4>
                            <p class="text-sm text-[var(--text-primary)]">Administrators use the Model Config portal to view which factors (Weather, Density, Age of Infrastructure) are currently driving risk probabilities in specific Wards.</p>
                        </div>
                    </div>
                </div>
            """
        }
    ]

    for article_data in articles:
        article = KnowledgeBaseArticle(
            **article_data,
            author_name="System Administrator"
        )
        await article.create()
        logger.info(f"Created article: {article.title}")

    logger.info("Knowledge Base seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_knowledge_base())
