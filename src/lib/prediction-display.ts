/**
 * Human-readable display titles for predictions
 * Converts technical hypotheses into plain language questions
 */

export interface DisplayTitle {
  title: string;
  subtitle: string;
}

export function generateDisplayTitle(hypothesis: string, domains: string[] = []): DisplayTitle {
  const h = hypothesis.toLowerCase();
  const primaryDomain = domains[0] || '';

  // Crisis apparition timing/clustering
  if (h.includes('crisis') && (h.includes('timing') || h.includes('temporal') || h.includes('cluster') || h.includes('12 hour'))) {
    return {
      title: "Do people really sense loved ones dying from far away?",
      subtitle: "Testing whether crisis apparitions happen at the moment of the actual event"
    };
  }

  // Crisis apparition general
  if (primaryDomain === 'crisis_apparition' || h.includes('crisis apparition')) {
    return {
      title: "Can we sense when someone we love is in danger?",
      subtitle: "Analyzing patterns in crisis apparition reports"
    };
  }

  // Ganzfeld dynamic vs static
  if (h.includes('ganzfeld') && h.includes('dynamic') && h.includes('static')) {
    return {
      title: "Are moving images easier to 'receive' telepathically than still photos?",
      subtitle: "Comparing hit rates between video and image targets in Ganzfeld tests"
    };
  }

  // Ganzfeld sender presence
  if (h.includes('ganzfeld') && h.includes('sender')) {
    return {
      title: "Does telepathy need a 'sender' or just a receiver?",
      subtitle: "Testing whether having someone actively send affects hit rates"
    };
  }

  // Ganzfeld emotional content
  if (h.includes('ganzfeld') && (h.includes('emotional') || h.includes('neutral'))) {
    return {
      title: "Are emotional images easier to receive telepathically?",
      subtitle: "Comparing hit rates for emotional vs neutral targets"
    };
  }

  // Ganzfeld general
  if (primaryDomain === 'ganzfeld' || h.includes('ganzfeld')) {
    return {
      title: "Can people receive mental images from another room?",
      subtitle: "Testing telepathy with the Ganzfeld protocol"
    };
  }

  // Remote viewing - sidereal time
  if (h.includes('remote viewing') && (h.includes('sidereal') || h.includes('lst'))) {
    return {
      title: "Is there a 'best time of day' for psychic perception?",
      subtitle: "Testing whether remote viewing accuracy peaks at specific astronomical times"
    };
  }

  // Remote viewing - distance
  if (h.includes('remote viewing') && h.includes('distance')) {
    return {
      title: "Does distance matter for remote viewing?",
      subtitle: "Testing whether accuracy changes with target distance"
    };
  }

  // Remote viewing general
  if (primaryDomain === 'stargate' || h.includes('remote viewing')) {
    return {
      title: "Can people describe places they've never seen?",
      subtitle: "Testing remote viewing accuracy under controlled conditions"
    };
  }

  // NDE - flat EEG / brain activity
  if (h.includes('nde') && (h.includes('eeg') || h.includes('flat') || h.includes('brain activity'))) {
    return {
      title: "Do near-death experiences happen when the brain is completely offline?",
      subtitle: "Comparing NDE reports during total vs partial loss of brain function"
    };
  }

  // NDE - veridical perception
  if ((h.includes('nde') || h.includes('near-death')) && h.includes('veridical')) {
    return {
      title: "Can people see things during cardiac arrest that they shouldn't be able to?",
      subtitle: "Testing whether NDE perceptions contain verifiable details"
    };
  }

  // NDE general
  if (primaryDomain === 'nde' || h.includes('near-death') || h.includes('nde')) {
    return {
      title: "What do people experience when they 'die' and come back?",
      subtitle: "Analyzing patterns in near-death experience reports"
    };
  }

  // Geophysical - seismic timing
  if ((h.includes('geophysical') || h.includes('seismic') || h.includes('tectonic')) && (h.includes('72 hour') || h.includes('before') || h.includes('after'))) {
    return {
      title: "Do earthquakes trigger strange lights and phenomena?",
      subtitle: "Testing whether anomalous reports spike before and after seismic activity"
    };
  }

  // Geophysical - piezoelectric
  if (h.includes('piezoelectric') || (h.includes('geophysical') && h.includes('zone'))) {
    return {
      title: "Do certain rocks create strange lights under pressure?",
      subtitle: "Testing piezoelectric effects in geological fault zones"
    };
  }

  // Geophysical general
  if (primaryDomain === 'geophysical' || h.includes('tectonic') || h.includes('seismic')) {
    return {
      title: "Are strange phenomena connected to geological activity?",
      subtitle: "Testing correlations between anomalies and tectonic stress"
    };
  }

  // UFO - clustering
  if ((h.includes('ufo') || h.includes('uap')) && h.includes('cluster')) {
    return {
      title: "Do UFO sightings cluster in certain areas?",
      subtitle: "Mapping sighting patterns to find geographic hotspots"
    };
  }

  // UFO - military/restricted
  if ((h.includes('ufo') || h.includes('uap')) && (h.includes('military') || h.includes('restricted') || h.includes('base'))) {
    return {
      title: "Are UFOs more common near military bases?",
      subtitle: "Testing whether sightings cluster around restricted areas"
    };
  }

  // UFO general
  if (primaryDomain === 'ufo' || h.includes('ufo') || h.includes('uap')) {
    return {
      title: "Are UFO sightings random or do they follow patterns?",
      subtitle: "Analyzing geographic and temporal patterns in UAP reports"
    };
  }

  // Bigfoot - habitat
  if (h.includes('bigfoot') && (h.includes('habitat') || h.includes('forest') || h.includes('wilderness'))) {
    return {
      title: "Where are Bigfoot sightings most common?",
      subtitle: "Mapping sightings against terrain and habitat types"
    };
  }

  // Bigfoot general
  if (primaryDomain === 'bigfoot' || h.includes('bigfoot') || h.includes('sasquatch')) {
    return {
      title: "Do Bigfoot sightings follow real animal patterns?",
      subtitle: "Testing whether reports match expected wildlife behavior"
    };
  }

  // Haunting - environmental
  if (h.includes('haunting') && (h.includes('emf') || h.includes('infrasound') || h.includes('electromagnetic'))) {
    return {
      title: "Can environmental factors explain hauntings?",
      subtitle: "Testing EMF, infrasound, and other natural explanations"
    };
  }

  // Haunting general
  if (primaryDomain === 'haunting' || h.includes('haunting') || h.includes('ghost')) {
    return {
      title: "What makes some places feel haunted?",
      subtitle: "Analyzing patterns in haunting reports and location characteristics"
    };
  }

  // Hotspot/window areas
  if (primaryDomain === 'hotspot' || h.includes('hotspot') || h.includes('window area')) {
    return {
      title: "Are some places just naturally weird?",
      subtitle: "Testing whether diverse anomalies cluster in the same locations"
    };
  }

  // Crop circles
  if (primaryDomain === 'crop_circle' || h.includes('crop circle') || h.includes('formation')) {
    return {
      title: "Can we tell real crop formations from hoaxes?",
      subtitle: "Analyzing physical evidence in crop formations"
    };
  }

  // Cattle mutilation
  if (primaryDomain === 'cattle_mutilation' || h.includes('cattle') || h.includes('mutilation')) {
    return {
      title: "What's really happening to these animals?",
      subtitle: "Analyzing pathology patterns in unexplained animal deaths"
    };
  }

  // Bermuda Triangle
  if (primaryDomain === 'bermuda_triangle' || h.includes('bermuda')) {
    return {
      title: "Is the Bermuda Triangle actually dangerous?",
      subtitle: "Comparing disappearance rates to similar ocean areas"
    };
  }

  // Men in Black
  if (primaryDomain === 'men_in_black' || h.includes('men in black') || h.includes('mib')) {
    return {
      title: "Who are the mysterious visitors after UFO sightings?",
      subtitle: "Analyzing patterns in Men in Black encounter reports"
    };
  }

  // Cryptids general
  if (primaryDomain === 'cryptid' || h.includes('cryptid') || h.includes('creature')) {
    return {
      title: "Are mystery creature sightings following real patterns?",
      subtitle: "Analyzing geographic and behavioral patterns in cryptid reports"
    };
  }

  // Precognition
  if (h.includes('precognition') || h.includes('premonition')) {
    return {
      title: "Can people really predict the future?",
      subtitle: "Testing documented predictions against actual outcomes"
    };
  }

  // Telepathy general
  if (h.includes('telepathy') || h.includes('mind reading')) {
    return {
      title: "Can thoughts transfer between minds?",
      subtitle: "Testing information transfer without normal senses"
    };
  }

  // Geomagnetic effects
  if (h.includes('geomagnetic') || h.includes('solar storm') || h.includes('magnetic field')) {
    return {
      title: "Does space weather affect psychic abilities?",
      subtitle: "Testing whether geomagnetic activity correlates with psi performance"
    };
  }

  // Default fallback - create a question from the hypothesis
  const questionTitle = createQuestionFromHypothesis(hypothesis);
  return {
    title: questionTitle,
    subtitle: hypothesis.length > 100 ? hypothesis.substring(0, 100) + '...' : hypothesis
  };
}

// Helper to convert technical hypothesis into a question
function createQuestionFromHypothesis(hypothesis: string): string {
  const h = hypothesis.toLowerCase();

  // Try to extract the core claim and turn it into a question
  if (h.includes('will')) {
    // "X will produce Y" -> "Does X produce Y?"
    const parts = hypothesis.split(/\bwill\b/i);
    if (parts.length === 2) {
      const subject = parts[0].trim();
      const shortSubject = subject.length > 50 ? subject.substring(0, 50) + '...' : subject;
      return `Does ${shortSubject.toLowerCase()} affect results?`;
    }
  }

  if (h.includes('correlate') || h.includes('associated') || h.includes('linked')) {
    return "Are these two things actually connected?";
  }

  if (h.includes('higher') || h.includes('lower') || h.includes('more') || h.includes('less')) {
    return "Does this factor make a real difference?";
  }

  if (h.includes('cluster') || h.includes('pattern')) {
    return "Is there a real pattern here, or just noise?";
  }

  // Generic fallback
  return "Is this prediction true?";
}

/**
 * Generate a short display title suitable for cards and lists
 * Returns just the title, not the subtitle
 */
export function getShortDisplayTitle(hypothesis: string, domains: string[] = []): string {
  return generateDisplayTitle(hypothesis, domains).title;
}

/**
 * Human-readable display titles for patterns
 * Converts technical pattern descriptions into plain language
 */
export interface PatternDisplayTitle {
  title: string;
  subtitle: string;
}

export function generatePatternDisplayTitle(description: string, variable: string | null, domains: string[] = []): PatternDisplayTitle {
  const d = (description || '').toLowerCase();
  const v = (variable || '').toLowerCase();
  const primaryDomain = domains[0] || '';

  // Temporal clustering patterns
  if (d.includes('temporal') && d.includes('cluster')) {
    if (domains.includes('crisis_apparition')) {
      return {
        title: "Crisis apparitions cluster in time with actual events",
        subtitle: `Pattern found: ${variable}`
      };
    }
    return {
      title: "Events cluster at specific times",
      subtitle: `Temporal pattern in ${variable}`
    };
  }

  // Geographic clustering
  if (d.includes('geographic') || d.includes('spatial') || d.includes('location')) {
    return {
      title: "Sightings cluster in specific locations",
      subtitle: `Geographic pattern: ${variable}`
    };
  }

  // Correlation patterns
  if (d.includes('correlat') || d.includes('associated') || d.includes('linked')) {
    return {
      title: "Two phenomena appear connected",
      subtitle: `Correlation found: ${variable}`
    };
  }

  // Geomagnetic patterns
  if (d.includes('geomagnetic') || d.includes('magnetic') || d.includes('solar')) {
    return {
      title: "Space weather affects anomaly reports",
      subtitle: `Geomagnetic pattern: ${variable}`
    };
  }

  // Ganzfeld patterns
  if (primaryDomain === 'ganzfeld' || d.includes('ganzfeld') || d.includes('hit rate')) {
    return {
      title: "Certain conditions improve telepathy hit rates",
      subtitle: `Ganzfeld pattern: ${variable}`
    };
  }

  // Remote viewing patterns
  if (primaryDomain === 'stargate' || d.includes('remote viewing') || d.includes('accuracy')) {
    return {
      title: "Viewing accuracy varies with conditions",
      subtitle: `Remote viewing pattern: ${variable}`
    };
  }

  // NDE patterns
  if (primaryDomain === 'nde' || d.includes('nde') || d.includes('near-death')) {
    return {
      title: "NDEs share common features",
      subtitle: `NDE pattern: ${variable}`
    };
  }

  // UFO/UAP patterns
  if (primaryDomain === 'ufo' || d.includes('ufo') || d.includes('uap')) {
    return {
      title: "UFO sightings follow predictable patterns",
      subtitle: `UAP pattern: ${variable}`
    };
  }

  // Bigfoot patterns
  if (primaryDomain === 'bigfoot' || d.includes('bigfoot') || d.includes('sasquatch')) {
    return {
      title: "Bigfoot sightings cluster by habitat",
      subtitle: `Sighting pattern: ${variable}`
    };
  }

  // Haunting patterns
  if (primaryDomain === 'haunting' || d.includes('haunting') || d.includes('ghost')) {
    return {
      title: "Hauntings share location characteristics",
      subtitle: `Haunting pattern: ${variable}`
    };
  }

  // Hotspot patterns
  if (primaryDomain === 'hotspot' || d.includes('hotspot') || d.includes('window')) {
    return {
      title: "Multiple anomalies cluster in the same places",
      subtitle: `Hotspot pattern: ${variable}`
    };
  }

  // Default fallback
  const shortDesc = description.length > 60 ? description.substring(0, 60) + '...' : description;
  return {
    title: shortDesc,
    subtitle: `Pattern variable: ${variable}`
  };
}
