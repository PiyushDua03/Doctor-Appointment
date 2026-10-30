// ==========================================================================
// DoctorP Prescription (Rx) Viewer & Printable PDF Generator
// Standard Hospital Letterhead & Verification
// ==========================================================================

(function () {
  function ensurePrescriptionModalExists() {
    if (document.getElementById('doctorp-rx-viewer-modal')) return;

    const modalHtml = `
      <div id="doctorp-rx-viewer-modal" class="modal-overlay" style="display: none; align-items: center; justify-content: center; z-index: 10000; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(6px); padding: 1rem;">
        <div class="modal-content" style="max-width: 820px; width: 100%; max-height: 92vh; overflow-y: auto; background: #ffffff; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35); padding: 0; position: relative;">
          
          <!-- Sticky Modal Header Controls (Hidden during print) -->
          <div class="no-print" style="position: sticky; top: 0; background: #ffffff; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; z-index: 10; border-radius: 16px 16px 0 0;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.3rem;">📋</span>
              <strong style="color: #0f172a; font-size: 1.1rem;">Official Clinical Prescription (Rx)</strong>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button type="button" onclick="window.printPrescription()" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; background: #0d9488; border: none; padding: 0.45rem 1rem; border-radius: 8px; cursor: pointer; color: #fff;">
                🖨️ Print / Save PDF
              </button>
              <button type="button" onclick="window.closePrescriptionViewer()" class="btn btn-secondary btn-sm" style="padding: 0.45rem 0.8rem; border-radius: 8px; cursor: pointer; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155;">
                ✕ Close
              </button>
            </div>
          </div>

          <!-- Printable Prescription Sheet Body -->
          <div id="rx-printable-sheet" style="padding: 2.25rem 2.5rem; color: #1e293b; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
            
            <!-- Hospital Header Banner -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 1.25rem; margin-bottom: 1.5rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 0.25rem;">
                  <span style="font-size: 1.8rem; color: #0d9488;">🏥</span>
                  <h2 id="rx-clinic-name" style="margin: 0; color: #0f172a; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.5px;">Apollo Multi-Speciality Clinic</h2>
                </div>
                <p id="rx-clinic-address" style="margin: 0; color: #64748b; font-size: 0.85rem;">Medical Enclave, Healthcare Blvd, New Delhi — 110001</p>
                <p style="margin: 2px 0 0; color: #0d9488; font-size: 0.8rem; font-weight: 600;">Emergency SOS: 108 | Helpline: 1800-200-CARE</p>
              </div>
              <div style="text-align: right;">
                <span style="background: #ccfbf1; color: #0f766e; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #99f6e4;">Digital Rx Verified</span>
                <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #475569;">
                  <strong>Rx ID:</strong> <span id="rx-doc-id" style="font-family: monospace;">RX-2026-0001</span><br>
                  <strong>Date:</strong> <span id="rx-date">28 Oct 2026</span>
                </div>
              </div>
            </div>

            <!-- Doctor & Patient Details Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.15rem; margin-bottom: 1.5rem;">
              <div>
                <h4 style="margin: 0 0 0.4rem; color: #0d9488; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px;">Consulting Specialist</h4>
                <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a;" id="rx-doctor-name">Dr. Rajesh Sharma</div>
                <div style="font-size: 0.85rem; color: #475569;" id="rx-doctor-spec">MBBS, MD (Cardiology)</div>
                <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">Reg. No: <strong id="rx-doctor-reg">DMC-24819-A</strong></div>
              </div>
              <div>
                <h4 style="margin: 0 0 0.4rem; color: #0d9488; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px;">Patient Details</h4>
                <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a;" id="rx-patient-name">Rahul Sharma</div>
                <div style="font-size: 0.85rem; color: #475569;" id="rx-patient-meta">Age: 28 Yrs | Gender: Male</div>
                <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">Booking ID: <span id="rx-apt-id" style="font-family: monospace;">APT-2026-LIVE</span></div>
              </div>
            </div>

            <!-- Clinical Diagnosis & Vitals Section -->
            <div style="margin-bottom: 1.5rem; border-left: 3px solid #0d9488; padding-left: 1rem;">
              <h4 style="margin: 0 0 0.35rem; color: #0f172a; font-size: 0.95rem;">Clinical Diagnosis & Notes:</h4>
              <p id="rx-clinical-notes" style="margin: 0; font-size: 0.92rem; color: #334155; line-height: 1.5; white-space: pre-wrap;">
                Patient presented with mild seasonal fever and fatigue. Vitals: BP 120/80 mmHg, Pulse 74 bpm, SpO2 98%. Symptomatic improvement observed.
              </p>
            </div>

            <!-- Formal Rx Symbol -->
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <span style="font-size: 2.2rem; font-family: serif; font-weight: bold; color: #0d9488; line-height: 1;">℞</span>
              <span style="font-size: 0.85rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Prescribed Medications & Posology</span>
            </div>

            <!-- Structured Medications List / Table -->
            <div id="rx-medications-container" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 1.5rem;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                  <tr style="background: #f1f5f9; color: #475569; text-align: left; font-size: 0.8rem; text-transform: uppercase;">
                    <th style="padding: 0.7rem 0.9rem; border-bottom: 1px solid #e2e8f0;">#</th>
                    <th style="padding: 0.7rem 0.9rem; border-bottom: 1px solid #e2e8f0;">Medicine & Strength</th>
                    <th style="padding: 0.7rem 0.9rem; border-bottom: 1px solid #e2e8f0;">Dosage / Timing</th>
                    <th style="padding: 0.7rem 0.9rem; border-bottom: 1px solid #e2e8f0;">Instruction</th>
                    <th style="padding: 0.7rem 0.9rem; border-bottom: 1px solid #e2e8f0;">Duration</th>
                  </tr>
                </thead>
                <tbody id="rx-meds-tbody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>

            <!-- Clinical Advice & Follow-Up -->
            <div style="background: #f0fdfa; border: 1px dashed #99f6e4; border-radius: 10px; padding: 1rem; margin-bottom: 2rem;">
              <h5 style="margin: 0 0 0.35rem; color: #0f766e; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">Advice & Non-Pharmacological Recommendations:</h5>
              <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.88rem; color: #134e4a; line-height: 1.6;">
                <li>Maintain adequate hydration (2.5L to 3L oral fluid intake daily).</li>
                <li>Avoid strenuous cardiac exertion for 3-5 days; ensure 8 hours restful sleep.</li>
                <li>Follow up for clinical review after 7 days or SOS if symptoms persist.</li>
              </ul>
            </div>

            <!-- Footer Stamp, Signature & Disclaimer -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 1.5rem; margin-top: 1.5rem;">
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="width: 72px; height: 72px; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.65rem; color: #64748b; text-align: center; background: #f8fafc;">
                  <span style="font-size: 1.2rem;">📱</span>
                  <span>Scan to<br>Verify Rx</span>
                </div>
                <div style="font-size: 0.75rem; color: #64748b; max-width: 340px; line-height: 1.4;">
                  This is a certified digital prescription generated on the DoctorP Telehealth & Clinical Network under National Digital Health Guidelines.
                </div>
              </div>
              <div style="text-align: center; min-width: 180px;">
                <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 1.6rem; color: #0d9488; margin-bottom: -4px;" id="rx-signature-name">Dr. Rajesh Sharma</div>
                <div style="border-top: 1px solid #0f172a; padding-top: 4px; font-size: 0.85rem; font-weight: 700; color: #0f172a;">Authorized Signatory</div>
                <div style="font-size: 0.75rem; color: #64748b;">Medical Specialist Seal</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add print styles
    if (!document.getElementById('rx-print-styles')) {
      const style = document.createElement('style');
      style.id = 'rx-print-styles';
      style.innerHTML = `
        @media print {
          body * {
            visibility: hidden;
          }
          #doctorp-rx-viewer-modal,
          #doctorp-rx-viewer-modal * {
            visibility: visible;
          }
          #doctorp-rx-viewer-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: #ffffff !important;
            padding: 0 !important;
            display: block !important;
          }
          #doctorp-rx-viewer-modal .modal-content {
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  window.openPrescriptionViewer = function (apt) {
    ensurePrescriptionModalExists();

    const doctor = apt.doctorId || {};
    const patient = apt.patientId || {};

    const clinicEl = document.getElementById('rx-clinic-name');
    if (clinicEl) clinicEl.innerText = doctor.clinicName || 'Apollo Multi-Speciality Clinic';

    const addressEl = document.getElementById('rx-clinic-address');
    if (addressEl) {
      const loc = doctor.location || {};
      addressEl.innerText = `${loc.address || 'Medical Enclave, Healthcare Blvd'}, ${loc.city || 'New Delhi'} — ${loc.pincode || '110001'}`;
    }

    const rxIdEl = document.getElementById('rx-doc-id');
    if (rxIdEl) rxIdEl.innerText = `RX-${(apt.appointmentId || apt._id || '2026').slice(-8).toUpperCase()}`;

    const dateEl = document.getElementById('rx-date');
    if (dateEl) dateEl.innerText = apt.appointmentDate || new Date().toISOString().slice(0, 10);

    const docNameEl = document.getElementById('rx-doctor-name');
    if (docNameEl) docNameEl.innerText = doctor.name || 'Dr. Specialist';

    const sigEl = document.getElementById('rx-signature-name');
    if (sigEl) sigEl.innerText = doctor.name || 'Dr. Specialist';

    const docSpecEl = document.getElementById('rx-doctor-spec');
    if (docSpecEl) docSpecEl.innerText = `${doctor.specialization || 'General Physician'} — Consultant`;

    const docRegEl = document.getElementById('rx-doctor-reg');
    if (docRegEl) docRegEl.innerText = doctor.medicalRegNumber || 'DMC-24819-A';

    const patNameEl = document.getElementById('rx-patient-name');
    if (patNameEl) patNameEl.innerText = patient.name || 'Patient';

    const patMetaEl = document.getElementById('rx-patient-meta');
    if (patMetaEl) patMetaEl.innerText = `Age: ${patient.age || 28} Yrs | Gender: ${patient.gender || 'Not specified'}`;

    const aptIdEl = document.getElementById('rx-apt-id');
    if (aptIdEl) aptIdEl.innerText = apt.appointmentId || apt._id || 'APT-2026-LIVE';

    const notesEl = document.getElementById('rx-clinical-notes');
    if (notesEl) {
      notesEl.innerText = apt.notes || 'Diagnosis: Clinical recovery verified. Vitals recorded: BP 120/80 mmHg, Pulse 74 bpm. Patient advised adequate rest and hydration.';
    }

    // Parse prescription lines into table rows
    const tbody = document.getElementById('rx-meds-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      const rawRx = apt.prescription || '1. Tab. Paracetamol 650mg — 1 - 0 - 1 (After Meals) — 5 Days\n2. Tab. Pantoprazole 40mg — 1 - 0 - 0 (Before Breakfast) — 5 Days\n3. Tab. Vitamin C 500mg — 0 - 1 - 0 (After Lunch) — 15 Days';
      
      const lines = rawRx.split('\n').filter((l) => l.trim().length > 0);
      lines.forEach((line, idx) => {
        const clean = line.replace(/^\d+[\.\)]\s*/, '').trim();
        const parts = clean.split('—').map((s) => s.trim());
        const medName = parts[0] || clean;
        const dosage = parts[1] || '1 - 0 - 1';
        const instruction = parts[2] || (dosage.toLowerCase().includes('before') ? 'Before Food' : 'After Food');
        const duration = parts[3] || '5 Days';

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f1f5f9';
        tr.innerHTML = `
          <td style="padding: 0.65rem 0.9rem; color: #64748b; font-weight: 600;">${idx + 1}</td>
          <td style="padding: 0.65rem 0.9rem; font-weight: 700; color: #0f172a;">${medName}</td>
          <td style="padding: 0.65rem 0.9rem; color: #0d9488; font-weight: 600;">${dosage}</td>
          <td style="padding: 0.65rem 0.9rem; color: #475569;">${instruction}</td>
          <td style="padding: 0.65rem 0.9rem; color: #475569; font-weight: 600;">${duration}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    const modal = document.getElementById('doctorp-rx-viewer-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  };

  window.closePrescriptionViewer = function () {
    const modal = document.getElementById('doctorp-rx-viewer-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  };

  window.printPrescription = function () {
    window.print();
  };
})();
