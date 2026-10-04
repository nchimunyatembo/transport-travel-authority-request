import html2pdf from 'html2pdf.js';

/**
 * Generates and downloads a formal Travel Authority PDF document.
 * 
 * @param {Object} request - Core request details (reference_number, destination, dates, purpose, etc.)
 * @param {Object} approval - Approval details (approver_name, decision, comments, signature, decided_at)
 * @param {Array} attachments - List of attached files
 */
export const generateTravelAuthorityPDF = (request, approval, attachments = []) => {
  // 1. Format dates nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  // 2. Build HTML Template
  const element = document.createElement('div');
  element.style.padding = '30px';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.color = '#333';
  element.style.lineHeight = '1.5';

  element.innerHTML = `
    <div style="text-align: center; border-bottom: 2px solid #1a365d; padding-bottom: 15px; margin-bottom: 25px;">
      <h1 style="margin: 0; color: #1a365d; font-size: 24px; text-transform: uppercase;">Official Duty Travel Authority</h1>
      <p style="margin: 5px 0 0 0; color: #4a5568; font-size: 14px;">Transport & Travel Request Sign-Off Record</p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px;">
      <div>
        <strong>Reference No:</strong> ${request.reference_number || 'N/A'}<br>
        <strong>Date Created:</strong> ${formatDate(request.created_at)}
      </div>
      <div style="text-align: right;">
        <strong>Status:</strong> 
        <span style="
          padding: 3px 8px; 
          border-radius: 4px; 
          font-weight: bold;
          color: white;
          background-color: ${request.status === 'APPROVED' ? '#2e7d32' : request.status === 'REJECTED' ? '#c62828' : '#f57c00'};
        ">
          ${request.status || 'PENDING'}
        </span>
      </div>
    </div>

    <!-- SECTION 1: APPLICANT & TRIP DETAILS -->
    <div style="margin-bottom: 25px;">
      <h3 style="background: #f7fafc; padding: 8px 12px; margin: 0 0 10px 0; border-left: 4px solid #2b6cb0; font-size: 16px;">
        1. Applicant & Trip Information
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px; width: 30%;"><strong>Applicant Name:</strong></td>
          <td style="padding: 6px;">${request.applicant_name || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 6px;"><strong>Department:</strong></td>
          <td style="padding: 6px;">${request.applicant_department || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 6px;"><strong>Destination:</strong></td>
          <td style="padding: 6px;">${request.destination}</td>
        </tr>
        <tr>
          <td style="padding: 6px;"><strong>Vehicle Type:</strong></td>
          <td style="padding: 6px;">${request.vehicle_type || 'Standard'}</td>
        </tr>
        <tr>
          <td style="padding: 6px;"><strong>Departure Date:</strong></td>
          <td style="padding: 6px;">${formatDate(request.departure_date)}</td>
        </tr>
        <tr>
          <td style="padding: 6px;"><strong>Return Date:</strong></td>
          <td style="padding: 6px;">${formatDate(request.return_date)}</td>
        </tr>
        <tr>
          <td style="padding: 6px; vertical-align: top;"><strong>Purpose of Travel:</strong></td>
          <td style="padding: 6px; white-space: pre-wrap;">${request.purpose}</td>
        </tr>
      </table>
    </div>

    <!-- SECTION 2: ATTACHMENTS SUMMARY -->
    <div style="margin-bottom: 25px;">
      <h3 style="background: #f7fafc; padding: 8px 12px; margin: 0 0 10px 0; border-left: 4px solid #2b6cb0; font-size: 16px;">
        2. Supporting Documents
      </h3>
      ${
        attachments.length > 0
          ? `<ul style="font-size: 13px; margin: 0; padding-left: 20px;">
              ${attachments.map(att => `<li>${att.file_name}</li>`).join('')}
             </ul>`
          : `<p style="font-size: 13px; color: #718096; margin: 0 0 0 10px;">No supporting documents attached.</p>`
      }
    </div>

    <!-- SECTION 3: APPROVAL SIGN-OFF -->
    <div style="margin-top: 30px; border-top: 2px dashed #e2e8f0; padding-top: 20px;">
      <h3 style="background: #f7fafc; padding: 8px 12px; margin: 0 0 15px 0; border-left: 4px solid #2b6cb0; font-size: 16px;">
        3. Manager Authorization & Digital Sign-off
      </h3>
      ${
        approval
          ? `
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px; width: 30%;"><strong>Approver Name:</strong></td>
                <td style="padding: 6px;">${approval.approver_name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 6px;"><strong>Decision:</strong></td>
                <td style="padding: 6px; font-weight: bold;">${approval.decision}</td>
              </tr>
              <tr>
                <td style="padding: 6px;"><strong>Date Decided:</strong></td>
                <td style="padding: 6px;">${formatDate(approval.decided_at)}</td>
              </tr>
              <tr>
                <td style="padding: 6px; vertical-align: top;"><strong>Comments / Remarks:</strong></td>
                <td style="padding: 6px;">${approval.comments || 'None'}</td>
              </tr>
              <tr>
                <td style="padding: 6px; vertical-align: top;"><strong>Digital Signature:</strong></td>
                <td style="padding: 6px;">
                  ${
                    approval.approver_signature
                      ? `<img src="${approval.approver_signature}" alt="Approver Signature" style="max-height: 70px; border-bottom: 1px solid #ccc;" />`
                      : '<em>No signature captured</em>'
                  }
                </td>
              </tr>
            </table>
          `
          : `<p style="font-size: 13px; color: #e53e3e; font-style: italic;">This request is still pending approval.</p>`
      }
    </div>

    <!-- FOOTER -->
    <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 10px;">
      Generated automatically by the Travel Authority Management System on ${new Date().toLocaleDateString()}
    </div>
  `;

  // 3. Configure html2pdf Options
  const opt = {
    margin:       [0.5, 0.5, 0.5, 0.5], // top, left, bottom, right in inches
    filename:     `Travel_Authority_${request.reference_number || 'Document'}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, logging: false, useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  // 4. Generate PDF
  html2pdf().set(opt).from(element).save();
};