// CalmDrive Shared Data Layer
const CD = {
  // Save pre-drive setup
  saveSetup(data) {
    sessionStorage.setItem('cd_setup', JSON.stringify(data));
  },
  getSetup() {
    try { return JSON.parse(sessionStorage.getItem('cd_setup') || '{}'); } catch { return {}; }
  },

  // Active drive state
  startDrive() {
    const drive = {
      id: Date.now(),
      startTime: Date.now(),
      preStress: parseInt(sessionStorage.getItem('cd_preStress') || '5'),
      destination: sessionStorage.getItem('cd_destination') || '',
      checkins: [],
      breathCount: 0,
      deEscCount: 0,
    };
    sessionStorage.setItem('cd_activeDrive', JSON.stringify(drive));
    return drive;
  },
  getActiveDrive() {
    try { return JSON.parse(sessionStorage.getItem('cd_activeDrive') || 'null'); } catch { return null; }
  },
  updateActiveDrive(updates) {
    const d = this.getActiveDrive();
    if (!d) return;
    Object.assign(d, updates);
    sessionStorage.setItem('cd_activeDrive', JSON.stringify(d));
    return d;
  },
  addCheckin(stressLevel) {
    const d = this.getActiveDrive();
    if (!d) return;
    d.checkins.push({ time: Date.now(), stress: stressLevel });
    sessionStorage.setItem('cd_activeDrive', JSON.stringify(d));
  },
  incrementBreath() {
    const d = this.getActiveDrive();
    if (!d) return;
    d.breathCount = (d.breathCount || 0) + 1;
    sessionStorage.setItem('cd_activeDrive', JSON.stringify(d));
  },
  incrementDeEsc() {
    const d = this.getActiveDrive();
    if (!d) return;
    d.deEscCount = (d.deEscCount || 0) + 1;
    sessionStorage.setItem('cd_activeDrive', JSON.stringify(d));
  },

  // End drive & compute summary
  endDrive() {
    const d = this.getActiveDrive();
    if (!d) return null;
    d.endTime = Date.now();
    d.duration = Math.floor((d.endTime - d.startTime) / 1000);

    // Calm score: average of preStress + all checkins, inverted
    const allStress = [d.preStress, ...d.checkins.map(c => c.stress)];
    const avgStress = allStress.reduce((a, b) => a + b, 0) / allStress.length;
    d.calmScore = Math.round(100 - (avgStress - 1) * 10);
    d.avgStress = Math.round(avgStress * 10) / 10;

    // State label
    d.state = d.calmScore >= 85 ? 'Flow' : d.calmScore >= 65 ? 'Calm' : 'Tense';

    // Trend
    if (d.checkins.length > 0) {
      const last = d.checkins[d.checkins.length - 1].stress;
      d.trend = last < d.preStress ? 'improved' : last > d.preStress ? 'worsened' : 'steady';
    } else {
      d.trend = 'steady';
    }

    // Save to history
    const history = this.getHistory();
    history.unshift(d);
    localStorage.setItem('cd_history', JSON.stringify(history.slice(0, 100)));

    // Save summary for summary page to read
    sessionStorage.setItem('cd_lastDrive', JSON.stringify(d));
    sessionStorage.removeItem('cd_activeDrive');
    return d;
  },

  getLastDrive() {
    try { return JSON.parse(sessionStorage.getItem('cd_lastDrive') || 'null'); } catch { return null; }
  },

  getHistory() {
    try { return JSON.parse(localStorage.getItem('cd_history') || '[]'); } catch { return []; }
  },

  getStats() {
    const h = this.getHistory();
    if (!h.length) return { total: 0, avgCalm: null, streak: 0 };
    const avgCalm = Math.round(h.reduce((a, b) => a + b.calmScore, 0) / h.length);
    return { total: h.length, avgCalm, streak: this.calcStreak(h) };
  },

  calcStreak(history) {
    let streak = 0;
    let d = new Date();
    for (let i = 0; i < 60; i++) {
      const ds = d.toDateString();
      if (history.some(h => new Date(h.endTime).toDateString() === ds)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else if (i > 0) break;
      else d.setDate(d.getDate() - 1);
    }
    return streak;
  },

  formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return m + ':' + s;
  },

  formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000 && now.getDate() === d.getDate()) return 'Today, ' + d.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
    if (diff < 172800000) return 'Yesterday, ' + d.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
    return d.toLocaleDateString('en-GB', {day:'numeric', month:'short'}) + ', ' + d.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
  },

  generateInsight(drive) {
    const pre = drive.preStress;
    const score = drive.calmScore;
    const checkins = drive.checkins || [];
    const mins = Math.floor(drive.duration / 60);

    if (checkins.length === 0) {
      if (score >= 80) return `You started at ${pre}/10 stress and drove for ${mins} minutes without checking in — the data suggests a genuinely calm journey.`;
      return `You started at ${pre}/10 and completed a ${mins}-minute drive. Try checking in mid-drive next time for richer data.`;
    }
    const last = checkins[checkins.length - 1].stress;
    const peak = Math.max(pre, ...checkins.map(c => c.stress));
    const direction = last < pre ? 'decreased as you drove' : last > pre ? 'built during the drive' : 'stayed consistent throughout';
    return `Your stress ${direction}. You started at ${pre}/10 and peaked at ${peak}/10. ${score >= 70 ? 'The breathing exercises helped keep things manageable.' : 'The check-ins gave you real data to work with — that awareness is progress.'}`;
  },

  generateTip(drive) {
    const pre = drive.preStress;
    const score = drive.calmScore;
    if (pre >= 7) return "You drove while already highly stressed. Next time, try one full minute of slow breathing before starting the engine — it measurably lowers your baseline.";
    if ((drive.checkins || []).length === 0 && drive.duration > 600) return "This was a longer drive with no check-ins. Next time tap the check-in button halfway through — the pattern data becomes useful after 4-5 drives.";
    if (score < 60) return "Lower calm score this drive. Look at the time of day and route — stress patterns tend to be consistent. Three more logged drives will start showing you where the pressure comes from.";
    if (score >= 85) return "Strong result. Notice what made this drive different — same route, different time? Less rushing beforehand? Replicating the conditions is the goal.";
    return "Consistent logging across several drives will show you which routes or times trigger your stress. Keep going.";
  }
};
