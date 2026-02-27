import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/apiService';
import {
  NewReleaseLinkOption,
  NewReleasesBlastConfig,
  NotificationRecord,
} from '../types';
import {
  BREATHING_SESSIONS_DEFAULT,
  NEW_RELEASES_BLAST_DEFAULT,
  NEW_RELEASE_LINK_OPTIONS_DEFAULT,
} from '../constants';

type ScheduledConfig = {
  id: string;
  time: string;
  title: string;
  body: string;
  runningInBackground: boolean;
};

const formatTimeForInput = (time24: string): string => {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
};

const parseTimeTo24 = (input: string): string => {
  const match = input.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return input;
  let h = parseInt(match[1], 10);
  const m = match[2];
  if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${m}`;
};

const NotificationCard: React.FC<{
  title: string;
  subtitle: string;
  timeBadge?: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}> = ({ title, subtitle, timeBadge, children, actions }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="font-serif text-xl font-bold text-deep-teal">{title}</h3>
        <p className="text-sm text-slate-500 font-medium mt-0.5">{subtitle}</p>
      </div>
      {timeBadge && (
        <span className="px-3 py-1 bg-amber-100/80 text-amber-800 rounded-full text-sm font-bold">
          {timeBadge}
        </span>
      )}
    </div>
    {children}
    <div className="flex gap-3 mt-6">{actions}</div>
  </div>
);

const fillTemplate = (template: string, params: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return typeof value === 'string' && value.trim() ? value.trim() : `{${key}}`;
  });

const hasUnresolvedTemplateParams = (value: string): boolean => /\{\w+\}/.test(value);

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Request failed';
};

const getStatusBadgeClass = (status: NotificationRecord['status']): string => {
  if (status === 'Failed') return 'bg-rose-100 text-rose-700';
  if (status === 'Pending') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
};

const toOpenRateWidth = (openRate: string): string => {
  const match = /^(\d{1,3})%$/.exec(openRate.trim());
  if (!match) return '0%';
  const value = Math.max(0, Math.min(100, Number(match[1])));
  return `${value}%`;
};

export const Notifications: React.FC = () => {
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [breathing, setBreathing] = useState<ScheduledConfig>(BREATHING_SESSIONS_DEFAULT as ScheduledConfig);
  const [breathingTimeInput, setBreathingTimeInput] = useState(formatTimeForInput(BREATHING_SESSIONS_DEFAULT.time));
  const [breathingCadence, setBreathingCadence] = useState<'daily' | 'occasional'>('daily');
  const [breathingIntervalDays, setBreathingIntervalDays] = useState('3');
  const [courseRemindersBg, setCourseRemindersBg] = useState(true);

  const [newReleases, setNewReleases] = useState<NewReleasesBlastConfig>(NEW_RELEASES_BLAST_DEFAULT);
  const [linkOptions, setLinkOptions] = useState<NewReleaseLinkOption[]>(NEW_RELEASE_LINK_OPTIONS_DEFAULT);
  const [selectedLinkOptionKey, setSelectedLinkOptionKey] = useState<string>(NEW_RELEASE_LINK_OPTIONS_DEFAULT[0]?.key || 'custom');
  const [linkParams, setLinkParams] = useState<Record<string, string>>({});
  const [sendingRelease, setSendingRelease] = useState(false);
  const [releaseMessage, setReleaseMessage] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const selectedLinkOption = useMemo(
    () => linkOptions.find(option => option.key === selectedLinkOptionKey) || null,
    [linkOptions, selectedLinkOptionKey],
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const [historyData, releaseOptions, scheduleConfig] = await Promise.all([
          apiService.getNotifications(),
          apiService.getNewReleaseLinkOptions(),
          apiService.getNotificationScheduleConfig(),
        ]);

        setHistory(historyData);
        setLinkOptions(releaseOptions.options);
        setBreathing({
          id: BREATHING_SESSIONS_DEFAULT.id,
          time: scheduleConfig.breathingTime,
          title: scheduleConfig.breathingTitle,
          body: scheduleConfig.breathingBody,
          runningInBackground: scheduleConfig.breathingEnabled,
        });
        setBreathingTimeInput(formatTimeForInput(scheduleConfig.breathingTime));
        setBreathingCadence(scheduleConfig.breathingCadence);
        setBreathingIntervalDays(String(scheduleConfig.breathingIntervalDays || 3));
        setCourseRemindersBg(scheduleConfig.courseRemindersEnabled);
        setSelectedLinkOptionKey(prev => (
          releaseOptions.options.some(option => option.key === prev)
            ? prev
            : (releaseOptions.options[0]?.key || 'custom')
        ));
      } catch (error) {
        console.error('Notifications page load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!selectedLinkOption || selectedLinkOptionKey === 'custom') {
      return;
    }

    setNewReleases(prev => ({
      ...prev,
      deepLink: fillTemplate(selectedLinkOption.template, linkParams),
    }));
  }, [selectedLinkOption, selectedLinkOptionKey, linkParams]);

  const handleSaveBreathing = async () => {
    try {
      const parsedTime = parseTimeTo24(breathingTimeInput);
      const intervalParsed = Number.parseInt(breathingIntervalDays, 10);
      const intervalDays = Number.isFinite(intervalParsed) && intervalParsed > 0 ? intervalParsed : 3;
      const next = {
        ...breathing,
        time: parsedTime || breathing.time,
      };

      setBreathing(next);
      setBreathingTimeInput(formatTimeForInput(next.time));
      setBreathingIntervalDays(String(intervalDays));

      await apiService.updateNotificationScheduleConfig({
        breathingTime: next.time,
        breathingTitle: next.title.trim(),
        breathingBody: next.body.trim(),
        breathingEnabled: breathing.runningInBackground,
        breathingCadence,
        breathingIntervalDays: intervalDays,
      });

      alert('Breathing sessions saved.');
    } catch (error) {
      alert(`Failed to save breathing sessions: ${extractErrorMessage(error)}`);
    }
  };

  const handleRunBreathing = async () => {
    try {
      await apiService.runBreathingSessionsCron({ force: true, manual: true });
      alert('Breathing sessions cron executed.');
    } catch (error) {
      alert(`Failed to run breathing sessions: ${extractErrorMessage(error)}`);
    }
  };

  const handleSaveCourse = async () => {
    try {
      await apiService.updateNotificationScheduleConfig({
        courseRemindersEnabled: courseRemindersBg,
      });
      alert('Course reminders saved.');
    } catch (error) {
      alert(`Failed to save course reminders: ${extractErrorMessage(error)}`);
    }
  };

  const handleRunCourse = async () => {
    try {
      await apiService.runCourseRemindersCron({ force: true });
      alert('Course reminders cron executed.');
    } catch (error) {
      alert(`Failed to run course reminders: ${extractErrorMessage(error)}`);
    }
  };

  const handleSelectLinkOption = (key: string) => {
    setSelectedLinkOptionKey(key);
    if (key === 'custom') {
      return;
    }

    const option = linkOptions.find(item => item.key === key);
    if (!option) {
      return;
    }

    setLinkParams(prev => {
      const next: Record<string, string> = {};
      option.requiredParams.forEach(param => {
        next[param] = prev[param] || '';
      });
      return next;
    });
  };

  const handleLinkParamChange = (key: string, value: string) => {
    setLinkParams(prev => ({ ...prev, [key]: value }));
  };

  const handleSendRelease = async () => {
    setReleaseMessage(null);
    setReleaseError(null);

    const title = newReleases.title.trim();
    const body = newReleases.body.trim();
    const deepLink = newReleases.deepLink.trim();

    if (!title || !body || !deepLink) {
      setReleaseError('Title, message, and deep link are required.');
      return;
    }

    if (hasUnresolvedTemplateParams(deepLink)) {
      setReleaseError('Please fill all required deep-link parameters before sending.');
      return;
    }

    setSendingRelease(true);

    try {
      const result = await apiService.sendNewRelease({
        ...newReleases,
        title,
        body,
        deepLink,
      });

      if (result?.queued) {
        const displayDate = result.scheduledAt ? new Date(result.scheduledAt).toLocaleString() : 'scheduled time';
        setReleaseMessage(`Campaign queued for ${displayDate}.`);
      } else {
        const sent = result?.result?.successCount ?? 0;
        const total = result?.result?.stats?.tokenCount ?? result?.result?.totalDevices ?? 0;
        setReleaseMessage(`New release sent: ${sent} successful deliveries${total ? ` out of ${total} device tokens` : ''}.`);
      }

      const historyData = await apiService.getNotifications();
      setHistory(historyData);
    } catch (error) {
      setReleaseError(extractErrorMessage(error));
    } finally {
      setSendingRelease(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-deep-teal">Notification Center</h1>
        <p className="text-slate-500 font-medium mt-1">Configure engagement channels and review communication history.</p>
      </header>

      {/* Breathing sessions */}
      <NotificationCard
        title="Breathing sessions"
        subtitle="Standalone breathwork prompts based on each user's local timezone."
        timeBadge={breathing.time}
        actions={
          <>
            <button
              onClick={handleSaveBreathing}
              className="px-6 py-2.5 bg-deep-teal text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
            >
              Save breathing
            </button>
            <button
              onClick={handleRunBreathing}
              className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
            >
              Run now
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">TIME</label>
            <div className="relative">
              <input
                type="text"
                value={breathingTimeInput}
                onChange={e => setBreathingTimeInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl pr-10 focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none"
                placeholder="08:00 AM"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🕐</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">CADENCE</label>
              <select
                value={breathingCadence}
                onChange={e => setBreathingCadence(e.target.value as 'daily' | 'occasional')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none"
              >
                <option value="daily">Daily</option>
                <option value="occasional">Occasional</option>
              </select>
            </div>

            {breathingCadence === 'occasional' && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">INTERVAL (DAYS)</label>
                <input
                  type="number"
                  min={1}
                  value={breathingIntervalDays}
                  onChange={e => setBreathingIntervalDays(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none"
                />
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={breathing.runningInBackground}
              onChange={() => setBreathing(prev => ({ ...prev, runningInBackground: !prev.runningInBackground }))}
              className="rounded border-slate-300 text-teal-primary focus:ring-teal-primary"
            />
            Running in background job
          </label>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">TITLE</label>
            <input
              type="text"
              value={breathing.title}
              onChange={e => setBreathing(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">BODY</label>
            <textarea
              value={breathing.body}
              onChange={e => setBreathing(prev => ({ ...prev, body: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none resize-none"
            />
          </div>
        </div>
      </NotificationCard>

      {/* Course reminders */}
      <NotificationCard
        title="Course reminders"
        subtitle="Checks progress on your cron cadence (recommended every 20 minutes)."
        timeBadge={undefined}
        actions={
          <>
            <button
              onClick={handleSaveCourse}
              className="px-6 py-2.5 bg-deep-teal text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
            >
              Save course
            </button>
            <button
              onClick={handleRunCourse}
              className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
            >
              Run now
            </button>
          </>
        }
      >
        <div className="flex justify-end">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={courseRemindersBg}
              onChange={() => setCourseRemindersBg(!courseRemindersBg)}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            Running in background job
          </label>
        </div>
      </NotificationCard>

      {/* New releases blast */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
        <h3 className="font-serif text-xl font-bold text-deep-teal">New releases blast</h3>
        <p className="text-sm text-slate-500 font-medium mt-0.5 mb-4">
          Send immediate announcements with app route deep links.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Notification Title</label>
            <input
              type="text"
              value={newReleases.title}
              onChange={e => setNewReleases(n => ({ ...n, title: e.target.value }))}
              maxLength={50}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Notification Message Body</label>
            <textarea
              value={newReleases.body}
              onChange={e => setNewReleases(n => ({ ...n, body: e.target.value }))}
              rows={3}
              maxLength={180}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Deep Link Template</label>
            <select
              value={selectedLinkOptionKey}
              onChange={e => handleSelectLinkOption(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none"
            >
              {linkOptions.map(option => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
              <option value="custom">Custom deep link</option>
            </select>
          </div>

          {selectedLinkOption && selectedLinkOptionKey !== 'custom' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-xs text-slate-600">
                <span className="font-bold text-slate-700">Template:</span> {selectedLinkOption.template}
              </p>
              <p className="text-xs text-slate-600">
                <span className="font-bold text-slate-700">App route:</span> {selectedLinkOption.resolvesTo}
              </p>
              <p className="text-xs text-slate-600">{selectedLinkOption.description}</p>

              {selectedLinkOption.requiredParams.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedLinkOption.requiredParams.map(param => (
                    <div key={param}>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                        {param}
                      </label>
                      <input
                        type="text"
                        value={linkParams[param] || ''}
                        onChange={e => handleLinkParamChange(param, e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none"
                        placeholder={`Enter ${param}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Deep Link / Action URL</label>
            <input
              type="text"
              value={newReleases.deepLink}
              onChange={e => {
                setSelectedLinkOptionKey('custom');
                setNewReleases(n => ({ ...n, deepLink: e.target.value }));
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-light/20 focus:border-teal-primary outline-none"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Use app routes like `/meditate?tab=guided`, `/sleep-music`, `/course/{'{courseId}'}`, `/breathe?pattern={'{patternId}'}`.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSendRelease}
            disabled={sendingRelease}
            className="px-6 py-2.5 bg-sand/80 border border-slate-200 text-slate-800 font-bold rounded-xl hover:bg-sand transition-all text-sm disabled:opacity-60"
          >
            {sendingRelease ? 'Sending...' : 'Send release'}
          </button>

          {releaseMessage && (
            <span className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              {releaseMessage}
            </span>
          )}

          {releaseError && (
            <span className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
              {releaseError}
            </span>
          )}
        </div>
      </div>

      <h2 className="font-serif text-xl font-bold text-deep-teal mb-4 flex items-center gap-2">
        <span className="text-lg">📜</span> Recent History
      </h2>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading history...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-sand/30 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Title</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Target</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Open Rate</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.map(n => (
                <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 text-sm">{n.title}</td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium">{n.type}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">{n.recipients.toLocaleString()} Users</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full w-20 overflow-hidden">
                        <div className="h-full bg-emerald-400" style={{ width: toOpenRateWidth(n.openRate) }} />
                      </div>
                      <span className="text-xs font-bold text-emerald-600">{n.openRate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${getStatusBadgeClass(n.status)}`}>
                      {n.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
