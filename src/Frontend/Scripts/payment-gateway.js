// ==========================================================================
// DoctorP Payment Gateway Simulator (Razorpay / UPI / Card / NetBanking)
// ==========================================================================

(function () {
  function ensurePaymentModalExists() {
    if (document.getElementById('doctorp-payment-modal')) return;

    const modalHtml = `
      <div id="doctorp-payment-modal" class="modal-overlay" style="display: none; align-items: center; justify-content: center; z-index: 10000; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); padding: 1rem;">
        <div class="modal-content" style="max-width: 500px; width: 100%; background: #ffffff; border-radius: 20px; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4); overflow: hidden; padding: 0;">
          
          <!-- Top Gateway Header -->
          <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: #ffffff; padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
                🛡️
              </div>
              <div>
                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">DoctorP Secure Pay</h3>
                <span style="font-size: 0.72rem; opacity: 0.85; letter-spacing: 0.3px;">256-Bit Bank Grade SSL Encrypted</span>
              </div>
            </div>
            <button type="button" onclick="window.closePaymentGateway()" style="background: rgba(255,255,255,0.15); border: none; width: 32px; height: 32px; border-radius: 50%; color: #fff; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
          </div>

          <!-- Doctor & Amount Summary Bar -->
          <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700;">Consultation With</div>
              <div id="pay-doctor-name" style="font-weight: 700; color: #0f172a; font-size: 0.95rem;">Dr. Rajesh Sharma</div>
              <div id="pay-appointment-time" style="font-size: 0.8rem; color: #0d9488;">Today at 10:30 AM</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700;">Payable Amount</div>
              <div id="pay-total-amount" style="font-size: 1.45rem; font-weight: 800; color: #0f172a;">₹600</div>
            </div>
          </div>

          <!-- Payment Methods Container -->
          <div id="payment-views-container" style="padding: 1.5rem;">
            
            <!-- Navigation Tabs -->
            <div style="display: flex; gap: 0.5rem; background: #f1f5f9; padding: 4px; border-radius: 10px; margin-bottom: 1.25rem;">
              <button type="button" class="pay-tab-btn active" data-tab="upi" onclick="window.switchPayTab('upi')" style="flex: 1; padding: 0.5rem; border: none; background: #ffffff; border-radius: 8px; font-weight: 700; font-size: 0.82rem; color: #0d9488; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">UPI / QR</button>
              <button type="button" class="pay-tab-btn" data-tab="card" onclick="window.switchPayTab('card')" style="flex: 1; padding: 0.5rem; border: none; background: transparent; border-radius: 8px; font-weight: 700; font-size: 0.82rem; color: #64748b; cursor: pointer;">Cards</button>
              <button type="button" class="pay-tab-btn" data-tab="netbanking" onclick="window.switchPayTab('netbanking')" style="flex: 1; padding: 0.5rem; border: none; background: transparent; border-radius: 8px; font-weight: 700; font-size: 0.82rem; color: #64748b; cursor: pointer;">Net Banking</button>
              <button type="button" class="pay-tab-btn" data-tab="clinic" onclick="window.switchPayTab('clinic')" style="flex: 1; padding: 0.5rem; border: none; background: transparent; border-radius: 8px; font-weight: 700; font-size: 0.82rem; color: #64748b; cursor: pointer;">At Clinic</button>
            </div>

            <!-- TAB 1: UPI & QR CODE -->
            <div id="pay-tab-upi" class="pay-tab-content">
              <div style="display: flex; gap: 1.25rem; align-items: center; background: #f0fdfa; border: 1px dashed #99f6e4; border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem;">
                <div style="background: #ffffff; border: 1px solid #cbd5e1; padding: 6px; border-radius: 8px; width: 90px; height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <div style="font-size: 2.2rem;">📱</div>
                  <span style="font-size: 0.65rem; color: #0d9488; font-weight: 700; margin-top: 2px;">BHIM UPI</span>
                </div>
                <div>
                  <div style="font-size: 0.85rem; font-weight: 700; color: #0f766e; margin-bottom: 2px;">Scan & Pay with Any UPI App</div>
                  <div style="font-size: 0.78rem; color: #64748b; line-height: 1.4;">GPay, PhonePe, Paytm, Cred, BHIM or Mobile Banking UPI</div>
                  <div style="display: flex; gap: 6px; margin-top: 6px;">
                    <span style="font-size: 0.7rem; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 600;">GooglePay</span>
                    <span style="font-size: 0.7rem; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 600;">PhonePe</span>
                    <span style="font-size: 0.7rem; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Paytm</span>
                  </div>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem;">Or Enter UPI ID / VPA</label>
                <div style="position: relative;">
                  <input type="text" id="pay-upi-id" class="form-control" value="rahul.sharma@okhdfcbank" style="padding: 0.65rem 0.8rem; font-size: 0.9rem; border-radius: 8px; border: 1px solid #cbd5e1; width: 100%; box-sizing: border-box;" placeholder="yourname@upi">
                  <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 0.75rem; color: #0d9488; font-weight: 700;">VERIFIED</span>
                </div>
              </div>
            </div>

            <!-- TAB 2: CREDIT / DEBIT CARDS -->
            <div id="pay-tab-card" class="pay-tab-content" style="display: none;">
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 0.25rem;">Card Number</label>
                <input type="text" id="pay-card-num" class="form-control" value="4532 •••• •••• 8842" style="padding: 0.65rem 0.8rem; font-size: 0.9rem; border-radius: 8px; border: 1px solid #cbd5e1; width: 100%; box-sizing: border-box;">
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                <div class="form-group">
                  <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 0.25rem;">Expiry Date</label>
                  <input type="text" class="form-control" value="09/29" style="padding: 0.65rem 0.8rem; font-size: 0.9rem; border-radius: 8px; border: 1px solid #cbd5e1; width: 100%; box-sizing: border-box;">
                </div>
                <div class="form-group">
                  <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 0.25rem;">CVV / CVC</label>
                  <input type="password" class="form-control" value="842" maxlength="3" style="padding: 0.65rem 0.8rem; font-size: 0.9rem; border-radius: 8px; border: 1px solid #cbd5e1; width: 100%; box-sizing: border-box;">
                </div>
              </div>
            </div>

            <!-- TAB 3: NET BANKING -->
            <div id="pay-tab-netbanking" class="pay-tab-content" style="display: none;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; margin-bottom: 1rem;">
                <label style="display: flex; align-items: center; gap: 8px; padding: 0.65rem; border: 1px solid #0d9488; background: #f0fdfa; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 700; color: #0f766e;">
                  <input type="radio" name="nb-bank" value="HDFC Bank" checked> HDFC Bank
                </label>
                <label style="display: flex; align-items: center; gap: 8px; padding: 0.65rem; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #334155;">
                  <input type="radio" name="nb-bank" value="State Bank of India"> SBI Bank
                </label>
                <label style="display: flex; align-items: center; gap: 8px; padding: 0.65rem; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #334155;">
                  <input type="radio" name="nb-bank" value="ICICI Bank"> ICICI Bank
                </label>
                <label style="display: flex; align-items: center; gap: 8px; padding: 0.65rem; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #334155;">
                  <input type="radio" name="nb-bank" value="Axis Bank"> Axis Bank
                </label>
              </div>
            </div>

            <!-- TAB 4: PAY AT CLINIC -->
            <div id="pay-tab-clinic" class="pay-tab-content" style="display: none;">
              <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 1rem; color: #854d0e; font-size: 0.85rem; line-height: 1.5; margin-bottom: 1rem;">
                <strong>Pay Upon Arrival at Clinic Desk:</strong><br>
                You can reserve this consultation now and pay the fee in cash or card at the hospital front desk before meeting the doctor.
              </div>
            </div>

            <!-- Submit Button & Guarantee -->
            <button type="button" id="btn-execute-payment" onclick="window.processPaymentExecution()" style="width: 100%; padding: 0.85rem; border-radius: 10px; font-weight: 700; font-size: 1rem; background: #0d9488; color: #ffffff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
              🔒 Pay <span id="pay-btn-amount">₹600</span> & Confirm Booking
            </button>
            <div style="text-align: center; font-size: 0.72rem; color: #94a3b8; margin-top: 0.75rem;">
              DoctorP Payment Guarantee • 100% Refundable on Doctor Cancellation
            </div>
          </div>

          <!-- PROCESSING / SUCCESS STATE OVERLAY -->
          <div id="payment-processing-overlay" style="display: none; padding: 3rem 2rem; text-align: center;">
            <div id="pay-spinner" style="width: 60px; height: 60px; border: 4px solid #ccfbf1; border-top-color: #0d9488; border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 1.5rem;"></div>
            <div id="pay-success-icon" style="display: none; width: 68px; height: 68px; border-radius: 50%; background: #dcfce7; color: #16a34a; font-size: 2.2rem; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">✓</div>
            
            <h3 id="pay-status-title" style="margin: 0 0 0.5rem; color: #0f172a; font-size: 1.25rem;">Contacting Payment Gateway...</h3>
            <p id="pay-status-desc" style="margin: 0; color: #64748b; font-size: 0.88rem;">Securing authorization from NPCI / Bank network. Please do not close.</p>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add spinner keyframe and active visibility rules if not present
    if (!document.getElementById('pay-anim-styles')) {
      const style = document.createElement('style');
      style.id = 'pay-anim-styles';
      style.innerHTML = `
        @keyframes spin { to { transform: rotate(360deg); } }
        #doctorp-payment-modal {
          position: fixed !important;
          inset: 0 !important;
          z-index: 10000 !important;
          background: rgba(15, 23, 42, 0.8) !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
          display: none;
          align-items: center !important;
          justify-content: center !important;
          padding: 1rem !important;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease !important;
        }
        #doctorp-payment-modal.active {
          display: flex !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        #doctorp-payment-modal .modal-content {
          transform: translateY(20px) scale(0.96) !important;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        #doctorp-payment-modal.active .modal-content {
          transform: translateY(0) scale(1) !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  let activePayData = null;
  let activeTabName = 'upi';

  window.switchPayTab = function (tab) {
    activeTabName = tab;
    document.querySelectorAll('.pay-tab-btn').forEach((btn) => {
      if (btn.getAttribute('data-tab') === tab) {
        btn.style.background = '#ffffff';
        btn.style.color = '#0d9488';
        btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = '#64748b';
        btn.style.boxShadow = 'none';
      }
    });

    document.querySelectorAll('.pay-tab-content').forEach((el) => (el.style.display = 'none'));
    const activeEl = document.getElementById(`pay-tab-${tab}`);
    if (activeEl) activeEl.style.display = 'block';

    const btnText = document.getElementById('btn-execute-payment');
    if (btnText) {
      if (tab === 'clinic') {
        btnText.innerHTML = `Confirm Booking (Pay at Clinic)`;
        btnText.style.background = '#0284c7';
      } else {
        const fee = activePayData?.fee || 500;
        btnText.innerHTML = `🔒 Pay ₹${fee} & Confirm Booking`;
        btnText.style.background = '#0d9488';
      }
    }
  };

  window.openPaymentGateway = function (options) {
    ensurePaymentModalExists();
    activePayData = options;

    const doctor = options.doctor || {};
    const fee = options.fee || doctor.consultationFee || 500;

    const docEl = document.getElementById('pay-doctor-name');
    if (docEl) docEl.innerText = doctor.name || 'Dr. Specialist';

    const timeEl = document.getElementById('pay-appointment-time');
    if (timeEl) timeEl.innerText = `${options.date || 'Today'} at ${options.time || '10:00 AM'} (${options.consultationType || 'In-Clinic'})`;

    const amtEl = document.getElementById('pay-total-amount');
    if (amtEl) amtEl.innerText = `₹${fee}`;

    const btnAmtEl = document.getElementById('pay-btn-amount');
    if (btnAmtEl) btnAmtEl.innerText = `₹${fee}`;

    // Reset view
    const views = document.getElementById('payment-views-container');
    const overlay = document.getElementById('payment-processing-overlay');
    if (views) views.style.display = 'block';
    if (overlay) overlay.style.display = 'none';

    window.switchPayTab('upi');

    // Create backend payment order in background
    if (window.apiFetch && window.Auth && typeof window.Auth.isLoggedIn === 'function' && window.Auth.isLoggedIn()) {
      window.apiFetch('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({
          amount: fee,
          doctorId: doctor._id || options.doctorId,
          currency: 'INR',
          notes: `Booking consultation: ${options.date} at ${options.time}`,
        }),
      })
        .then((res) => {
          if (res && res.order && activePayData) {
            activePayData.orderId = res.order.orderId;
            activePayData.paymentId = res.order.paymentId;
          }
        })
        .catch((err) => {
          console.warn('Payment pre-order init notice:', err.message);
        });
    }

    const modal = document.getElementById('doctorp-payment-modal');
    if (modal) {
      modal.style.display = 'flex';
      // Force repaint before adding active class for smooth transition
      void modal.offsetWidth;
      modal.classList.add('active');
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'auto';
      document.body.style.overflow = 'hidden';
    }
  };

  window.closePaymentGateway = function () {
    const modal = document.getElementById('doctorp-payment-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
      setTimeout(() => {
        if (!modal.classList.contains('active')) {
          modal.style.display = 'none';
        }
      }, 200);
      document.body.style.overflow = '';
    }
    if (activePayData && activePayData.onCancel) {
      activePayData.onCancel();
    }
  };

  window.processPaymentExecution = async function () {
    const views = document.getElementById('payment-views-container');
    const overlay = document.getElementById('payment-processing-overlay');
    const spinner = document.getElementById('pay-spinner');
    const successIcon = document.getElementById('pay-success-icon');
    const title = document.getElementById('pay-status-title');
    const desc = document.getElementById('pay-status-desc');

    if (views) views.style.display = 'none';
    if (overlay) overlay.style.display = 'block';
    if (spinner) spinner.style.display = 'block';
    if (successIcon) successIcon.style.display = 'none';

    const isClinic = activeTabName === 'clinic';
    const doctor = activePayData?.doctor || {};
    const doctorId = doctor._id || activePayData?.doctorId;
    const fee = activePayData?.fee || doctor.consultationFee || 500;
    const paymentMethodName = isClinic
      ? 'Pay at Clinic'
      : activeTabName === 'upi'
      ? 'UPI / QR'
      : activeTabName === 'card'
      ? 'Credit/Debit Card'
      : 'Net Banking';

    if (title) title.innerText = isClinic ? 'Confirming Clinic Slot...' : 'Contacting Payment Gateway...';
    if (desc) desc.innerText = isClinic ? 'Registering consultation request at hospital desk.' : 'Validating token authorization with bank network. Please do not close.';

    let serverPaymentData = null;

    // Contact backend payment API
    try {
      if (window.apiFetch) {
        const payPayload = {
          orderId: activePayData?.orderId,
          doctorId,
          amount: fee,
          paymentMethod: paymentMethodName,
          paymentDetails: {
            upiId: activeTabName === 'upi' ? document.getElementById('pay-upi-id')?.value || 'patient@upi' : undefined,
            cardLast4: activeTabName === 'card' ? '8842' : undefined,
            bankName: activeTabName === 'netbanking' ? document.querySelector('input[name="nb-bank"]:checked')?.value || 'HDFC Bank' : undefined,
          },
          notes: `Consultation on ${activePayData?.date || 'Scheduled'} (${activePayData?.consultationType || 'In-Clinic'})`,
        };

        const res = await window.apiFetch('/payments/process', {
          method: 'POST',
          body: JSON.stringify(payPayload),
        });

        if (res && res.success) {
          serverPaymentData = res.payment;
        }
      }
    } catch (err) {
      console.warn('Backend payment API response:', err.message);
    }

    const txnId =
      serverPaymentData?.transactionId ||
      `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const receiptNum = serverPaymentData?.receiptNumber || `REC-${Date.now().toString(36).toUpperCase()}`;

    // Update UI after processing
    setTimeout(() => {
      if (spinner) spinner.style.display = 'none';
      if (successIcon) successIcon.style.display = 'flex';
      if (title) title.innerText = isClinic ? 'Appointment Reserved!' : 'Payment Verified & Approved! 🎉';
      if (desc) {
        desc.innerText = isClinic
          ? `Pay ₹${fee} at registration counter. Token #${txnId}`
          : `Transaction ID: ${txnId} • Receipt #${receiptNum}`;
      }

      // Play short chime
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          g.gain.setValueAtTime(0.2, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        }
      } catch (e) {}

      setTimeout(() => {
        const modal = document.getElementById('doctorp-payment-modal');
        if (modal) {
          modal.classList.remove('active');
          modal.style.opacity = '0';
          modal.style.pointerEvents = 'none';
          setTimeout(() => {
            if (!modal.classList.contains('active')) {
              modal.style.display = 'none';
            }
          }, 200);
          document.body.style.overflow = '';
        }
        if (activePayData && activePayData.onSuccess) {
          activePayData.onSuccess({
            paymentStatus: isClinic ? 'pay_at_clinic' : 'paid',
            paymentMethod: paymentMethodName,
            transactionId: txnId,
            receiptNumber: receiptNum,
            orderId: serverPaymentData?.orderId || activePayData?.orderId,
            paidAmount: fee,
          });
        }
      }, 1000);
    }, 1200);
  };
})();
