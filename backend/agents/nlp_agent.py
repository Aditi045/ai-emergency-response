import re
from typing import Dict, Any, List
from sklearn.feature_extraction.text import TfidfVectorizer

class NLPAgent:
    """Agent performing Named Entity Recognition, Incident Classification, and Semantic Feature Extraction"""
    
    INCIDENT_KEYWORDS = {
        "Flood": ["flood", "water", "river", "submerged", "overflow", "drowning", "heavy rain", "inundation", "dam"],
        "Fire": ["fire", "flames", "smoke", "blaze", "burning", "explosion", "wildfire", "inferno"],
        "Landslide": ["landslide", "mudslide", "slope", "debris", "rockfall", "soil", "avalanche"],
        "Earthquake": ["earthquake", "tremor", "aftershock", "quake", "ground shake", "seismic"],
        "Cyclone": ["cyclone", "hurricane", "typhoon", "gale", "storm", "high wind", "tornado"],
        "Road Accident": ["accident", "collision", "crash", "car crash", "bus", "truck collision", "overturned"],
        "Building Collapse": ["collapse", "building collapse", "rubble", "crushed", "structural failure", "trapped under"],
        "Medical Emergency": ["cardiac", "stroke", "unconscious", "bleeding", "asthma", "heart attack", "poisoning", "ambulance needed"],
        "Industrial Accident": ["chemical leak", "gas leak", "hazmat", "toxic", "factory explosion", "radiation"],
        "Road Blockage": ["road blocked", "fallen tree", "boulder", "impassable", "traffic standstill", "obstruction"]
    }

    @classmethod
    def classify_text(cls, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        best_match = "Other"
        max_score = 0
        matched_indicators = []

        for category, keywords in cls.INCIDENT_KEYWORDS.items():
            matches = [k for k in keywords if k in text_lower]
            if len(matches) > max_score:
                max_score = len(matches)
                best_match = category
                matched_indicators = matches

        # Baseline confidence based on signal strength
        if max_score >= 3:
            confidence = 0.94
        elif max_score == 2:
            confidence = 0.85
        elif max_score == 1:
            confidence = 0.72
        else:
            confidence = 0.45
            best_match = "Emergency Incident"

        return {
            "prediction": best_match,
            "confidence": round(confidence, 2),
            "matched_indicators": matched_indicators,
            "model_version": "ResQIntel-NLP-Classifier-v1.4",
            "framework": "Rule-Based NLP / Lexical Information Extraction"
        }

    @classmethod
    def extract_entities(cls, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        
        # Word number to digit normalization
        word_num_map = {
            "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
            "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
            "several": "5", "multiple": "4", "dozen": "12"
        }
        normalized_text = text_lower
        for word, dig in word_num_map.items():
            normalized_text = re.sub(rf'\b{word}\b', dig, normalized_text)
        
        # Numbers of people / injuries
        people_matches = re.findall(r'(\d+)\s*(?:people|persons|citizens|residents|trapped|stranded)', normalized_text)
        injury_matches = re.findall(r'(\d+)\s*(?:injured|casualties|hurt|wounded|patients)', normalized_text)
        fatality_matches = re.findall(r'(\d+)\s*(?:dead|fatalities|killed|deaths)', normalized_text)
        
        people_count = int(people_matches[0]) if people_matches else 0
        injuries_count = int(injury_matches[0]) if injury_matches else 0
        fatalities_count = int(fatality_matches[0]) if fatality_matches else 0

        # Landmarks / Locations Mentioned
        landmark_patterns = [
            r'(?:near|at|by|opposite|behind|adjacent to)\s+([a-zA-Z0-9\s]{3,35})(?:\.|\,|$|and)',
            r'([a-zA-Z\s]+(?:bridge|hospital|school|junction|highway|street|road|cross|market|station|sector))'
        ]
        landmarks = []
        for pat in landmark_patterns:
            found = re.findall(pat, text, re.IGNORECASE)
            for f in found:
                cleaned = f.strip()
                if len(cleaned) > 3 and cleaned.lower() not in ["the", "this", "that"]:
                    landmarks.append(cleaned)
                    
        # Hazard keywords
        hazards = []
        if any(w in text_lower for w in ["power line", "electricity", "live wire", "sparking"]):
            hazards.append("Downed Live Power Lines")
        if any(w in text_lower for w in ["gas leak", "chemical", "fumes", "toxic"]):
            hazards.append("Hazardous Airborne Materials / Gas")
        if any(w in text_lower for w in ["rapid current", "rising water", "water is still rising", "water is rising", "whirlpool", "deep water"]) or ("water" in text_lower and "rising" in text_lower):
            hazards.append("Fast-flowing / Rising Flood Waters")
        if any(w in text_lower for w in ["fire", "flames", "smoke"]):
            hazards.append("Combustion / Toxic Smoke")
            
        # Infrastructure damage
        infrastructure = []
        if any(w in text_lower for w in ["bridge", "flyover", "overpass"]):
            infrastructure.append("Bridge / Overpass Integrity Risk")
        if any(w in text_lower for w in ["submerged", "road submerged", "road washed away", "pothole", "cracked road", "cars are submerged"]):
            infrastructure.append("Roadway Disruption & Submerged Transport")
        if any(w in text_lower for w in ["building cracked", "wall collapsed", "roof fell"]):
            infrastructure.append("Building Structural Damage")

        return {
            "people_affected": people_count,
            "injuries": injuries_count,
            "fatalities": fatalities_count,
            "landmarks": list(set(landmarks)),
            "hazards": hazards,
            "infrastructure_damage": infrastructure,
            "time_references": ["Current Real-Time Ingestion"],
            "engine_type": "Rule-Based NLP / Information Extraction",
            "model_version": "ResQIntel-NER-Engine-v1.2"
        }

    @classmethod
    async def process(cls, text: str) -> Dict[str, Any]:
        classification = cls.classify_text(text)
        entities = cls.extract_entities(text)
        return {
            "status": "COMPLETED",
            "classification": classification,
            "entities": entities,
            "agent_metadata": {
                "agent": "NLPAgent",
                "version": "1.4.0"
            }
        }
