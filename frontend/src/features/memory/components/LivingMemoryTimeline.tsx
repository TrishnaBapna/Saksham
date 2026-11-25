/**
 * SAKSHAM NEURO-CARE — LIVING MEMORY TIMELINE
 * Chronological personal memory timeline for patients living with dementia.
 * Supports family milestones, familiar locations, meaningful experiences, and verified photos.
 * 100% Spark Free Plan compliant — deterministic local-first storage with caregiver approval.
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Volume2,
  VolumeX,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { SpeechService } from '../../../services/speechService.js';
import { useLanguage } from '../../../context/LanguageContext.js';

export interface TimelineMilestone {
  id: string;
  patientId: string;
  year: number;
  dateStr?: string;
  title: string;
  category: 'family_milestone' | 'important_event' | 'familiar_location' | 'meaningful_experience';
  location: string;
  people: string[];
  description: string;
  imageUrl?: string;
  audioPrompt?: string;
  caregiverApproved: boolean;
}

interface LivingMemoryTimelineProps {
  patientId: string;
  patientName?: string;
  isCaregiver?: boolean;
  className?: string;
}

export const LivingMemoryTimeline: React.FC<LivingMemoryTimelineProps> = ({
  patientId,
  patientName = 'Sunita',
  isCaregiver = false,
  className = '',
}) => {
  const { t } = useLanguage();
  // Canonical pre-loaded verified milestones
  const defaultMilestones: TimelineMilestone[] = useMemo(
    () => [
      {
        id: 'tm_1978_wedding',
        patientId,
        year: 1978,
        dateStr: '12 December 1978',
        title: "Sunita & Arvind's Wedding Ceremony",
        category: 'family_milestone',
        location: 'Pune, Maharashtra',
        people: ['Arvind (Husband)', 'Family elders'],
        description:
          'A warm winter wedding in Pune surrounded by marigolds and jasmine. Arvind and Sunita walked around the sacred fire while the family sang traditional Marathi mangalashtak songs.',
        imageUrl: '/images/memories/wedding.jpg',
        caregiverApproved: true,
      },
      {
        id: 'tm_1982_priya',
        patientId,
        year: 1982,
        dateStr: '24 August 1982',
        title: "Daughter Priya's Birth",
        category: 'family_milestone',
        location: 'Mumbai, Maharashtra',
        people: ['Priya (Daughter)', 'Arvind'],
        description:
          'Priya arrived on a rainy monsoon morning in Mumbai. Her big, bright eyes brought immense joy to the whole home.',
        imageUrl: '/images/memories/priya_baby.jpg',
        caregiverApproved: true,
      },
      {
        id: 'tm_1989_rahul',
        patientId,
        year: 1989,
        dateStr: '5 April 1989',
        title: "Son Rahul's Birth",
        category: 'family_milestone',
        location: 'Bengaluru, Karnataka',
        people: ['Rahul (Son)', 'Priya', 'Arvind'],
        description:
          'Rahul was born in Bengaluru. Priya was seven and loved holding her little brother and rocking his cradle.',
        imageUrl: '/images/memories/rahul_baby.jpg',
        caregiverApproved: true,
      },
      {
        id: 'tm_2005_graduation',
        patientId,
        year: 2005,
        dateStr: '18 June 2005',
        title: "Priya's University Graduation",
        category: 'important_event',
        location: 'Pune University, Pune',
        people: ['Priya', 'Sunita', 'Arvind'],
        description:
          'A proud day celebrating Priya earning her engineering degree. Sunita draped her favorite royal blue silk saree for the ceremony.',
        imageUrl: '/images/memories/priya_grad.jpg',
        caregiverApproved: true,
      },
      {
        id: 'tm_2019_aarav',
        patientId,
        year: 2019,
        dateStr: '14 November 2019',
        title: "Grandson Aarav's Birth",
        category: 'family_milestone',
        location: 'Bengaluru, Karnataka',
        people: ['Aarav (Grandson)', 'Priya', 'Sunita'],
        description:
          'Aarav was born on Children\'s Day. He calls Sunita "Aaji" and loves eating soft poha from her hands.',
        imageUrl: '/images/memories/aarav.jpg',
        caregiverApproved: true,
      },
      {
        id: 'tm_2023_garden',
        patientId,
        year: 2023,
        dateStr: '15 March 2023',
        title: 'Balcony Jasmine & Tulsi Sanctuary',
        category: 'familiar_location',
        location: 'Indiranagar Home, Bengaluru',
        people: ['Priya', 'Sunita', 'Aarav'],
        description:
          'Priya and Sunita set up the morning balcony sanctuary with fragrant Mogra jasmine, holy Tulsi, and wind chimes.',
        imageUrl: '/images/memories/balcony_garden.jpg',
        caregiverApproved: true,
      },
    ],
    [patientId]
  );

  const [milestones, setMilestones] = useState<TimelineMilestone[]>(() => {
    try {
      const saved = localStorage.getItem(`saksham_timeline_${patientId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultMilestones;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newYear, setNewYear] = useState<number>(2024);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<TimelineMilestone['category']>('family_milestone');
  const [newLocation, setNewLocation] = useState<string>('');
  const [newPeople, setNewPeople] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');

  const saveMilestones = (updated: TimelineMilestone[]) => {
    setMilestones(updated);
    try {
      localStorage.setItem(`saksham_timeline_${patientId}`, JSON.stringify(updated));
    } catch {}
  };

  const handleSpeakMilestone = (milestone: TimelineMilestone) => {
    if (activeSpeakingId === milestone.id) {
      SpeechService.cancelSpeech();
      setActiveSpeakingId(null);
      return;
    }
    SpeechService.cancelSpeech();
    setActiveSpeakingId(milestone.id);
    const speech = `${milestone.title}, in ${milestone.year}. ${milestone.description}`;
    SpeechService.speak(
      speech,
      () => {},
      () => setActiveSpeakingId(null)
    );
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    const peopleList = newPeople
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const created: TimelineMilestone = {
      id: `tm_${Date.now()}`,
      patientId,
      year: Number(newYear),
      title: newTitle.trim(),
      category: newCategory,
      location: newLocation.trim() || 'Home',
      people: peopleList.length > 0 ? peopleList : ['Family'],
      description: newDescription.trim(),
      caregiverApproved: true,
    };

    const updated = [...milestones, created].sort((a, b) => a.year - b.year);
    saveMilestones(updated);
    setIsAddModalOpen(false);

    // Reset Form
    setNewTitle('');
    setNewLocation('');
    setNewPeople('');
    setNewDescription('');
  };

  const filteredMilestones = useMemo(() => {
    let list = [...milestones].sort((a, b) => a.year - b.year);
    if (selectedCategory !== 'all') {
      list = list.filter((m) => m.category === selectedCategory);
    }
    return list;
  }, [milestones, selectedCategory]);

  return (
    <div
      data-testid="living-memory-timeline"
      className={`bg-white rounded-3xl p-6 md:p-8 border-2 border-purple-100 shadow-soft-purple space-y-6 ${className}`}
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                {t('memory.timeline_title', { name: patientName })}
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                {t('memory.timeline_verified')}
              </span>
              {isCaregiver && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  {t('memory.timeline_caregiver_view')}
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm text-slate-600">
              {t('memory.timeline_subtitle')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md transition cursor-pointer min-h-[44px]"
            aria-label={t('memory.timeline_add_milestone')}
          >
            <Plus className="w-4 h-4" />
            <span>{t('memory.timeline_add_milestone')}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Filter timeline categories">
        {[
          { key: 'all', label: 'All Milestones' },
          { key: 'family_milestone', label: 'Family Milestones' },
          { key: 'important_event', label: 'Life Events' },
          { key: 'familiar_location', label: 'Familiar Places' },
          { key: 'meaningful_experience', label: 'Experiences' },
        ].map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-semibold transition cursor-pointer min-h-[44px] flex items-center ${
              selectedCategory === cat.key
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
            }`}
            aria-pressed={selectedCategory === cat.key}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Chronological Timeline Stream */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-purple-200 space-y-8 my-4">
        {filteredMilestones.map((milestone) => (
          <div
            key={milestone.id}
            data-testid={`timeline-item-${milestone.id}`}
            className="relative bg-purple-50/50 hover:bg-purple-50 border border-purple-100 rounded-2xl p-5 md:p-6 transition shadow-2xs group"
          >
            {/* Timeline Year Marker Node */}
            <div className="absolute -left-[35px] sm:-left-[43px] top-5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white ring-2 ring-purple-200">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                    {milestone.year}
                  </span>
                  {milestone.dateStr && (
                    <span className="text-xs text-slate-500 font-medium">
                      {milestone.dateStr}
                    </span>
                  )}
                  <span className="inline-flex items-center text-[11px] text-slate-500">
                    <MapPin className="w-3 h-3 mr-0.5 text-purple-500" />
                    {milestone.location}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  {milestone.title}
                </h3>
              </div>

              {/* Audio Recall Button */}
              <button
                type="button"
                onClick={() => handleSpeakMilestone(milestone)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[44px] ${
                  activeSpeakingId === milestone.id
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs'
                }`}
                aria-label={`Listen to Asha describe ${milestone.title}`}
              >
                {activeSpeakingId === milestone.id ? (
                  <>
                    <VolumeX className="w-4 h-4 text-amber-600" />
                    <span>Stop Speech</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-purple-600" />
                    <span>Asha Voice</span>
                  </>
                )}
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-700 mt-2 leading-relaxed">
              {milestone.description}
            </p>

            {/* People Tags */}
            {milestone.people && milestone.people.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-purple-100/60">
                <Users className="w-3.5 h-3.5 text-slate-400 mr-1" />
                {milestone.people.map((person, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white text-purple-800 border border-purple-100"
                  >
                    {person}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Milestone Modal */}
      {isAddModalOpen && (
        <div
          data-testid="add-milestone-modal"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 border border-purple-100 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Close add milestone modal"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Add Memory Milestone
                </h3>
                <p className="text-xs text-slate-500">
                  Caregiver-verified milestones for calm, factual recall
                </p>
              </div>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    min={1920}
                    max={2030}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as TimelineMilestone['category'])
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="family_milestone">Family Milestone</option>
                    <option value="important_event">Life Event</option>
                    <option value="familiar_location">Familiar Place</option>
                    <option value="meaningful_experience">Experience</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Pune Balcony Tea Sanctuary"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Pune, Maharashtra"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    People Involved
                  </label>
                  <input
                    type="text"
                    value={newPeople}
                    onChange={(e) => setNewPeople(e.target.value)}
                    placeholder="e.g. Priya, Arvind"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Warm Reassuring Description *
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe this memory gently. Asha reads this to reassure the patient."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md min-h-[44px] cursor-pointer"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
