// ==========================================================================
// DoctorP Calendar Integration (.ICS & Google Calendar)
// Standard RFC 5545 iCalendar format
// ==========================================================================

(function () {
  function formatCalendarDates(dateStr, timeStr) {
    try {
      const [year, month, day] = (dateStr || new Date().toISOString().slice(0, 10)).split('-').map(Number);
      const [hour, minute] = (timeStr || '10:00').split(':').map(Number);

      const startDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 mins

      const toCalStr = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

      return {
        startIso: toCalStr(startDate),
        endIso: toCalStr(endDate),
      };
    } catch (e) {
      const now = new Date();
      const later = new Date(now.getTime() + 30 * 60 * 1000);
      return {
        startIso: now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
        endIso: later.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
      };
    }
  }

  // Add directly to Google Calendar via Web Intent
  window.addToGoogleCalendar = function (apt) {
    const doctor = apt.doctorId || {};
    const docName = doctor.name || 'Medical Specialist';
    const clinicName = doctor.clinicName || 'Apollo Multi-Speciality Clinic';
    const loc = doctor.location || {};
    const locationStr = `${clinicName}, ${loc.address || 'Medical Enclave'}, ${loc.city || 'New Delhi'}`;

    const { startIso, endIso } = formatCalendarDates(apt.appointmentDate, apt.startTime);

    const title = encodeURIComponent(`Doctor Consultation: ${docName}`);
    const details = encodeURIComponent(
      `Consultation with ${docName} (${doctor.specialization || 'Specialist'}).\n\nBooking ID: ${apt.appointmentId || apt._id}\nConsultation Mode: ${apt.consultationType || 'In-Clinic'}\nMeeting Link: ${apt.meetingLink || 'In-Clinic'}\nReason: ${apt.reason || 'General Checkup'}`
    );
    const location = encodeURIComponent(locationStr);

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
    window.open(url, '_blank');
  };

  // Download universal .ICS Calendar File (Apple Calendar, Outlook, Windows, Google Calendar)
  window.downloadIcsFile = function (apt) {
    const doctor = apt.doctorId || {};
    const docName = doctor.name || 'Medical Specialist';
    const clinicName = doctor.clinicName || 'Apollo Multi-Speciality Clinic';
    const loc = doctor.location || {};
    const locationStr = `${clinicName}, ${loc.city || 'New Delhi'}`;
    const aptId = apt.appointmentId || apt._id || `apt-${Date.now()}`;

    const { startIso, endIso } = formatCalendarDates(apt.appointmentDate, apt.startTime);
    const nowIso = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//DoctorP Healthcare Platform//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${aptId}@doctorp.com`,
      `DTSTAMP:${nowIso}`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      `SUMMARY:Doctor Consultation: ${docName}`,
      `DESCRIPTION:Doctor Consultation with ${docName}. Consultation Mode: ${apt.consultationType || 'In-Clinic'}. Booking ID: ${aptId}.`,
      `LOCATION:${locationStr}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder: Doctor Consultation in 30 minutes',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `DoctorP_Appointment_${aptId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.showToast) {
      window.showToast('📅 Calendar invite (.ICS) downloaded! Double-click to add to your calendar.', 'success');
    }
  };
})();
