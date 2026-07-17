import React, { useState } from 'react';
import { Heart, Sparkles, Plus, Trash2, Calendar, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { validatePeriodDates, hasPeriodOverlap } from '../utils/cycleEngine.js';
import { getDaysBetween } from '../utils/dateHelpers.js';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  
  // Step 1: Profile State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [typicalCycle, setTypicalCycle] = useState(28);

  // Step 2: Past Periods State
  const [pastPeriods, setPastPeriods] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStart, setNewStart] = useState('2026-06-01');
  const [newEnd, setNewEnd] = useState('2026-06-05');
  const [flowIntensity, setFlowIntensity] = useState('medium');
  const [cramps, setCramps] = useState('mild');
  const [addError, setAddError] = useState('');

  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Please fill out all fields.');
      return;
    }
    setStep(2);
  };

  const handleAddPeriod = (e) => {
    e.preventDefault();
    setAddError('');

    const val = validatePeriodDates(newStart, newEnd);
    if (!val.isValid) {
      setAddError(val.error);
      return;
    }

    const newPeriod = {
      id: `onboard-${Date.now()}`,
      startDate: newStart,
      endDate: newEnd,
      flowIntensity,
      cramps
    };

    if (hasPeriodOverlap(pastPeriods, newPeriod)) {
      setAddError('This period overlaps with an already added period.');
      return;
    }

    setPastPeriods(prev => [...prev, newPeriod].sort((a, b) => a.startDate.localeCompare(b.startDate)));
    setShowAddForm(false);
    // Reset dates for convenience
    setNewStart('');
    setNewEnd('');
  };

  const handleDeletePeriod = (id) => {
    setPastPeriods(prev => prev.filter(p => p.id !== id));
  };

  const handleComplete = () => {
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col transition-all duration-300">
        
        {/* Step Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 flex">
          <div className={`h-full bg-rose-500 transition-all duration-500 ${
            step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'
          }`}></div>
        </div>

        <div className="p-8 flex flex-col gap-6">
          
          {/* Logo & Welcome Header */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="p-3 bg-rose-500 rounded-2xl text-white shadow-md animate-bounce-slow">
              <Heart className="h-8 w-8 fill-current" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">Selene Cycle Tracker</h1>
            <p className="text-xs text-rose-500 font-semibold tracking-wider uppercase">Onboarding Setup</p>
          </div>

          {/* STEP 1: Registration Profile */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="flex flex-col gap-4">
              <div className="text-center">
                <p className="text-sm text-slate-500 leading-relaxed">
                  Welcome to Selene, a local-only, private menstrual tracking and symptothermal calibration dashboard. Let's start with your profile.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Typical Cycle Length (Days)</label>
                <input
                  type="number"
                  min="21"
                  max="45"
                  value={typicalCycle}
                  onChange={(e) => setTypicalCycle(e.target.value)}
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
                />
                <span className="text-[10px] text-slate-400">If unsure, leave as 28 days. Selene will recalibrate dynamically.</span>
              </div>

              <button
                type="submit"
                className="mt-4 w-full py-3 bg-rose-500 text-white hover:bg-rose-600 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98]"
              >
                Continue Setup <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* STEP 2: Period History Questionnaire */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-800">Past Cycle Questionnaire</h2>
                <p className="text-xs text-slate-500 leading-normal mt-1">
                  Log any previous period start and end dates you remember. If you don't have records, you can skip this step.
                </p>
              </div>

              {/* Added Periods List */}
              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                {pastPeriods.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-xs italic">
                    No past periods added. Click "Add Past Period" below.
                  </div>
                ) : (
                  pastPeriods.map((p) => {
                    const days = getDaysBetween(p.startDate, p.endDate) + 1;
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-rose-400" />
                          <div>
                            <span className="font-bold text-slate-700">{p.startDate}</span>
                            <span className="text-slate-400 mx-1">to</span>
                            <span className="font-bold text-slate-700">{p.endDate}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-bold border border-rose-100 rounded-md">
                            {days} Days
                          </span>
                          <button
                            onClick={() => handleDeletePeriod(p.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Period Dialog In-place */}
              {showAddForm ? (
                <form onSubmit={handleAddPeriod} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Start Date</label>
                      <input
                        type="date"
                        value={newStart}
                        onChange={(e) => setNewStart(e.target.value)}
                        required
                        className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">End Date</label>
                      <input
                        type="date"
                        value={newEnd}
                        onChange={(e) => setNewEnd(e.target.value)}
                        required
                        className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Bleeding Level</label>
                      <select
                        value={flowIntensity}
                        onChange={(e) => setFlowIntensity(e.target.value)}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="light">Light</option>
                        <option value="medium">Medium</option>
                        <option value="heavy">Heavy</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Pain / Cramping</label>
                      <select
                        value={cramps}
                        onChange={(e) => setCramps(e.target.value)}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="none">None</option>
                        <option value="mild">Mild / Manageable</option>
                        <option value="severe">Severe</option>
                      </select>
                    </div>
                  </div>

                  {addError && (
                    <div className="text-[10px] text-rose-600 bg-rose-50 p-2 rounded-lg flex items-center gap-1 border border-rose-100">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>{addError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg text-xs"
                    >
                      Add Log
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold border border-rose-200 border-dashed rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Past Period Log
                </button>
              )}

              {/* Navigation Action Panel */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleComplete}
                    className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold rounded-xl text-xs"
                  >
                    Skip & Set
                  </button>
                  <button
                    type="button"
                    onClick={handleComplete}
                    className="px-5 py-2.5 bg-rose-500 text-white hover:bg-rose-600 font-semibold rounded-xl text-xs flex items-center gap-1 shadow-xs"
                  >
                    Done <Sparkles className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Setup Completed Summary */}
          {step === 3 && (
            <div className="flex flex-col gap-5 text-center">
              <div className="py-4 flex flex-col items-center">
                <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-100">
                  <Sparkles className="h-8 w-8 fill-current" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mt-4">Congratulations, {name}!</h2>
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mt-1">Calibrating Cycle Engine</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs leading-relaxed text-slate-500 text-left flex flex-col gap-2">
                <p>
                  Selene has initialized your account. Based on your inputs, the mathematical engine will now predict your cycle intervals, ovulation, and fertile windows.
                </p>
                <div className="flex gap-2 items-start text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-100 mt-1">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <p className="text-[10px] leading-normal font-medium">
                    Reminder: Calendar models are mathematical projections. Please utilize the daily **Symptothermal double-check** panel on your dashboard to input temperature and mucus parameters to verify ovulation in real time.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const profileData = {
                    name: name.trim(),
                    email: email.trim(),
                    typicalCycleLength: parseInt(typicalCycle, 10) || 28
                  };
                  onComplete(profileData, pastPeriods);
                }}
                className="mt-2 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                Enter Dashboard <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
