from typing import Dict, Any, List

class ConflictAgent:
    """Agent detecting contradictory reports and physical inconsistencies across signals"""
    
    CONTRADICTION_PAIRS = [
        ("road blocked", "road clear"),
        ("road blocked", "road accessible"),
        ("road impassable", "passable"),
        ("no casualties", "fatalities reported"),
        ("no injuries", "people injured"),
        ("bridge collapsed", "bridge open"),
        ("power on", "power grid blackout"),
        ("water receding", "water rising")
    ]

    @classmethod
    async def process(cls, reports: List[Dict[str, Any]]) -> Dict[str, Any]:
        if len(reports) < 2:
            return {
                "has_conflict": False,
                "conflict_count": 0,
                "conflicts": [],
                "agent_metadata": {"agent": "ConflictAgent", "version": "1.1.0"}
            }

        detected_conflicts = []
        for i in range(len(reports)):
            for j in range(i + 1, len(reports)):
                r1 = reports[i]
                r2 = reports[j]
                t1 = (r1.get("raw_text") or "").lower()
                t2 = (r2.get("raw_text") or "").lower()

                for phrase_a, phrase_b in cls.CONTRADICTION_PAIRS:
                    if (phrase_a in t1 and phrase_b in t2) or (phrase_b in t1 and phrase_a in t2):
                        detected_conflicts.append({
                            "type": "CONTRADICTORY_FIELD_REPORT",
                            "severity": "HIGH",
                            "signal_a": {
                                "source": r1.get("submitter_name") or r1.get("report_type", "Signal A"),
                                "text": r1.get("raw_text"),
                                "timestamp": str(r1.get("created_at"))
                            },
                            "signal_b": {
                                "source": r2.get("submitter_name") or r2.get("report_type", "Signal B"),
                                "text": r2.get("raw_text"),
                                "timestamp": str(r2.get("created_at"))
                            },
                            "detected_contradiction": f"Contradiction identified between '{phrase_a}' vs '{phrase_b}'",
                            "human_action_required": "Dispatch scout or verify via responder on-scene before committing heavy apparatus."
                        })

        return {
            "has_conflict": len(detected_conflicts) > 0,
            "conflict_count": len(detected_conflicts),
            "conflicts": detected_conflicts,
            "status": "CONFLICT_DETECTED" if detected_conflicts else "NO_CONFLICT",
            "agent_metadata": {"agent": "ConflictAgent", "version": "1.1.0"}
        }
