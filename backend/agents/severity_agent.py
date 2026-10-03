from typing import Dict, Any, List

class SeverityAgent:
    """Explainable Multi-Factor Emergency Severity & Risk Quantification Engine"""

    # Configurable weights for transparency
    DEFAULT_WEIGHTS = {
        "incident_type": 0.20,
        "injuries_fatalities": 0.25,
        "people_affected": 0.15,
        "infrastructure_damage": 0.15,
        "weather_escalation": 0.10,
        "report_volume": 0.10,
        "cv_visual_confirmation": 0.05
    }

    TYPE_BASE_SEVERITY = {
        "Building Collapse": 9.0,
        "Industrial Accident": 8.5,
        "Flood": 8.0,
        "Fire": 8.0,
        "Earthquake": 8.5,
        "Cyclone": 7.5,
        "Landslide": 7.5,
        "Road Accident": 6.5,
        "Medical Emergency": 6.0,
        "Road Blockage": 4.5,
        "Other": 4.0
    }

    @classmethod
    async def process(
        cls, 
        incident_type: str, 
        injuries: int, 
        fatalities: int, 
        people_affected: int, 
        has_infra_damage: bool, 
        weather_info: Dict[str, Any], 
        report_count: int, 
        cv_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        contributing_factors = []

        # 1. Base incident type hazard (0 - 10)
        base_type_score = cls.TYPE_BASE_SEVERITY.get(incident_type, 5.0)
        contributing_factors.append({
            "factor": "Incident Classification Baseline",
            "weight": cls.DEFAULT_WEIGHTS["incident_type"],
            "raw_value": incident_type,
            "score_contribution": round(base_type_score * cls.DEFAULT_WEIGHTS["incident_type"], 2),
            "rationale": f"Inherent threat profile for {incident_type} disaster type."
        })

        # 2. Injuries and Fatalities (0 - 10)
        human_impact_score = min(10.0, (fatalities * 5.0) + (injuries * 2.0))
        if fatalities == 0 and injuries == 0:
            human_impact_score = 1.0
        contributing_factors.append({
            "factor": "Casualty & Injury Assessment",
            "weight": cls.DEFAULT_WEIGHTS["injuries_fatalities"],
            "raw_value": f"{injuries} injured, {fatalities} fatalities",
            "score_contribution": round(human_impact_score * cls.DEFAULT_WEIGHTS["injuries_fatalities"], 2),
            "rationale": f"Assessed immediate life-safety risk based on reported casualties."
        })

        # 3. People Affected (0 - 10)
        if people_affected > 100:
            pop_score = 9.5
        elif people_affected > 20:
            pop_score = 7.5
        elif people_affected > 5:
            pop_score = 5.0
        elif people_affected > 0:
            pop_score = 3.0
        else:
            pop_score = 1.0
        contributing_factors.append({
            "factor": "Population Exposure / Entrapment",
            "weight": cls.DEFAULT_WEIGHTS["people_affected"],
            "raw_value": f"{people_affected} persons",
            "score_contribution": round(pop_score * cls.DEFAULT_WEIGHTS["people_affected"], 2),
            "rationale": f"Scale of individuals requiring evacuation, shelter, or triage."
        })

        # 4. Infrastructure Damage (0 - 10)
        infra_score = 8.5 if has_infra_damage else 2.0
        contributing_factors.append({
            "factor": "Critical Infrastructure Integrity",
            "weight": cls.DEFAULT_WEIGHTS["infrastructure_damage"],
            "raw_value": "Damage Reported" if has_infra_damage else "None Reported",
            "score_contribution": round(infra_score * cls.DEFAULT_WEIGHTS["infrastructure_damage"], 2),
            "rationale": "Impassable corridors or compromised structures impede response."
        })

        # 5. Weather escalation (0 - 10)
        rainfall = weather_info.get("rainfall_mm", 0.0)
        wind = weather_info.get("wind_speed_kmh", 0.0)
        weather_score = 1.0
        if rainfall > 15.0 or wind > 50.0:
            weather_score = 8.5
        elif rainfall > 5.0 or wind > 30.0:
            weather_score = 6.0
        contributing_factors.append({
            "factor": "Meteorological Compounding Risk",
            "weight": cls.DEFAULT_WEIGHTS["weather_escalation"],
            "raw_value": f"{rainfall}mm rain, {wind}km/h wind",
            "score_contribution": round(weather_score * cls.DEFAULT_WEIGHTS["weather_escalation"], 2),
            "rationale": "Adverse weather accelerates hazard propagation and hampers rescue."
        })

        # 6. Report Volume / Growth (0 - 10)
        vol_score = min(10.0, report_count * 2.5)
        contributing_factors.append({
            "factor": "Corroborating Signal Density",
            "weight": cls.DEFAULT_WEIGHTS["report_volume"],
            "raw_value": f"{report_count} independent reports",
            "score_contribution": round(vol_score * cls.DEFAULT_WEIGHTS["report_volume"], 2),
            "rationale": "Multiple independent distress calls increase confidence in acute threat."
        })

        # 7. Computer Vision Confirmation (0 - 10)
        cv_conf = (cv_info.get("confidence") or cv_info.get("overall_confidence") or 0.0) if cv_info.get("status") == "REAL_INFERENCE" else 0.0
        cv_score = cv_conf * 10.0
        contributing_factors.append({
            "factor": "Visual AI Verification",
            "weight": cls.DEFAULT_WEIGHTS["cv_visual_confirmation"],
            "raw_value": f"{round(cv_conf * 100)}% detection certainty" if cv_conf > 0 else "Pending visual confirmation / model unconfigured",
            "score_contribution": round(cv_score * cls.DEFAULT_WEIGHTS["cv_visual_confirmation"], 2),
            "rationale": "Automated object bounding corroborates on-scene reports when computer vision is active." if cv_conf > 0 else "No automated visual detection active; zero score contribution assigned."
        })

        # Aggregate weighted score
        final_score = sum(f["score_contribution"] for f in contributing_factors)
        final_score = max(1.0, min(10.0, round(final_score, 1)))

        # Classification bracket
        if final_score >= 8.0:
            severity_class = "CRITICAL"
        elif final_score >= 6.0:
            severity_class = "HIGH"
        elif final_score >= 4.0:
            severity_class = "MEDIUM"
        else:
            severity_class = "LOW"

        return {
            "severity_score": final_score,
            "severity_class": severity_class,
            "contributing_factors": contributing_factors,
            "weights_used": cls.DEFAULT_WEIGHTS,
            "engine_type": "Explainable Multi-Factor Severity Engine",
            "model_version": "ResQIntel-Explainable-Severity-v2.1",
            "decision_support_disclaimer": "EXPLAINABLE DECISION-SUPPORT SCORE: Calculated deterministically from multi-factor weighted signals. Consequential dispatch requires human operator verification.",
            "agent_metadata": {"agent": "SeverityAgent", "version": "2.1.0"}
        }
