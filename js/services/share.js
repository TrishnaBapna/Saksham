/* ======================================================================= */
/* SAKSHAM WHATSAPP, GMAIL & EXPORT DISPATCH SERVICES                      */
/* ======================================================================= */

    function sendCaregiverWhatsAppReminder() {
      const msg = encodeURIComponent(`Saksham Reminder: Kalyani, time for your scheduled activity: "${state.tasks[1].title}". Aarav is checking in on you!`);
      window.open(`https://wa.me/919876543210?text=${msg}`, '_blank');
    }

    function shareAlertsViaWhatsApp() {
      const alertSummary = state.caregiverAlerts.map(a => `• ${a.time}: ${a.text}`).join('\n');
      const msg = encodeURIComponent(`*Saksham Daily Update for Kalyani Sharma*\nStatus: Active\nLevel: ${LEVEL_TIERS[state.level].title}\nAdherence: 94.8%\n\nRecent Alerts & Latency:\n${alertSummary}`);
      window.open(`https://wa.me/?text=${msg}`, '_blank');
    }

    function sendWhatsAppSosToAarav() {
      let locStr = "";
      if (window.SakshamSafePath) {
        window.SakshamSafePath.triggerSafePathSos("WhatsApp SOS Dispatch");
        const loc = window.SakshamSafePath.getLocation();
        if (loc && loc.lat && loc.lng) {
          locStr = `\n\n📍 Live SafePath GPS Location:\nhttps://www.google.com/maps?q=${loc.lat},${loc.lng} (Accuracy: ±${loc.accuracy || 10}m)`;
        }
      }
      let patientName = (typeof state !== 'undefined' && state.user) ? state.user : 'Patient';
      let phone = '';
      try {
        const active = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
        if (active.name) patientName = active.name;
        if (active.caregiverPhone) phone = active.caregiverPhone.replace(/[^0-9]/g, '');
      } catch (e) {}
      if (!phone) {
        if (typeof showSakshamToast === 'function') showSakshamToast('Caregiver contact is not configured yet.', 'warning');
        return;
      }
      const msg = encodeURIComponent(`🚨 URGENT SAKSHAM SOS: ${patientName} requires immediate assistance or check-in!${locStr}`);
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    }
    const sendWhatsAppSosToJulian = sendWhatsAppSosToAarav;

    function sendDoctorDirectiveViaWhatsApp() {
      const dir = state.doctorDirectives[0] || { title: 'Dose Spacing', body: 'Take Levodopa 45 mins before meals' };
      const msg = encodeURIComponent(`*Clinical Directive from Dr. Rajesh Verma*\nPatient: Kalyani Sharma\nSubject: ${dir.title}\nDetails: ${dir.body}`);
      window.open(`https://wa.me/919876543210?text=${msg}`, '_blank');
    }

    /**
     * Dedicated Patient-Facing Real-Time Emergency & Assistance WhatsApp Trigger
     * @param {'sos' | 'meds' | 'unsteady'} type 
     */
    function patientSendEmergencyWhatsApp(type = 'sos') {
      let locStr = "";
      if (window.SakshamSafePath) {
        try {
          window.SakshamSafePath.triggerSafePathSos(type === 'sos' ? "Patient 1-Tap Emergency SOS" : `Patient Assistance Alert (${type})`);
          const loc = window.SakshamSafePath.getLocation();
          if (loc && loc.lat && loc.lng) {
            locStr = `\n\n📍 Live SafePath GPS Location:\nhttps://www.google.com/maps?q=${loc.lat},${loc.lng} (Accuracy: ±${loc.accuracy || 10}m)`;
          }
        } catch(e) {
          console.warn('[Saksham WhatsApp] SafePath location fetch note:', e);
        }
      }

      let patientName = (typeof state !== 'undefined' && state.user) ? state.user : 'Patient';
      let phone = '';
      try {
        const active = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
        if (active.name) patientName = active.name;
        if (active.caregiverPhone) phone = active.caregiverPhone.replace(/[^0-9]/g, '');
      } catch (e) {}

      const curTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let message = "";
      let speechAnnouncement = "";
      let logTitle = "";

      if (type === 'meds') {
        message = `💊 *MEDICATION ASSISTANCE NEEDED - ${patientName}*\n⏰ Time: ${curTime}\n\nI need help or am having a delay with my scheduled medication / routine.${locStr}\n\nPlease check in with me.`;
        speechAnnouncement = "Opening WhatsApp to send medication assistance alert to Aarav.";
        logTitle = "💊 Medication delay / assistance request sent to Aarav via WhatsApp";
      } else if (type === 'unsteady') {
        message = `🚶 *SAFETY CHECK-IN REQUESTED - ${patientName}*\n⏰ Time: ${curTime}\n\nI am feeling unsteady or experiencing motor tremors right now.${locStr}\n\nPlease call or check in on me.`;
        speechAnnouncement = "Opening WhatsApp to send unsteadiness check-in alert to Aarav.";
        logTitle = "🚶 Unsteadiness / motor difficulty alert sent to Aarav via WhatsApp";
      } else {
        // Urgent SOS
        message = `🚨 *URGENT SAKSHAM EMERGENCY SOS - ${patientName}* 🚨\n⏰ Time: ${curTime}\n\nI need IMMEDIATE assistance or help right now!${locStr}\n\nPlease call or come check on me immediately.`;
        speechAnnouncement = "Opening WhatsApp to send urgent Emergency SOS to Aarav with your live GPS location.";
        logTitle = "🚨 Urgent Emergency SOS dispatched to Aarav via WhatsApp with live GPS";
      }

      if (!phone) {
        if (typeof showSakshamToast === 'function') showSakshamToast('Caregiver contact is not configured yet.', 'warning');
        return;
      }

      // Record in Caregiver Alerts List
      const alertObj = {
        time: curTime,
        text: logTitle
      };
      if (typeof state !== 'undefined' && state.caregiverAlerts) {
        state.caregiverAlerts.unshift(alertObj);
      }
      if (window.dbService && window.dbService.caregiverAlerts) {
        window.dbService.caregiverAlerts.create(alertObj, (state && state.uid) || 'SAK-PT-8842');
      }

      // Audio & Speech feedback
      if (typeof playAudioChime === 'function') {
        playAudioChime(type === 'sos' ? 'warning' : 'chime');
      }
      if (typeof speakText === 'function') {
        speakText(speechAnnouncement);
      }
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`🟢 Opening WhatsApp with live ${type === 'sos' ? 'SOS' : 'assistance'} alert...`, 'success');
      }

      // Open WhatsApp
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }

    function emailNotesToDoctorViaGmail() {
      const docEmail = "dr.rajesh.verma@neurologyclinic.in";
      const subject = encodeURIComponent("Caregiver Observation Notes - Kalyani Sharma (#PD-8842)");
      const notes = state.caregiverDoctorNotes.map(n => `Topic: ${n.title}\nDetails: ${n.body}`).join('\n\n');
      const body = encodeURIComponent(`Dear Dr. Rajesh Verma,\n\nPlease review our latest clinical observations for Kalyani Sharma:\n\n${notes}\n\nThank you,\nAarav Sharma (Caregiver)`);
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${docEmail}&su=${subject}&body=${body}`, '_blank');
    }

    function emailClinicalReportViaGmail() {
      const toEmail = "aarav.sharma@sakshamcare.in";
      const subject = encodeURIComponent("Official Neurology Clinical Summary - Kalyani Sharma (#PD-8842)");
      const report = document.getElementById('previewReportBox').innerText;
      const body = encodeURIComponent(`Dear Sharma Family,\n\nPlease find Kalyani's official progression and medication telemetry summary below:\n\n${report}\n\nSincerely,\nDr. Rajesh Verma, MD\nNeurology Clinic`);
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${toEmail}&su=${subject}&body=${body}`, '_blank');
    }



    function exportDoctorReport() {
      const report = document.getElementById('previewReportBox').innerText;
      const blob = new Blob([report], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Clinical_Report_Kalyani_Sharma_${new Date().toISOString().slice(0,10)}.txt`;
      a.click();
    }

    // Expose functions globally
    window.patientSendEmergencyWhatsApp = patientSendEmergencyWhatsApp;
    window.sendWhatsAppSosToAarav = sendWhatsAppSosToAarav;
    window.sendCaregiverWhatsAppReminder = sendCaregiverWhatsAppReminder;
    window.shareAlertsViaWhatsApp = shareAlertsViaWhatsApp;
    window.sendDoctorDirectiveViaWhatsApp = sendDoctorDirectiveViaWhatsApp;
    window.emailNotesToDoctorViaGmail = emailNotesToDoctorViaGmail;
    window.emailClinicalReportViaGmail = emailClinicalReportViaGmail;
    window.exportDoctorReport = exportDoctorReport;


