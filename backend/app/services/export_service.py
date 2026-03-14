"""Service for exporting raw data to CSV"""
import io
import pandas as pd
from typing import List, Type
from beanie import Document
from datetime import datetime

class ExportService:
    """Service for handling raw data exports"""

    @staticmethod
    async def export_to_csv(model: Type[Document], filename_prefix: str) -> tuple[str, str]:
        """
        Export all records from a Beanie model to a CSV string.
        Returns (csv_content, filename)
        """
        records = await model.find_all().to_list()
        return ExportService.export_records_to_csv(records, filename_prefix)

    @staticmethod
    def export_records_to_csv(records: List[Document], filename_prefix: str) -> tuple[str, str]:
        """
        Export a list of Beanie documents to a CSV string.
        Returns (csv_content, filename)
        """
        if not records:
            return "No data found", f"{filename_prefix}_empty.csv"
            
        data = []
        for r in records:
            # Convert to dict, handle both Beanie documents and raw dicts
            record_dict = r.dict() if hasattr(r, "dict") else dict(r)
            
            # Clean up dict for CSV
            if "_id" in record_dict:
                record_dict["id"] = str(record_dict["_id"])
                del record_dict["_id"]
            
            for key, value in record_dict.items():
                if isinstance(value, (list, dict)):
                    record_dict[key] = str(value)
                elif isinstance(value, datetime):
                    record_dict[key] = value.isoformat()
                elif hasattr(value, "__str__") and not isinstance(value, (str, int, float, bool, type(None))):
                    record_dict[key] = str(value)
            
            data.append(record_dict)
            
        df = pd.DataFrame(data)
        output = io.StringIO()
        df.to_csv(output, index=False)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{filename_prefix}_{timestamp}.csv"
        
        return output.getvalue(), filename
