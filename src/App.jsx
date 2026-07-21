import React, { useState, useEffect, useMemo } from 'react'
import { 
  Calendar as CalendarIcon, 
  Activity, 
  AlertTriangle, 
  Heart, 
  Thermometer, 
  Droplet, 
  Sparkles, 
  Info,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  X,
  History,
  Menu
} from 'lucide-react'
import NavigationDrawer from './components/NavigationDrawer.jsx'

import { useCycleData } from './hooks/useCycleData.js'
import CalendarGrid from './components/CalendarGrid.jsx'
import SymptothermalForm from './components/SymptothermalForm.jsx'
import BbtChart from './components/BbtChart.jsx'
import Onboarding from './components/Onboarding.jsx'
import { getDaysBetween, addDays, parseDate, formatDate } from './utils/dateHelpers.js'
import { getDayClassification } from './utils/cycleEngine.js'
import DeductionModal from './components/DeductionModal.jsx'
import BbtModal from './components/BbtModal.jsx'
import CycleHistoryModal from './components/CycleHistoryModal.jsx'
import StatsModal from './components/StatsModal.jsx'
import HelpView from './components/HelpView.jsx'

const TODAY_STR = formatDate(new Date());

function App() {
  const {
    userProfile,
    periods,
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
  } = useCycleData();


  // Navigation states
  const todayDateObj = new Date();
  const [currentMonth, setCurrentMonth] = useState(todayDateObj.getMonth());
  const [currentYear, setCurrentYear] = useState(todayDateObj.getFullYear());
  const [selectedDate, setSelectedDate] = useState(TODAY_STR);
  const [calendarMode, setCalendarMode] = useState('gregorian');

  // Navigation Drawer & Info Modal overlay states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [infoTopic, setInfoTopic] = useState(null);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'analytics', 'bbt-trends', 'cycle-history'
  const [cycleHistoryActiveTab, setCycleHistoryActiveTab] = useState(0);

  // Period Logging Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState(null);
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');
  const [modalIsOngoing, setModalIsOngoing] = useState(false);
  const [modalError, setModalError] = useState('');

  // Handle month changes from calendar
  const handleMonthChange = (month, year) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  // Sync calendar month/year view whenever selectedDate changes
  useEffect(() => {
    const parsed = parseDate(selectedDate);
    if (parsed) {
      setCurrentMonth(parsed.getMonth());
      setCurrentYear(parsed.getFullYear());
    }
  }, [selectedDate]);

  // Open modal for adding a new period
  const handleOpenAddModal = () => {
    setEditingPeriodId(null);
    setModalStartDate(TODAY_STR);
    setModalEndDate(addDays(TODAY_STR, 4));
    setModalIsOngoing(false);
    setModalError('');
    setIsModalOpen(true);
  };

  // Open modal for editing an existing period
  const handleOpenEditModal = (period) => {
    setEditingPeriodId(period.id);
    setModalStartDate(period.startDate);
    setModalEndDate(period.endDate || '');
    setModalIsOngoing(!!period.isOngoing);
    setModalError('');
    setIsModalOpen(true);
  };

  // Handle saving from the modal (Add or Update)
  const handleSavePeriod = (e) => {
    e.preventDefault();
    setModalError('');

    let result;
    if (editingPeriodId) {
      result = updatePeriod(editingPeriodId, modalStartDate, modalEndDate, modalIsOngoing);
    } else {
      result = addPeriod(modalStartDate, modalEndDate, modalIsOngoing);
    }

    if (result.success) {
      setIsModalOpen(false);
    } else {
      setModalError(result.error);
    }
  };

  // Dynamic calculations based on state
  const latestPeriod = useMemo(() => {
    if (periods.length === 0) return null;
    return periods[periods.length - 1];
  }, [periods]);

  // Current Cycle Day
  const currentCycleDay = useMemo(() => {
    if (!latestPeriod) return null;
    
    // Calculate difference between start of latest period and today
    // Check if today is before the start of this period
    if (TODAY_STR < latestPeriod.startDate) return null;
    
    const diff = getDaysBetween(latestPeriod.startDate, TODAY_STR);
    
    // If it's a realistic cycle length (e.g. within 60 days)
    if (diff < 60) {
      return diff + 1; // 1-indexed
    }
    return null;
  }, [latestPeriod]);

  const completedCyclesCount = useMemo(() => {
    return analyzedCycles.filter(c => c.cycleLength !== null).length;
  }, [analyzedCycles]);

  // Current Cycle Phase (Menstrual, Follicular, Ovulatory, Luteal)
  const currentCyclePhase = useMemo(() => {
    if (!currentCycleDay) return 'Log a period to begin';
    
    const classification = getDayClassification(TODAY_STR, analyzedCycles, projectedCycles, TODAY_STR);
    if (classification.type === 'PERIOD' || classification.type === 'PREDICTED_PERIOD') {
      return 'Menstrual phase';
    }
    
    if (currentCycleDay <= 13) return 'Follicular phase';
    if (currentCycleDay <= 15) return 'Ovulatory phase';
    return 'Luteal phase';
  }, [currentCycleDay, analyzedCycles, projectedCycles]);

  // Next Predicted Ovulation
  const nextPredictedOvulationInfo = useMemo(() => {
    if (projectedCycles.length === 0) return null;
    
    // Find first predicted ovulation after or equal to today
    const nextOv = projectedCycles.find(p => p.ovulationDate >= TODAY_STR);
    if (!nextOv) return null;
    
    const daysUntil = getDaysBetween(TODAY_STR, nextOv.ovulationDate);
    const dateObj = parseDate(nextOv.ovulationDate);
    const formattedDate = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    
    return {
      dateStr: nextOv.ovulationDate,
      formattedDate,
      daysUntil
    };
  }, [projectedCycles]);

  // Fertility Status Today
  const fertilityStatusToday = useMemo(() => {
    const classification = getDayClassification(TODAY_STR, analyzedCycles, projectedCycles, TODAY_STR);
    
    switch (classification.type) {
      case 'PERIOD':
        return { text: 'Menstruation', colorClass: 'text-rose-600 bg-rose-50 border-rose-100', desc: 'Active bleeding days' };
      case 'OVULATION':
        return { text: 'Peak Ovulation', colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-100', desc: 'Ovulation detected today' };
      case 'UNSAFE':
        return { text: 'High Fertility', colorClass: 'text-amber-700 bg-amber-50 border-amber-200', desc: 'Within computed unsafe window' };
      case 'PREDICTED_PERIOD':
        return { text: 'Predicted Period', colorClass: 'text-rose-500 bg-rose-50/50 border-rose-100 border-dashed', desc: 'Bleeding anticipated' };
      case 'PREDICTED_OVULATION':
        return { text: 'Predicted Ovulation', colorClass: 'text-emerald-600 bg-emerald-50/50 border-emerald-100 border-dashed', desc: 'Ovulation anticipated' };
      case 'PREDICTED_UNSAFE':
        return { text: 'Predicted Fertility', colorClass: 'text-amber-600 bg-amber-50/50 border-amber-100 border-dashed', desc: 'High risk window predicted' };
      case 'SAFE':
      default:
        return { text: 'Low Fertility', colorClass: 'text-slate-600 bg-slate-50 border-slate-200', desc: 'Outside of fertile window' };
    }
  }, [analyzedCycles, projectedCycles]);

  // Detailed view of selected date
  const selectedDateClassification = useMemo(() => {
    return getDayClassification(selectedDate, analyzedCycles, projectedCycles, TODAY_STR);
  }, [selectedDate, analyzedCycles, projectedCycles]);

  const selectedDateFormatted = useMemo(() => {
    const d = parseDate(selectedDate);
    if (!d) return '';
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [selectedDate]);

  if (!userProfile || !userProfile.isOnboarded) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500 rounded-xl text-white shadow-xs">
              <Heart className="h-6 w-6 fill-current animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">Selene</h1>
              <span className="text-xs text-rose-500 font-medium">Cycle Tracker & Ovulation Predictor</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 hidden sm:inline">Hello, {userProfile?.name}</span>
            
            {/* Direct Link to Dedicated Analytics View */}
            <button
              onClick={() => setCurrentView('analytics')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer select-none ${
                currentView === 'analytics'
                  ? 'bg-indigo-650 border-indigo-700 text-white hover:bg-indigo-750'
                  : 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200/50 text-indigo-650'
              }`}
              title="View cycle statistics & analytics"
            >
              <Activity className="h-4 w-4 shrink-0" />
              <span>Analytics Insights</span>
            </button>

            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 border border-slate-200/60 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
              title="Open Settings & Charts Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {currentView === 'dashboard' && (
          <>
            {/* Dynamic Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
              {/* Card 1: Cycle Day */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-rose-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    Current Cycle
                    <button 
                      onClick={() => setInfoTopic('phases')}
                      className="text-slate-300 hover:text-indigo-500 transition-colors p-0.5 cursor-pointer"
                      title="Understanding cycle phases"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </span>
                  <Activity className="h-5 w-5 text-rose-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900">
                  {currentCycleDay ? `Day ${currentCycleDay}` : 'No cycle active'}
                </div>
                <div className="text-xs text-slate-550 mt-1 flex justify-between items-center">
                  <span>{currentCyclePhase}</span>
                  {analyzedCycles.length > 0 && (
                    <span className="text-[10px] font-extrabold text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      Cycle #{analyzedCycles.length} of {analyzedCycles.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Avg Cycle */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-purple-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    Average Cycle
                    <button 
                      onClick={() => setInfoTopic('calculations')}
                      className="text-slate-300 hover:text-indigo-500 transition-colors p-0.5 cursor-pointer"
                      title="How cycles are calculated"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </span>
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900">{averageCycleLength} Days</div>
                <div className="text-xs text-slate-550 mt-1">
                  {completedCyclesCount === 0 
                    ? `Default baseline (0 completed / ${analyzedCycles.length} logged)` 
                    : `Based on ${completedCyclesCount} completed cycle${completedCyclesCount > 1 ? 's' : ''} (${analyzedCycles.length} total logged)`}
                </div>
              </div>

              {/* Card 3: Next Ovulation */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-emerald-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    Next Ovulation
                    <button 
                      onClick={() => setInfoTopic('symptothermal')}
                      className="text-slate-300 hover:text-indigo-500 transition-colors p-0.5 cursor-pointer"
                      title="Understanding ovulation and temperature shifts"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </span>
                  <Thermometer className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900">
                  {nextPredictedOvulationInfo 
                    ? `In ${nextPredictedOvulationInfo.daysUntil} Days` 
                    : 'N/A'}
                </div>
                <div className="text-xs text-slate-550 mt-1">
                  {nextPredictedOvulationInfo 
                    ? `Predicted: ${nextPredictedOvulationInfo.formattedDate} (Cycle #${analyzedCycles.length + 1})` 
                    : 'Log a period to project'}
                </div>
              </div>

              {/* Card 4: Fertility Status Today */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-amber-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    Today's Fertility
                    <button 
                      onClick={() => setInfoTopic('disclaimer')}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                      title="Read safety limitations"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </span>
                  <Droplet className="h-5 w-5 text-amber-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900">
                  {fertilityStatusToday.text}
                </div>
                <div className="text-xs text-slate-550 mt-1 font-medium leading-relaxed">
                  {fertilityStatusToday.desc} {analyzedCycles.length > 0 ? `• Cycle #${analyzedCycles.length}` : ''}
                </div>
              </div>
            </div>

            {/* Dashboard Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              {/* Calendar Left Column */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-fit">
                <CalendarGrid
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  onMonthChange={handleMonthChange}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  analyzedCycles={analyzedCycles}
                  projectedCycles={projectedCycles}
                  dailySymptoms={dailySymptoms}
                  todayStr={TODAY_STR}
                  calendarMode={calendarMode}
                  onCalendarModeChange={setCalendarMode}
                  averageCycleLength={averageCycleLength}
                  periods={periods}
                />
              </div>

              {/* Sidebar Area */}
              <div className="flex flex-col gap-6">
                {/* Selected Date Overview Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Date Focus</h3>
                    <h4 className="text-md font-bold text-slate-900 mt-1">{selectedDateFormatted}</h4>
                    <p className="text-xs text-slate-500 mt-1">{selectedDate === TODAY_STR ? '(Simulated Today)' : ''}</p>
                  </div>

                  {/* Classification Badge */}
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                    <div className="flex-1">
                      <span className="text-xs text-slate-400 font-semibold block uppercase">Computed State</span>
                      <span className="text-sm font-bold text-slate-800 mt-0.5 block">{selectedDateClassification.label}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {/* Visual Circle Indicator */}
                      <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                        selectedDateClassification.type === 'PERIOD' ? 'bg-rose-500' :
                        selectedDateClassification.type === 'OVULATION' ? 'bg-emerald-500' :
                        selectedDateClassification.type === 'UNSAFE' ? 'bg-amber-400' :
                        selectedDateClassification.type === 'PREDICTED_PERIOD' ? 'bg-rose-300 animate-pulse' :
                        selectedDateClassification.type === 'PREDICTED_OVULATION' ? 'bg-emerald-300 animate-pulse' :
                        selectedDateClassification.type === 'PREDICTED_UNSAFE' ? 'bg-amber-300 animate-pulse' :
                        'bg-slate-200'
                      }`}></span>
                      <button 
                        onClick={() => setIsDeductionModalOpen(true)}
                        className="text-[10px] font-bold text-indigo-650 hover:text-indigo-850 transition-colors uppercase tracking-wider underline cursor-pointer select-none"
                      >
                        Review Math
                      </button>
                    </div>
                  </div>

                  {/* Symptothermal Log Form */}
                  <div className="bg-white border border-slate-100/50 p-1 rounded-xl">
                    <SymptothermalForm
                      selectedDate={selectedDate}
                      symptoms={dailySymptoms[selectedDate]}
                      onSave={logSymptoms}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {currentView === 'analytics' && (
          <StatsModal
            onClose={() => setCurrentView('dashboard')}
            periods={periods}
            analyzedCycles={analyzedCycles}
            projectedCycles={projectedCycles}
            dailySymptoms={dailySymptoms}
            averageCycleLength={averageCycleLength}
            todayStr={TODAY_STR}
          />
        )}

        {currentView === 'bbt-trends' && (
          <BbtModal
            onClose={() => setCurrentView('dashboard')}
            periods={periods}
            dailySymptoms={dailySymptoms}
            averageCycleLength={averageCycleLength}
          />
        )}

        {currentView === 'cycle-history' && (
          <CycleHistoryModal
            onClose={() => setCurrentView('dashboard')}
            periods={periods}
            analyzedCycles={analyzedCycles}
            projectedCycles={projectedCycles}
            dailySymptoms={dailySymptoms}
            averageCycleLength={averageCycleLength}
            onOpenAddPeriod={handleOpenAddModal}
            onOpenEditPeriod={handleOpenEditModal}
            onDeletePeriod={deletePeriod}
            initialTab={cycleHistoryActiveTab}
            todayStr={TODAY_STR}
          />
        )}

        {currentView === 'help' && (
          <HelpView
            onClose={() => setCurrentView('dashboard')}
          />
        )}
      </main>

      {/* Period Logging Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                {editingPeriodId ? 'Edit Menstrual Period' : 'Log Menstrual Period'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePeriod} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={modalStartDate}
                  onChange={(e) => setModalStartDate(e.target.value)}
                  required
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                />
              </div>

              {/* Ongoing Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-3xs">
                <input
                  type="checkbox"
                  checked={modalIsOngoing}
                  onChange={(e) => {
                    setModalIsOngoing(e.target.checked);
                    if (e.target.checked) {
                      setModalEndDate('');
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-350 text-rose-500 focus:ring-rose-500/10 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 select-none">
                  Ongoing period (active bleeding now)
                </span>
              </label>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date (Active Bleeding Ends)</label>
                <input
                  type="date"
                  value={modalEndDate}
                  onChange={(e) => setModalEndDate(e.target.value)}
                  required={!modalIsOngoing}
                  disabled={modalIsOngoing}
                  className={`p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium ${
                    modalIsOngoing ? 'opacity-40 cursor-not-allowed bg-slate-100' : ''
                  }`}
                />
              </div>

              {modalError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 text-xs text-rose-600 p-3 rounded-xl">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{modalError}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white transition-all active:scale-95 rounded-xl text-xs font-bold shadow-3xs uppercase tracking-wider"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400 flex flex-col gap-2">
          <p>© 2026 Selene Cycle Tracker. All calculations are mathematical approximations and should not be used as contraception.</p>
          <p className="max-w-3xl mx-auto leading-relaxed text-[10px] text-slate-450">
            <strong>Medical Note:</strong> Selene is an adaptive mathematical cycle tracking model. It is not a physical verification of ovulation and does not constitute medical advice or diagnostic service. Standard calendar-based tracking methods exhibit typical failure rates between 12% and 24%. Users are encouraged to double-check fertility indicators via symptothermal readings (daily waking temperature logging and cervical mucus consistency tracking).
          </p>
        </div>
      </footer>

      {/* Settings & Info Slide-out Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        userProfile={userProfile}
        periods={periods}
        onResetData={resetData}
        onOpenBbtModal={() => {
          setIsDrawerOpen(false);
          setCurrentView('bbt-trends');
        }}
        onOpenCycleHistoryModal={(tab) => {
          setIsDrawerOpen(false);
          setCycleHistoryActiveTab(tab);
          setCurrentView('cycle-history');
        }}
        onOpenHelpPage={() => {
          setIsDrawerOpen(false);
          setCurrentView('help');
        }}
      />

      {/* Information Modal Overlay */}
      {infoTopic && (
        <div 
          onClick={() => setInfoTopic(null)} 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-scale-up"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                {infoTopic === 'calculations' && 'Ovulation & Fertility Logic'}
                {infoTopic === 'symptothermal' && 'Symptothermal Double-Check'}
                {infoTopic === 'disclaimer' && 'Medical Disclaimer & Limitations'}
                {infoTopic === 'phases' && 'Cycle Phases & Ovulatory Biology'}
              </h3>
              <button 
                onClick={() => setInfoTopic(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs leading-relaxed text-slate-600 max-h-[300px] overflow-y-auto flex flex-col gap-3 pr-1 font-medium font-semibold">
              {infoTopic === 'calculations' && (
                <>
                  <p>
                    Selene utilizes a dynamic, personalized mathematical model that adapts to your actual cycle history rather than assuming a static 28-day schedule.
                  </p>
                  <p className="font-bold text-slate-800">Key Calculations:</p>
                  <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-500">
                    <li><strong>Cycle Length (L):</strong> The number of days between the start date of period i and the start date of period i+1.</li>
                    <li><strong>Rolling Average Cycle Length (Avg L):</strong> The mean length of all completed logged cycles. This acts as the baseline predictor.</li>
                    <li><strong>Ovulation Day Offset (O):</strong> Biologically, ovulation occurs approximately 14 days before the start of the next cycle. Thus, the offset is computed as O = L - 14.</li>
                    <li><strong>7-Day Fertile (Unsafe) Window:</strong> Modeled mathematically based on sperm longevity (up to 5 days) and egg viability (1 day). The window is calculated as [Ovulation - 5 days, Ovulation + 1 day].</li>
                  </ul>
                </>
              )}

              {infoTopic === 'symptothermal' && (
                <>
                  <p>
                    Calendar-based calculations are mathematical approximations. The **Symptothermal Method** is a dual-indicator protocol that cross-references calendar models with physical biological markers.
                  </p>
                  <p className="font-bold text-slate-800">How to observe parameters daily:</p>
                  <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-500">
                    <li><strong>Basal Body Temperature (BBT):</strong> Measure your body temperature immediately upon waking, before getting out of bed. Post-ovulation, progesterone triggers a sustained rise of **0.3°C to 0.5°C**, confirming ovulation has occurred.</li>
                    <li><strong>Cervical Mucus Texture:</strong> Observe sensations and consistency during restroom visits. High-fertility mucus is clear, wet, and stretches (like raw egg-white) between fingers, aiding sperm survival and mobility.</li>
                    <li><strong>Double-Check Validation:</strong> When both the calendar projection, egg-white mucus, and the post-ovulation thermal shift align, you can verify your ovulation with high clinical confidence.</li>
                  </ul>
                </>
              )}

              {infoTopic === 'disclaimer' && (
                <>
                  <p>
                    This application is a mathematical simulation designed for personal educational tracking and health awareness.
                  </p>
                  <p className="font-bold text-rose-600">CRITICAL SAFETY LIMITATIONS:</p>
                  <ul className="list-disc pl-5 flex flex-col gap-1.5 text-rose-700">
                    <li><strong>Not Contraception:</strong> Under no circumstances should this application be used as a contraceptive method to prevent pregnancy. Calendar formulas have typical failure rates of **12% to 24%**.</li>
                    <li><strong>Irregular Cycles:</strong> Travel, stress, diet, sleep, and illness can cause sudden cycle shifts that calendar mathematical models cannot anticipate.</li>
                    <li><strong>Not Medical Diagnostic Tool:</strong> This dashboard does not replace professional consultation, diagnosis, or treatment by a physician or gynecologist. Always seek medical advice for changes in your body.</li>
                  </ul>
                </>
              )}

              {infoTopic === 'phases' && (
                <>
                  <p>
                    A menstrual cycle is divided into distinct biological phases based on ovarian follicle growth and uterine lining changes:
                  </p>
                  <p className="font-bold text-slate-800">The 4 Key Cycle Phases:</p>
                  <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-500">
                    <li><strong>Menstrual Phase (Days 1–5):</strong> The cycle begins on Day 1 of bleeding, where the uterus sheds its lining. <em>Biologically, menstruation is the first sub-phase of the follicular phase, as new follicles are already beginning to mature.</em></li>
                    <li><strong>Follicular Phase (Days 1–13):</strong> Overlapping with menstruation, follicles grow in the ovaries and secrete estrogen to build a new uterine lining.</li>
                    <li><strong>Ovulatory Phase (Days 14–15):</strong> A surge in Luteinizing Hormone (LH) triggers the ovary to release the mature egg.</li>
                    <li><strong>Luteal Phase (Days 16–28+):</strong> The empty follicle becomes the corpus luteum, secreting progesterone to support a potential pregnancy. If fertilization does not occur, hormone levels drop, triggering a new cycle.</li>
                  </ul>
                </>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-3 mt-1">
              <button
                onClick={() => setInfoTopic(null)}
                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold select-none cursor-pointer"
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deduction Modal (Calculation Review) */}
      <DeductionModal
        isOpen={isDeductionModalOpen}
        onClose={() => setIsDeductionModalOpen(false)}
        selectedDate={selectedDate}
        classification={selectedDateClassification}
        analyzedCycles={analyzedCycles}
        averageCycleLength={averageCycleLength}
        averagePeriodDuration={averagePeriodDuration}
      />
    </div>
  )
}

export default App
