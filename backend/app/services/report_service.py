"""Report generation service"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.report import Report, ReportType, ReportFormat, ReportStatus
from app.models.prediction import Prediction
from app.models.alert import Alert
from app.models.inspection import Inspection
from app.models.event import Event
from app.models.task import Task
from app.utils.date_utils import calculate_time_difference
import logging
import pandas as pd
import io
import sys

try:
    from fpdf import FPDF
    FPDF_AVAILABLE = True
except ImportError:
    FPDF_AVAILABLE = False

logger = logging.getLogger(__name__)


class ReportService:
    """Report generation service"""
    
    @staticmethod
    async def generate_report(
        title: str,
        report_type: ReportType,
        start_date: datetime,
        end_date: datetime,
        zones: Optional[List[str]] = None,
        categories: Optional[List[str]] = None,
        generated_by: Optional[str] = None,
        region: Optional[str] = None
    ) -> Report:
        """Generate a new report"""
        report = Report(
            title=title,
            report_type=report_type,
            start_date=start_date,
            end_date=end_date,
            zones=zones or [],
            categories=categories or [],
            generated_by=generated_by,
            status=ReportStatus.GENERATING
        )
        if region:
            report.data["region"] = region
        
        await report.insert()
        
        try:
            # Generate report data
            report_data = await ReportService._generate_report_data(
                report_type, start_date, end_date, zones, categories, region
            )
            
            report.data = report_data
            report.total_events = report_data.get("total_events", 0)
            report.total_alerts = report_data.get("total_alerts", 0)
            report.total_tasks = report_data.get("total_tasks", 0)
            report.total_inspections = report_data.get("total_inspections", 0)
            
            report.high_risk_areas = report_data.get("high_risk_areas", [])
            report.hotspots_detected = report_data.get("hotspots_detected", 0)
            report.average_risk_score = report_data.get("average_risk_score")
            report.trends = report_data.get("trends", {})
            report.predictions = report_data.get("predictions", {})
            
            # Generate file if format is CSV
            if report.format == ReportFormat.CSV:
                csv_data = await ReportService.generate_csv_export(report)
                # In a real app, we'd save to S3/Local storage. 
                # For this implementation, we'll store small CSV content in 'data' or similar, 
                # but better to provide a dedicated export endpoint that generates it on the fly.
                pass

            report.status = ReportStatus.COMPLETED
            report.completed_at = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"Failed to generate report: {e}", exc_info=True)
            report.status = ReportStatus.FAILED
            report.error_message = str(e)
        
        await report.save()
        return report
    
    @staticmethod
    async def _generate_report_data(
        report_type: ReportType,
        start_date: datetime,
        end_date: datetime,
        zones: Optional[List[str]],
        categories: Optional[List[str]],
        region: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate report data based on type"""
        # Build query for time period
        time_query = {
            "created_at": {"$gte": start_date, "$lte": end_date}
        }
        
        # Geographic region → city expansion (Synced with HotspotService)
        REGIONS_MAP = {
            "North": ["Delhi", "Shimla", "Jaipur", "Prayagraj"],
            "South-West": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kochi", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
            "South-East": ["Bengaluru", "Chennai", "Hyderabad"],
            "West": ["Ahmedabad", "Indore", "Mumbai", "Panaji", "Pune"],
            "East": ["Kolkata"],
        }

        # Build spatial query
        spatial_query = {}
        if region and region != "All":
            expanded_zones = REGIONS_MAP.get(region, [])
            if expanded_zones:
                zone_regex = "|".join(expanded_zones)
                spatial_query["zone"] = {"$regex": zone_regex, "$options": "i"}
        elif zones:
            expanded_zones = []
            for z in zones:
                if z in REGIONS_MAP:
                    expanded_zones.extend(REGIONS_MAP[z])
                else:
                    expanded_zones.append(z)
            
            # Use regex to match city names in "Ward_X, City" format
            zone_regex = "|".join(expanded_zones)
            spatial_query["zone"] = {"$regex": zone_regex, "$options": "i"}
        
        # Build category query (for events)
        category_query = {}
        if categories:
            category_query["category"] = {"$in": categories}

        # Fetch counts
        total_events = await Event.find({**time_query, **spatial_query, **category_query}).count()
        total_alerts = await Alert.find({**time_query, **spatial_query}).count()
        total_tasks = await Task.find({**time_query}).count() 
        total_inspections = await Inspection.find({**time_query, **spatial_query}).count()
        
        # More granular stats
        alert_severity_counts = {
            "critical": await Alert.find({**time_query, **spatial_query, "severity": "critical"}).count(),
            "warning": await Alert.find({**time_query, **spatial_query, "severity": "warning"}).count(),
            "info": await Alert.find({**time_query, **spatial_query, "severity": "info"}).count()
        }

        inspection_status_counts = {
            "completed": await Inspection.find({**time_query, **spatial_query, "status": "completed"}).count(),
            "pending": await Inspection.find({**time_query, **spatial_query, "status": "pending"}).count(),
            "in_progress": await Inspection.find({**time_query, **spatial_query, "status": "in_progress"}).count()
        }

        # Fetch predictions for risk metrics
        predictions = await Prediction.find({**time_query, **spatial_query}).to_list()
        
        # Calculate risk metrics
        high_risk_predictions = [p for p in predictions if p.risk_level in ["high", "critical"]]
        avg_risk_score = sum(p.risk_score for p in predictions) / len(predictions) if predictions else None
        
        # Group by zone for high-risk areas
        high_risk_areas = []
        zone_risks = {}
        for pred in high_risk_predictions:
            if pred.zone:
                if pred.zone not in zone_risks:
                    zone_risks[pred.zone] = []
                zone_risks[pred.zone].append(pred.risk_score)
        
        for zone, scores in zone_risks.items():
            high_risk_areas.append({
                "zone": zone,
                "average_risk_score": sum(scores) / len(scores),
                "count": len(scores)
            })
        
        # Sort by risk score
        high_risk_areas.sort(key=lambda x: x["average_risk_score"], reverse=True)
        
        # New Realism Aggregations
        trends = await ReportService._generate_trends(start_date, end_date, spatial_query)
        top_issues = await ReportService._get_top_issues(time_query, spatial_query)
        executive_summary = await ReportService._generate_executive_summary(
            alert_severity_counts, inspection_status_counts, top_issues, avg_risk_score, total_tasks
        )
        
        return {
            "total_events": total_events,
            "total_alerts": total_alerts,
            "total_tasks": total_tasks,
            "total_inspections": total_inspections,
            "alert_stats": alert_severity_counts,
            "inspection_stats": inspection_status_counts,
            "high_risk_areas": high_risk_areas[:10],
            "hotspots_detected": len(high_risk_areas),
            "average_risk_score": avg_risk_score,
            "generated_at": datetime.utcnow().isoformat(),
            "trends": trends,
            "top_issues": top_issues,
            "executive_summary": executive_summary,
            "predictions": {
                "total": len(predictions),
                "high_risk": len(high_risk_predictions)
            }
        }

    @staticmethod
    async def _generate_trends(start_date: datetime, end_date: datetime, spatial_query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate daily trend data for the report period"""
        from datetime import timedelta
        trends = []
        current = start_date
        
        while current <= end_date:
            next_day = current + timedelta(days=1)
            day_query = {"created_at": {"$gte": current, "$lt": next_day}}
            
            alerts_count = await Alert.find({**day_query, **spatial_query}).count()
            predictions = await Prediction.find({**day_query, **spatial_query}).to_list()
            avg_risk = sum(p.risk_score for p in predictions) / len(predictions) if predictions else 0
            
            trends.append({
                "date": current.strftime("%Y-%m-%d"),
                "alerts": alerts_count,
                "risk_score": round(avg_risk, 1)
            })
            current = next_day
            
        return trends

    @staticmethod
    async def _get_top_issues(time_query: Dict[str, Any], spatial_query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify most frequent alert categories/types"""
        pipeline = [
            {"$match": {**time_query, **spatial_query}},
            {"$group": {"_id": "$alert_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        
        # Use aggregate with explicit find query for Beanie compatibility if aggregation pipeline is complex
        results = await Alert.aggregate(pipeline).to_list()
        return [{"category": r["_id"] or "General", "count": r["count"]} for r in results]

    @staticmethod
    async def _generate_executive_summary(alerts: dict, inspections: dict, top_issues: list, avg_risk: float, total_tasks: int) -> str:
        """Generate a dynamic data-driven executive summary with unique insights"""
        if avg_risk is None:
            return "Report period contains insufficient activity data for a comprehensive executive summary."
            
        critical = alerts.get("critical", 0)
        risk_label = "High" if avg_risk > 70 else "Moderate" if avg_risk > 40 else "Low"
        
        # Focus on "The Why" and "The Next Steps" rather than just repeating counts shown in cards
        summary = f"The city currently maintains a **{risk_label}** risk profile. "
        
        if top_issues:
            top_issue = top_issues[0]["category"]
            summary += f"Strategic focus should be directed towards **{top_issue}** mitigation, as this remains the primary source of safety alerts. "
        
        if critical > 0:
            summary += f"Urgent verification of the {critical} critical alerts is the highest priority for field officers to prevent escalation. "
        else:
            summary += "No critical-severity escalations were recorded, suggesting stable containment protocols. "
            
        pending_insp = inspections.get("pending", 0)
        if pending_insp > 10:
            summary += f"There is a notable backlog in field activity that may delay risk detection if not addressed in the next cycle. "
        elif pending_insp > 0:
            summary += "Field inspections are largely on-schedule, with only minor pending tasks. "
            
        return summary

    @staticmethod
    async def generate_pdf_export(report: Report) -> bytes:
        """Generate a professional PDF export of the report"""
        if not FPDF_AVAILABLE:
            raise ImportError(f"PDF generation library (fpdf2) is not available in the current environment: {sys.executable}")
        
        class PDF(FPDF):
            def header(self):
                self.set_font('helvetica', 'B', 15)
                self.cell(0, 10, 'CITY ANALYTICS: STRATEGIC REPORT', 0, 1, 'C')
                self.ln(5)

            def footer(self):
                self.set_y(-15)
                self.set_font('helvetica', 'I', 8)
                self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

        pdf = PDF()
        pdf.add_page()
        
        # Report Title & Metadata
        pdf.set_font('helvetica', 'B', 12)
        pdf.cell(0, 10, f"Title: {report.title}", 0, 1)
        pdf.set_font('helvetica', '', 10)
        pdf.cell(0, 8, f"Type: {report.report_type.value.upper()}", 0, 1)
        pdf.cell(0, 8, f"Period: {report.start_date.strftime('%Y-%m-%d')} to {report.end_date.strftime('%Y-%m-%d')}", 0, 1)
        pdf.ln(10)

        # Executive Summary
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, 'EXECUTIVE SUMMARY', 0, 1)
        pdf.set_font('helvetica', 'I', 10)
        summary = report.data.get("executive_summary", "").replace("**", "")
        pdf.multi_cell(0, 8, summary)
        pdf.ln(10)

        # Key Metrics Table
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, 'KEY PERFORMANCE INDICATORS', 0, 1)
        pdf.set_font('helvetica', '', 10)
        
        metrics = [
            ["Metric", "Value"],
            ["Total Alerts", str(report.total_alerts)],
            ["Total Tasks", str(report.total_tasks)],
            ["Total Inspections", str(report.total_inspections)],
            ["Avg Risk Score", f"{round(report.average_risk_score or 0, 1)}%"]
        ]
        
        for row in metrics:
            pdf.cell(60, 8, row[0], 1)
            pdf.cell(40, 8, row[1], 1)
            pdf.ln()
            
        pdf.ln(10)

        # High Risk Areas
        high_risk = report.data.get("high_risk_areas", [])
        if high_risk:
            pdf.set_font('helvetica', 'B', 11)
            pdf.cell(0, 10, 'PRIORITY RISK ZONES', 0, 1)
            pdf.set_font('helvetica', '', 9)
            
            pdf.cell(80, 8, 'Zone', 1)
            pdf.cell(40, 8, 'Risk Score', 1)
            pdf.cell(40, 8, 'Event Count', 1)
            pdf.ln()
            
            for area in high_risk[:10]:
                pdf.cell(80, 8, str(area.get('zone', 'N/A')), 1)
                pdf.cell(40, 8, f"{round(area.get('average_risk_score', 0), 1)}%", 1)
                pdf.cell(40, 8, str(area.get('count', 0)), 1)
                pdf.ln()

        return bytes(pdf.output())

    @staticmethod
    async def generate_csv_export(report: Report) -> str:
        """Transform report data into a professional multi-section CSV string"""
        data = report.data
        if not data:
            return "Error,No report data found"
            
        output = io.StringIO()
        
        # Section 1: Report Metadata
        output.write("--- REPORT OVERVIEW ---\n")
        output.write(f"Title,{report.title}\n")
        output.write(f"Type,{report.report_type.value}\n")
        output.write(f"Period,{report.start_date.strftime('%Y-%m-%d')} to {report.end_date.strftime('%Y-%m-%d')}\n")
        output.write(f"Generated At,{data.get('generated_at', '')}\n\n")
        
        # Section 2: Executive Summary
        output.write("--- EXECUTIVE SUMMARY ---\n")
        summary_clean = data.get("executive_summary", "").replace("**", "").replace("\n", " ")
        output.write(f"Summary,\"{summary_clean}\"\n\n")
        
        # Section 3: Key Metrics
        output.write("--- KEY PERFORMANCE INDICATORS ---\n")
        output.write(f"Total Alerts,{data.get('total_alerts', 0)}\n")
        output.write(f"Critical Alerts,{data.get('alert_stats', {}).get('critical', 0)}\n")
        output.write(f"Average Risk Score,{round(data.get('average_risk_score', 0) or 0, 2)}\n")
        output.write(f"Inspections Completed,{data.get('inspection_stats', {}).get('completed', 0)}\n")
        output.write(f"Hotspots Detected,{data.get('hotspots_detected', 0)}\n\n")
        
        # Section 4: High-Risk Area Breakdown
        high_risk_areas = data.get("high_risk_areas", [])
        if high_risk_areas:
            output.write("--- PRIORITY RISK AREAS ---\n")
            output.write("Zone,Average Risk Score,Event Count\n")
            for area in high_risk_areas:
                output.write(f"\"{area.get('zone', 'N/A')}\",{round(area.get('average_risk_score', 0), 2)},{area.get('count', 0)}\n")
            output.write("\n")
            
        # Section 5: Top Issues
        top_issues = data.get("top_issues", [])
        if top_issues:
            output.write("--- TOP REPORTED CATEGORIES ---\n")
            output.write("Category,Incident Count\n")
            for issue in top_issues:
                output.write(f"\"{issue.get('category', 'General')}\",{issue.get('count', 0)}\n")
            output.write("\n")
            
        return output.getvalue()
    
    @staticmethod
    async def get_report(report_id: str) -> Optional[Report]:
        """Get report by ID"""
        return await Report.get(report_id)
    
    @staticmethod
    async def get_reports(
        report_type: Optional[ReportType] = None,
        status: Optional[ReportStatus] = None,
        skip: int = 0,
        limit: int = 50,
        unique_only: bool = True
    ) -> List[Report]:
        """Get reports with filters, optionally returning only unique titles"""
        query = {}
        if report_type:
            query["report_type"] = report_type
        if status:
            query["status"] = status
        
        # We fetch a larger batch to filter unique items
        reports = await Report.find(query).sort("-created_at").to_list()
        
        if unique_only:
            seen_titles = set()
            unique_reports = []
            for r in reports:
                if r.title not in seen_titles:
                    unique_reports.append(r)
                    seen_titles.add(r.title)
            return unique_reports[skip : skip + limit]
            
        return reports[skip : skip + limit]
