import { getDaysBetween, addDays, parseDate } from './dateHelpers.js';

// Biological constants
export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_DURATION = 5;
export const LUTEAL_PHASE_LENGTH = 14;

/**
 * Validates a period entry.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {{isValid: boolean, error?: string}}
 */
export function validatePeriodDates(startDate, endDate, isOngoing = false) {
  if (!startDate) {
    return { isValid: false, error: 'Start date is required.' };
  }
  
  const start = parseDate(startDate);
  if (!start) {
    return { isValid: false, error: 'Invalid start date format.' };
  }
  
  if (!isOngoing) {
    if (!endDate) {
      return { isValid: false, error: 'End date is required.' };
    }
    const end = parseDate(endDate);
    if (!end) {
      return { isValid: false, error: 'Invalid end date format.' };
    }
    if (start > end) {
      return { isValid: false, error: 'Start date cannot be after end date.' };
    }
  }
  
  return { isValid: true };
}

/**
 * Checks if a new period overlaps with existing period logs.
 * @param {Array} periods - Existing periods list
 * @param {{startDate: string, endDate: string}} newPeriod - The new period to check
 * @param {number} [excludeIndex=-1] - Index to exclude (for editing)
 * @returns {boolean} True if there is an overlap
 */
export function hasPeriodOverlap(periods, newPeriod, excludeIndex = -1, todayStr = '2026-07-08') {
  const { startDate: ns, endDate: ne, isOngoing: newOngoing } = newPeriod;
  const effectiveNe = newOngoing || !ne ? todayStr : ne;
  
  for (let i = 0; i < periods.length; i++) {
    if (i === excludeIndex) continue;
    const { startDate: es, endDate: ee, isOngoing: oldOngoing } = periods[i];
    const effectiveEe = oldOngoing || !ee ? todayStr : ee;
    
    // Overlap formula: Start A <= End B AND Start B <= End A
    if (ns <= effectiveEe && es <= effectiveNe) {
      return true;
    }
  }
  return false;
}

/**
 * Sorts periods chronologically by start date (oldest first).
 * @param {Array} periods 
 * @returns {Array} Sorted copy of periods
 */
export function sortPeriods(periods) {
  return [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/**
 * Calculates completed cycle lengths.
 * If we have n periods, we have n-1 cycles.
 * A cycle length is the number of days from the start of period i to the start of period i+1.
 * @param {Array} sortedPeriods - Chronologically sorted periods
 * @returns {Array<number>} Array of cycle lengths in days
 */
export function calculateCycleLengths(sortedPeriods) {
  const cycleLengths = [];
  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    const length = getDaysBetween(sortedPeriods[i].startDate, sortedPeriods[i + 1].startDate);
    cycleLengths.push(length);
  }
  return cycleLengths;
};

/**
 * Computes the rolling average cycle length.
 * @param {Array} sortedPeriods - Chronologically sorted periods
 * @returns {number} Average cycle length, or DEFAULT_CYCLE_LENGTH if not enough data
 */
export function getAverageCycleLength(sortedPeriods) {
  if (sortedPeriods.length < 2) {
    return DEFAULT_CYCLE_LENGTH;
  }
  const lengths = calculateCycleLengths(sortedPeriods);
  const sum = lengths.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / lengths.length);
}

/**
 * Computes the average duration of menstrual periods (bleeding days).
 * @param {Array} periods 
 * @returns {number} Average duration, or DEFAULT_PERIOD_DURATION if no data
 */
export function getAveragePeriodDuration(periods) {
  const completed = periods.filter(p => !p.isOngoing && p.endDate);
  if (completed.length === 0) {
    return DEFAULT_PERIOD_DURATION;
  }
  const sum = completed.reduce((acc, p) => {
    return acc + getDaysBetween(p.startDate, p.endDate) + 1; // inclusive of end date
  }, 0);
  return Math.round(sum / completed.length);
}

/**
 * Calculates cycle details for historical and current cycles.
 * For each period:
 * - Start Date
 * - End Date
 * - L (Cycle length if there is a next cycle)
 * - Ovulation Day (L - 14 if completed, or AverageL - 14 if ongoing)
 * - Unsafe window [Ovulation - 5, Ovulation + 1]
 * @param {Array} periods - Array of periods
 * @returns {Array<Object>} Enriched cycles list
 */
export function analyzeCycles(periods) {
  if (periods.length === 0) return [];
  const sorted = sortPeriods(periods);
  const avgCycleLength = getAverageCycleLength(sorted);
  
  return sorted.map((period, index) => {
    const isLast = index === sorted.length - 1;
    let cycleLength = null;
    
    if (!isLast) {
      cycleLength = getDaysBetween(period.startDate, sorted[index + 1].startDate);
    }
    
    // Luteal phase is standard 14 days before next period start
    const cycleLengthForOvulation = cycleLength || avgCycleLength;
    const ovulationOffset = cycleLengthForOvulation - LUTEAL_PHASE_LENGTH;
    const ovulationDate = addDays(period.startDate, ovulationOffset);
    
    const unsafeStart = addDays(ovulationDate, -5);
    const unsafeEnd = addDays(ovulationDate, 1);
    
    return {
      ...period,
      cycleLength,
      ovulationDate,
      unsafeWindow: {
        start: unsafeStart,
        end: unsafeEnd
      },
      isOngoing: isLast && (period.isOngoing || !period.endDate)
    };
  });
}

/**
 * Generates summary statistics regarding total cycles logged, completed cycles, ongoing cycles, and data surety level.
 * @param {Array} periods 
 * @returns {Object} Cycle summary metrics
 */
export function getCycleSummaryStats(periods) {
  const analyzed = analyzeCycles(periods);
  const totalLogged = analyzed.length;
  const completed = analyzed.filter(c => c.cycleLength !== null);
  const completedCount = completed.length;
  const ongoingCount = analyzed.filter(c => c.isOngoing).length;
  const avgLength = getAverageCycleLength(periods);
  const avgDuration = getAveragePeriodDuration(periods);

  let confidenceLevel = 'Baseline';
  let confidenceDesc = 'Using standard 28-day default parameters. Log at least 2 period cycles to compute your personal average.';
  if (completedCount >= 6) {
    confidenceLevel = 'High Clinical Surety';
    confidenceDesc = `High statistical confidence based on ${completedCount} completed cycles (${totalLogged} total logged).`;
  } else if (completedCount >= 3) {
    confidenceLevel = 'Moderate Surety';
    confidenceDesc = `Stable personalized baseline derived from ${completedCount} completed cycles (${totalLogged} total logged).`;
  } else if (completedCount >= 1) {
    confidenceLevel = 'Emerging Baseline';
    confidenceDesc = `Initial average calculated from ${completedCount} completed cycle (${totalLogged} total logged).`;
  }

  return {
    analyzed,
    totalLogged,
    completedCount,
    completedCycles: completed,
    ongoingCount,
    avgLength,
    avgDuration,
    confidenceLevel,
    confidenceDesc
  };
}

/**
 * Predicts future cycles based on history.
 * @param {Array} periods - Existing logged periods
 * @param {number} count - Number of cycles to project forward
 * @returns {Array<Object>} Projected cycles
 */
export function projectFutureCycles(periods, count = 3) {
  if (periods.length === 0) return [];
  const sorted = sortPeriods(periods);
  const avgCycleLength = getAverageCycleLength(sorted);
  const avgDuration = getAveragePeriodDuration(sorted);
  
  const projections = [];
  let referenceStartDate = sorted[sorted.length - 1].startDate;
  
  for (let i = 1; i <= count; i++) {
    const projectedStart = addDays(referenceStartDate, avgCycleLength * i);
    const projectedEnd = addDays(projectedStart, avgDuration - 1);
    
    const ovulationOffset = avgCycleLength - LUTEAL_PHASE_LENGTH;
    const ovulationDate = addDays(projectedStart, ovulationOffset);
    
    const unsafeStart = addDays(ovulationDate, -5);
    const unsafeEnd = addDays(ovulationDate, 1);
    
    projections.push({
      startDate: projectedStart,
      endDate: projectedEnd,
      ovulationDate,
      unsafeWindow: {
        start: unsafeStart,
        end: unsafeEnd
      },
      isProjection: true
    });
  }
  
  return projections;
}

/**
 * Classifies a specific date according to the step-by-step mathematical rules.
 * Precedence: Logged Period -> Logged Ovulation -> Logged Unsafe Window -> Projected Period -> Projected Ovulation -> Projected Unsafe Window -> Safe Day
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Array} analyzedCycles - Logged cycles enriched with ovulation and unsafe windows
 * @param {Array} projectedCycles - Projected future cycles
 * @returns {{type: string, label: string, cycle?: Object, projection?: Object}}
 */
export function getDayClassification(dateStr, analyzedCycles, projectedCycles, todayStr = '2026-07-08') {
  if (!dateStr) return { type: 'SAFE', label: 'Safe Day' };

  // 1. Is it a logged menstrual period?
  for (const cycle of analyzedCycles) {
    const end = cycle.isOngoing ? todayStr : cycle.endDate;
    if (dateStr >= cycle.startDate && dateStr <= end) {
      return { type: 'PERIOD', label: cycle.isOngoing ? 'Active Period (Ongoing)' : 'Menstrual Period', cycle };
    }
  }

  // 2. Is it a computed ovulation day?
  for (const cycle of analyzedCycles) {
    if (dateStr === cycle.ovulationDate) {
      return { type: 'OVULATION', label: 'Ovulation Day', cycle };
    }
  }

  // 3. Is it within the unsafe window?
  for (const cycle of analyzedCycles) {
    if (cycle.unsafeWindow && dateStr >= cycle.unsafeWindow.start && dateStr <= cycle.unsafeWindow.end) {
      return { type: 'UNSAFE', label: 'High Fertility (Unsafe Window)', cycle };
    }
  }

  // 4a. Predicted Period
  for (const projection of projectedCycles) {
    if (dateStr >= projection.startDate && dateStr <= projection.endDate) {
      return { type: 'PREDICTED_PERIOD', label: 'Predicted Period', projection };
    }
  }

  // 4b. Predicted Ovulation
  for (const projection of projectedCycles) {
    if (dateStr === projection.ovulationDate) {
      return { type: 'PREDICTED_OVULATION', label: 'Predicted Ovulation', projection };
    }
  }

  // 4c. Predicted Unsafe Window
  for (const projection of projectedCycles) {
    if (projection.unsafeWindow && dateStr >= projection.unsafeWindow.start && dateStr <= projection.unsafeWindow.end) {
      return { type: 'PREDICTED_UNSAFE', label: 'Predicted High Fertility', projection };
    }
  }

  // 5. Default: Safe Day
  return { type: 'SAFE', label: 'Safe Day' };
}
