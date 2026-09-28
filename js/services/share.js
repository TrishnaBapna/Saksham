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
      let patientName = 'Kalyani Sharma';
      let phone = '919876543210';
      try {
        const active = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
        if (active.name) patientName = active.name;
        if (active.caregiverPhone) phone = active.caregiverPhone.replace(/[^0-9]/g, '');
      } catch (e) {}
      const msg = encodeURIComponent(`🚨 URGENT SAKSHAM SOS: ${patientName} requires immediate assistance or check-in!${locStr}`);
      window.open(`https://wa.me/${phone || '919876543210'}?text=${msg}`, '_blank');
    }
    const sendWhatsAppSosToJulian = sendWhatsAppSosToAarav;

    function sendDoctorDirectiveViaWhatsApp() {
      const dir = state.doctorDirectives[0] || { title: 'Dose Spacing', body: 'Take Levodopa 45 mins before meals' };
      const msg = encodeURIComponent(`*Clinical Directive from Dr. Rajesh Verma*\nPatient: Kalyani Sharma\nSubject: ${dir.title}\nDetails: ${dir.body}`);
      window.open(`https://wa.me/919876543210?text=${msg}`, '_blank');
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


