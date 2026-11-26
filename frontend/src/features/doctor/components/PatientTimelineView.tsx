/**
 * SAKSHAM NEURO-CARE — STAGE 3 PHASE D
 * Patient Longitudinal Timeline View
 * Chronological visualization of daily routines, cognitive engagement,
 * adaptive changes, and caregiver observations with strict source attribution.
 * 100% Spark Free Plan compliant.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  CalendarCheck2,
  Gamepad2,
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Info,
  RefreshCw,
  Brain,
} from 'lucide-react';
import {
  LongitudinalReportService,
} from '../services/longitudinalReportService.js';
import {
  TimelineEvent,
  TimelineEventCategory,
} from '../types/longitudinal.types.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getClinicianUi } from '../../portals/utils/clinicianTranslation.js';

interface PatientTimelineViewProps {
  patientId: string;
  patientName: string;
  isAuthorized: boolean;
  className?: string;
}

type PeriodChoice = '7d' | '30d' | '90d' | 'custom';

export const PatientTimelineView: React.FC<PatientTimelineViewProps> = ({
  patientId,
  patientName,
  isAuthorized,
  className = '',
}) => {
  const { language } = useLanguage();
  const ui = getClinicianUi(language);
  const [period, setPeriod] = useState<PeriodChoice>('30d');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TimelineEventCategory>('all');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().substring(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().substring(0, 10);
  });

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Calculate start/end dates based on period choice
  const getDateRange = useCallback((): { startDate: string; endDate: string } => {
    const now = new Date();
    const endStr = now.toISOString().substring(0, 10);

    if (period === 'custom') {
      return { startDate: customStart, endDate: customEnd };
    }

    const start = new Date();
    if (period === '7d') {
      start.setDate(now.getDate() - 6);
    } else if (period === '30d') {
      start.setDate(now.getDate() - 29);
    } else if (period === '90d') {
      start.setDate(now.getDate() - 89);
    }
    return { startDate: start.toISOString().substring(0, 10), endDate: endStr };
  }, [period, customStart, customEnd]);

  const loadEvents = useCallback(async () => {
    if (!isAuthorized || !patientId) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const allEvents = await LongitudinalReportService.getTimelineEvents(
        patientId,
        startDate,
        endDate
      );
      setEvents(allEvents);
    } catch (err) {
      console.warn('[PatientTimelineView] Error loading timeline events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, isAuthorized, getDateRange]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = events.filter((e) => {
    if (categoryFilter === 'all') return true;
    return e.category === categoryFilter;
  });

  const getCategoryIcon = (category: TimelineEventCategory) => {
    switch (category) {
      case 'routine':
        return <CalendarCheck2 className="w-4 h-4 text-emerald-600" />;
      case 'game':
        return <Gamepad2 className="w-4 h-4 text-blue-600" />;
      case 'adaptive':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'caregiver_note':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'cognitive_concern':
        return <Brain className="w-4 h-4 text-rose-600" />;
      case 'clinical_assessment':
        return <FileText className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSourceBadge = (source: TimelineEvent['source']) => {
    switch (source) {
      case 'patient-reported':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {ui.tlPatientReported}
          </span>
        );
      case 'caregiver-reported':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            {ui.tlCaregiverReported}
          </span>
        );
      case 'system-recorded':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            {ui.tlSystemRecorded}
          </span>
        );
      case 'doctor-recorded':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            {ui.tlDoctorRecorded}
          </span>
        );
    }
  };

  if (!isAuthorized) {
    return (
      <div
        data-testid="timeline-unauthorized-banner"
        className="p-6 bg-gray-50 rounded-3xl border border-gray-200 text-center text-xs text-gray-500"
      >
        {ui.tlUnauthorized}
      </div>
    );
  }

  return (
    <div
      data-testid="patient-timeline-view"
      className={`bg-white rounded-3xl p-6 border border-gray-200 shadow-soft-purple space-y-5 ${className}`}
    >
      {/* Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span>{ui.tlHeaderBadge}</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {ui.tlSubtitlePrefix} {patientName}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['7d', '30d', '90d', 'custom'] as PeriodChoice[]).map((p) => (
            <button
              key={p}
              type="button"
              data-testid={`timeline-period-${p}`}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                period === p
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p === '7d' ? ui.tlPeriod7d : p === '30d' ? ui.tlPeriod30d : p === '90d' ? ui.tlPeriod90d : ui.tlPeriodCustom}
            </button>
          ))}
          <button
            type="button"
            onClick={loadEvents}
            title={ui.tlRefreshTitle}
            className="p-1.5 text-gray-400 hover:text-indigo-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Pickers (if Custom Selected) */}
      {period === 'custom' && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl text-xs">
          <label className="flex items-center gap-1.5 font-semibold text-gray-700">
            <span>{ui.tlFrom}</span>
            <input
              type="date"
              data-testid="timeline-custom-start"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs"
            />
          </label>
          <label className="flex items-center gap-1.5 font-semibold text-gray-700">
            <span>{ui.tlTo}</span>
            <input
              type="date"
              data-testid="timeline-custom-end"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs"
            />
          </label>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 mr-1" />
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1 rounded-full text-2xs font-bold shrink-0 transition ${
            categoryFilter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {ui.tlAllEvents} ({events.length})
        </button>
        <button
          type="button"
          data-testid="filter-routines"
          onClick={() => setCategoryFilter('routine')}
          className={`px-3 py-1 rounded-full text-2xs font-bold shrink-0 transition ${
            categoryFilter === 'routine'
              ? 'bg-emerald-700 text-white'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          {ui.tlRoutines} ({events.filter((e) => e.category === 'routine').length})
        </button>
        <button
          type="button"
          data-testid="filter-games"
          onClick={() => setCategoryFilter('game')}
          className={`px-3 py-1 rounded-full text-2xs font-bold shrink-0 transition ${
            categoryFilter === 'game'
              ? 'bg-blue-700 text-white'
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
          }`}
        >
          {ui.tlGames} ({events.filter((e) => e.category === 'game').length})
        </button>
        <button
          type="button"
          data-testid="filter-adaptive"
          onClick={() => setCategoryFilter('adaptive')}
          className={`px-3 py-1 rounded-full text-2xs font-bold shrink-0 transition ${
            categoryFilter === 'adaptive'
              ? 'bg-purple-700 text-white'
              : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
          }`}
        >
          {ui.tlAdaptive} ({events.filter((e) => e.category === 'adaptive').length})
        </button>
        <button
          type="button"
          data-testid="filter-notes"
          onClick={() => setCategoryFilter('caregiver_note')}
          className={`px-3 py-1 rounded-full text-2xs font-bold shrink-0 transition ${
            categoryFilter === 'caregiver_note'
              ? 'bg-amber-700 text-white'
              : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
          }`}
        >
          {ui.tlNotes} ({events.filter((e) => e.category === 'caregiver_note').length})
        </button>
        <button
          type="button"
          data-testid="filter-concerns"
          onClick={() => setCategoryFilter('cognitive_concern')}
          className={`px-3 py-1 rounded-full text-2xs font-bold shrink-0 transition ${
            categoryFilter === 'cognitive_concern'
              ? 'bg-rose-700 text-white'
              : 'bg-rose-50 text-rose-900 hover:bg-rose-100'
          }`}
        >
          {ui.tlConcerns} ({events.filter((e) => e.category === 'cognitive_concern').length})
        </button>
        <button
          type="button"
          data-testid="filter-assessments"
          onClick={() => setCategoryFilter('clinical_assessment')}
          className={`px-3 py-1 rounded-full text-2xs font-bold shrink-0 transition ${
            categoryFilter === 'clinical_assessment'
              ? 'bg-blue-700 text-white'
              : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
          }`}
        >
          {ui.tlAssessments} ({events.filter((e) => e.category === 'clinical_assessment').length})
        </button>
      </div>

      {/* Insufficient Data Notice (< 2 records) */}
      {events.length < 2 && !isLoading && (
        <div
          data-testid="timeline-insufficient-data-alert"
          className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5"
        >
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{ui.tlInsufficientTitle} </span>
            {ui.tlInsufficientBody}
          </div>
        </div>
      )}

      {/* Events List */}
      {isLoading ? (
        <div className="py-8 text-center text-xs text-gray-500 animate-pulse">
          {ui.tlLoading}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="py-8 text-center rounded-2xl bg-gray-50 text-gray-500 text-xs space-y-1">
          <p className="font-bold text-gray-700">{ui.tlNoRecords}</p>
          <p className="text-3xs text-gray-400">
            {ui.tlNoRecordsSub}
          </p>
        </div>
      ) : (
        <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-gray-100">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              data-testid={`timeline-event-${event.id}`}
              className={`p-4 rounded-2xl border transition relative ml-8 ${
                event.isInterrupted
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-white border-gray-200 hover:border-indigo-200'
              }`}
            >
              {/* Category Indicator Icon on timeline line */}
              <div className="absolute -left-8 top-4 w-7 h-7 rounded-xl bg-white border border-gray-200 shadow-2xs flex items-center justify-center -translate-x-1/2">
                {getCategoryIcon(event.category)}
              </div>

              {/* Event Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-gray-900">{event.title}</span>
                  {getSourceBadge(event.source)}
                  {event.isInterrupted ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                      {ui.tlInterrupted}
                    </span>
                  ) : event.status === 'completed' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                      {ui.tlCompleted}
                    </span>
                  ) : null}
                </div>

                <div className="text-3xs text-gray-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>{event.date}</span>
                  {event.metadata?.scheduledTime && (
                    <span>• {event.metadata.scheduledTime}</span>
                  )}
                </div>
              </div>

              {/* Event Description */}
              <p className="text-xs text-gray-600 leading-relaxed">{event.description}</p>

              {/* Metadata Pills */}
              {event.metadata && (
                <div className="flex items-center gap-2 flex-wrap pt-2 mt-2 border-t border-gray-100 text-3xs text-gray-500">
                  {event.metadata.attemptsUsed !== undefined && (
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                      {ui.tlRecallCuesLevel} {event.metadata.attemptsUsed}
                    </span>
                  )}
                  {event.metadata.hintsUsed !== undefined && event.metadata.hintsUsed > 0 && (
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                      {ui.tlHintsPrefix} {event.metadata.hintsUsed}
                    </span>
                  )}
                  {event.metadata.pauseCount !== undefined && event.metadata.pauseCount > 0 && (
                    <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-medium">
                      {ui.tlPausesPrefix} {event.metadata.pauseCount}
                    </span>
                  )}
                  {event.metadata.difficulty && (
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium">
                      {ui.tlPacingPrefix} {event.metadata.difficulty}
                    </span>
                  )}
                  {event.metadata.authorName && (
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                      {ui.tlByPrefix} {event.metadata.authorName}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Non-diagnostic Transparency Footer */}
      <div className="pt-3 border-t border-gray-100 text-3xs text-gray-400 flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span>
          {ui.tlFooterNotice}
        </span>
      </div>
    </div>
  );
};
