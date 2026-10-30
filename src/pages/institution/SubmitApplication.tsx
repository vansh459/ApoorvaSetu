import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Building2,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const SubmitApplication: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNewApplication, showToast } = useApp();

  const [step, setStep] = useState(1);
  const [appType, setAppType] = useState('Extension of Approval (EoA)');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [proposedIntake, setProposedIntake] = useState('540');
  const [programList, setProgramList] = useState('Computer Science & Engg, AI & Machine Learning, Data Science');
  const [undertakingAgreed, setUndertakingAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!undertakingAgreed) {
      alert('Please agree to the statutory institutional undertaking before submission.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newAppId = `APP2026-${Math.floor(1000 + Math.random() * 9000)}`;

      addNewApplication({
        id: newAppId,
        instituteId: user?.instituteId || 'INST-101',
        instituteName: user?.instituteName || 'ABC Institute of Tech',
        type: appType,
        region: user?.region || 'Northern',
        state: 'Uttar Pradesh',
        stage: 'Submitted',
        status: 'In Progress',
        appliedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        category: 'Engineering & Technology',
        intakeProposed: Number(proposedIntake) || 540,
        programs: programList.split(',').map((p) => p.trim()),
        contactEmail: user?.email || 'principal@abctech.edu.in',
        contactPhone: user?.phone || '+91 98765 43210',
        remarks: 'New Extension of Approval application submitted with complete fees and affidavits.'
      });

      setIsSubmitting(false);
      showToast(`Application ${newAppId} successfully submitted to AICTE National Portal`, 'success');
      navigate('/institution/tracking');
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Application Submission Wizard
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 font-medium">AY 2026-27 Approval Cycle</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Submit New Approval Application
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Submit Extension of Approval (EoA), program expansion, or intake variation requests to AICTE.
        </p>
      </div>

      {/* Stepper Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between text-xs font-semibold">
        {[
          { num: 1, label: 'Approval Type' },
          { num: 2, label: 'Intake & Programs' },
          { num: 3, label: 'Review & Submit' }
        ].map((s) => (
          <div key={s.num} className="flex items-center space-x-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s.num
                  ? 'bg-blue-600 text-white'
                  : step > s.num
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {step > s.num ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
            </span>
            <span className={step === s.num ? 'text-blue-700 font-bold' : 'text-slate-500'}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        {step === 1 && (
          <div className="space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Step 1: Select Approval Request Category
            </h2>

            <div className="space-y-2.5">
              {[
                { title: 'Extension of Approval (EoA)', desc: 'Annual renewal of approval for existing running programs' },
                { title: 'Increase in Approved Intake', desc: 'Expand student seat capacity in verified programs' },
                { title: 'Introduction of New Courses / Emerging Areas', desc: 'Add AI, Data Science, Cyber Security, or Green Tech disciplines' },
                { title: 'Closure of Non-viable Programs', desc: 'Phased or progressive closure of low-intake courses' }
              ].map((cat) => (
                <label
                  key={cat.title}
                  onClick={() => setAppType(cat.title)}
                  className={`p-3.5 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all ${
                    appType === cat.title
                      ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="appType"
                    checked={appType === cat.title}
                    onChange={() => setAppType(cat.title)}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <div className="font-bold text-slate-900">{cat.title}</div>
                    <div className="text-[11px] text-slate-500">{cat.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <span>Continue to Programs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Step 2: Intake Capacity & Academic Disciplines
            </h2>

            <div className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Proposed Total Intake Capacity (Seats)
                </label>
                <input
                  type="number"
                  value={proposedIntake}
                  onChange={(e) => setProposedIntake(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Offered Undergraduate / Postgraduate Programs (Comma-separated)
                </label>
                <textarea
                  rows={3}
                  value={programList}
                  onChange={(e) => setProgramList(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                ℹ️ The cadre ratio of 1:2:6 will automatically be audited by the Scrutiny Committee based on this intake number.
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center space-x-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <span>Review Declaration</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Step 3: Statutory Declaration & Submission
            </h2>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Institution:</span>
                <span className="font-bold text-slate-900">{user?.instituteName || 'ABC Institute of Tech'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Application Category:</span>
                <span className="font-bold text-blue-700">{appType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Proposed Seats:</span>
                <span className="font-bold text-slate-800">{proposedIntake}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Academic Year:</span>
                <span className="font-semibold text-slate-800">AY {academicYear}</span>
              </div>
            </div>

            <label className="flex items-start space-x-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={undertakingAgreed}
                onChange={(e) => setUndertakingAgreed(e.target.checked)}
                className="mt-0.5 text-blue-600 rounded-md"
              />
              <span className="text-slate-800 text-[11px] leading-relaxed">
                I hereby declare that all submitted land titles, fire safety NOCs, building approval plans, and faculty cadre registers comply with AICTE Approval Process Handbook (APH) 2026-27 norms.
              </span>
            </label>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center space-x-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !undertakingAgreed}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white rounded-xl font-bold flex items-center space-x-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Transmitting Application...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Official Application</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
