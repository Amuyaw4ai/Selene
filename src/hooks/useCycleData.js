import { useState, useEffect, useMemo } from 'react';
import { 
  validatePeriodDates, 
  hasPeriodOverlap, 
  sortPeriods, 
  getAverageCycleLength, 
  getAveragePeriodDuration,
  analyzeCycles, 
  projectFutureCycles 
} from '../utils/cycleEngine.js';

// Mock data to give the app a premium "ready-to-explore" feel on first load
const MOCK_PERIODS = [
  { id: 'mock-1', startDate: '2026-05-01', endDate: '2026-05-05' },
  { id: 'mock-2', startDate: '2026-05-29', endDate: '2026-06-02' }
];

const MOCK_SYMPTOMS = {
  // Let's add some mock symptoms for the active cycle to show it in action
  '2026-05-01': { bbt: 36.25, mucus: 'sticky' },
  '2026-05-14': { bbt: 36.12, mucus: 'egg_white' }, // Ovulation day
  '2026-05-15': { bbt: 36.62, mucus: 'creamy' }, // Temp rise post-ovulation
  '2026-05-29': { bbt: 36.31, mucus: 'sticky' }
};

import { formatDate } from '../utils/dateHelpers.js';

const TODAY_STR = formatDate(new Date());

export function useCycleData() {
  const [userProfile, setUserProfile] = useState(() => {
    try {
      // Migrate from bloom_user_profile to selene_user_profile if needed
      let saved = localStorage.getItem('selene_user_profile');
      if (!saved) {
        const legacySaved = localStorage.getItem('bloom_user_profile');
        if (legacySaved) {
          saved = legacySaved;
          localStorage.setItem('selene_user_profile', legacySaved);
          localStorage.removeItem('bloom_user_profile');
        }
      }
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Error loading user profile', e);
      return null;
    }
  });

  const [periods, setPeriods] = useState(() => {
    try {
      const saved = localStorage.getItem('cycle_tracker_periods_v2');
      // Default to empty array if no saved periods are found
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading periods from localStorage', e);
      return [];
    }
  });

  const [dailySymptoms, setDailySymptoms] = useState(() => {
    try {
      const saved = localStorage.getItem('cycle_tracker_symptoms');
      // Default to empty object if no saved symptoms are found
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Error loading symptoms from localStorage', e);
      return {};
    }
  });

  // Write changes to localStorage whenever periods state updates
  useEffect(() => {
    try {
      localStorage.setItem('cycle_tracker_periods_v2', JSON.stringify(periods));
    } catch (e) {
      console.error('Error saving periods to localStorage', e);
    }
  }, [periods]);

  // Write changes to localStorage whenever symptoms state updates
  useEffect(() => {
    try {
      localStorage.setItem('cycle_tracker_symptoms', JSON.stringify(dailySymptoms));
    } catch (e) {
      console.error('Error saving symptoms to localStorage', e);
    }
  }, [dailySymptoms]);

  // Write changes to localStorage whenever userProfile updates
  useEffect(() => {
    try {
      if (userProfile) {
        localStorage.setItem('selene_user_profile', JSON.stringify(userProfile));
      } else {
        localStorage.removeItem('selene_user_profile');
      }
    } catch (e) {
      console.error('Error saving user profile to localStorage', e);
    }
  }, [userProfile]);

  /**
   * Completes onboarding by saving profile and past logged periods.
   */
  const completeOnboarding = (profileData, initialPeriods = []) => {
    const profile = {
      ...profileData,
      isOnboarded: true
    };
    setUserProfile(profile);
    
    if (initialPeriods.length > 0) {
      const sorted = sortPeriods(initialPeriods);
      setPeriods(sorted);
    }
    return { success: true };
  };

  /**
   * Updates user profile info
   */
  const updateProfile = (updatedFields) => {
    setUserProfile(prev => prev ? { ...prev, ...updatedFields } : null);
  };

  // Derived mathematical states
  const sortedPeriods = useMemo(() => sortPeriods(periods), [periods]);
  const averageCycleLength = useMemo(() => getAverageCycleLength(sortedPeriods), [sortedPeriods]);
  const averagePeriodDuration = useMemo(() => getAveragePeriodDuration(sortedPeriods), [sortedPeriods]);
  
  const analyzedCycles = useMemo(() => analyzeCycles(sortedPeriods), [sortedPeriods, averageCycleLength]);
  const projectedCycles = useMemo(() => projectFutureCycles(sortedPeriods, 3), [sortedPeriods, averageCycleLength, averagePeriodDuration]);

  /**
   * Adds a new period log, enforcing validation and overlap checks.
   */
  const addPeriod = (startDate, endDate, isOngoing = false) => {
    const val = validatePeriodDates(startDate, endDate, isOngoing);
    if (!val.isValid) return { success: false, error: val.error };

    const newPeriod = { 
      id: `period-${Date.now()}`, 
      startDate, 
      endDate: isOngoing ? null : endDate,
      isOngoing 
    };
    if (hasPeriodOverlap(periods, newPeriod, -1, TODAY_STR)) {
      return { success: false, error: 'This period overlaps with an existing logged period.' };
    }

    setPeriods(prev => sortPeriods([...prev, newPeriod]));
    return { success: true };
  };

  /**
   * Updates an existing period log.
   */
  const updatePeriod = (id, startDate, endDate, isOngoing = false) => {
    const val = validatePeriodDates(startDate, endDate, isOngoing);
    if (!val.isValid) return { success: false, error: val.error };

    const periodIndex = periods.findIndex(p => p.id === id);
    if (periodIndex === -1) return { success: false, error: 'Period log not found.' };

    const updatedPeriod = { 
      id, 
      startDate, 
      endDate: isOngoing ? null : endDate,
      isOngoing 
    };
    if (hasPeriodOverlap(periods, updatedPeriod, periodIndex, TODAY_STR)) {
      return { success: false, error: 'This period overlaps with an existing logged period.' };
    }

    setPeriods(prev => {
      const copy = [...prev];
      copy[periodIndex] = updatedPeriod;
      return sortPeriods(copy);
    });
    return { success: true };
  };

  /**
   * Deletes a period log.
   */
  const deletePeriod = (id) => {
    setPeriods(prev => prev.filter(p => p.id !== id));
    return { success: true };
  };

  /**
   * Logs or updates symptoms for a specific day.
   * If both bbt and mucus are empty, deletes the key to keep storage clean.
   */
  const logSymptoms = (dateStr, symptoms) => {
    if (!dateStr) return { success: false, error: 'Invalid date.' };

    setDailySymptoms(prev => {
      const updated = { ...prev };
      const current = updated[dateStr] || {};
      
      const nextSymptoms = {
        ...current,
        ...symptoms
      };

      // Clean up empty fields
      if (nextSymptoms.bbt === undefined || nextSymptoms.bbt === null || nextSymptoms.bbt === '') {
        delete nextSymptoms.bbt;
      }
      if (!nextSymptoms.mucus) {
        delete nextSymptoms.mucus;
      }

      // If no data remains for this day, delete the key entirely
      if (Object.keys(nextSymptoms).length === 0) {
        delete updated[dateStr];
      } else {
        updated[dateStr] = nextSymptoms;
      }

      return updated;
    });

    return { success: true };
  };

  /**
   * Resets all cycle and symptom data back to defaults or empty.
   */
  const resetData = (empty = false) => {
    if (empty) {
      setPeriods([]);
      setDailySymptoms({});
      setUserProfile(null);
      localStorage.removeItem('selene_user_profile');
    } else {
      setPeriods(MOCK_PERIODS);
      setDailySymptoms(MOCK_SYMPTOMS);
      const mockProfile = {
        name: 'Jane Doe',
        email: 'jane@seleneapp.com',
        typicalCycleLength: 28,
        isOnboarded: true
      };
      setUserProfile(mockProfile);
      localStorage.setItem('selene_user_profile', JSON.stringify(mockProfile));
    }
  };

  return {
    userProfile,
    periods: sortedPeriods,
    dailySymptoms,
    averageCycleLength,
    averagePeriodDuration,
    analyzedCycles,
    projectedCycles,
    completeOnboarding,
    updateProfile,
    addPeriod,
    updatePeriod,
    deletePeriod,
    logSymptoms,
    resetData
  };
}
