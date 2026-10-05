import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../utils/api';
import SignaturePad from '../components/SignaturePad';
import councilLogo from '../../Picture1.jpg';

export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [recommendationPosition, setRecommendationPosition] = useState('');
  const [recommendationNotes, setRecommendationNotes] = useState('');
  const [vehicleAllocated, setVehicleAllocated] = useState(null);
  const [driverAllocated, setDriverAllocated] = useState(null);
  const [approverTitle, setApproverTitle] = useState('');
  const [signature, setSignature] = useState(null);

  // Fetch single request details
  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/requests/${id}`);
        setRequest(response.data.request);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch request details.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [id]);

  // Status Badge Helper
  const getStatusBadge = (status) => {
    const badgeStyles = {
      PENDING: { bg: '#fef3c7', color: '#b45309', label: 'Pending Approval' },
      APPROVED: { bg: '#d1fae5', color: '#047857', label: 'Approved' },
      REJECTED: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' }
    };
    const style = badgeStyles[status] || { bg: '#f1f5f9', color: '#475569', label: status };

    return (
      <span
        style={{
          backgroundColor: style.bg,
          color: style.color,
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        {style.label}
      </span>
    );
  };

  // Handle Approver Actions (Approve / Reject)
  const handleDecision = async (status) => {
    if (!signature) {
      alert('Please add and confirm your digital signature.');
      return;
    }
    if (status === 'REJECTED' && !approvalNotes.trim()) {
      alert('Please provide a reason or note for rejecting this request.');
      return;
    }
    if (['transport', 'duty travel'].includes(request.application_type) && !approverTitle.trim()) {
      alert('Enter the approving officer title before recording this decision.');
      return;
    }
    if (request.application_type === 'transport' && !request.recommended_by) {
      alert('A recommending officer must complete their section first.');
      return;
    }

    try {
      setActionLoading(true);
      const response = await api.patch(`/requests/${id}/status`, {
        status,
        notes: approvalNotes,
        approver_title: approverTitle,
        signature
      });

      setRequest(response.data.request);
      setApprovalNotes('');
      alert(`Request has been ${status.toLowerCase()} successfully.`);
    } catch (err) {
      alert(err.response?.data?.message || `Failed to update request status.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecommendation = async (decision) => {
    if (!recommendationPosition.trim()) {
      alert('Enter the recommending officer position.');
      return;
    }
    if (decision === 'REJECTED' && !recommendationNotes.trim()) {
      alert('Enter a reason for rejecting this transport application.');
      return;
    }
    if (decision === 'RECOMMENDED' &&
        (!String(vehicleAllocated ?? request.vehicle_allocated ?? '').trim() ||
         !String(driverAllocated ?? request.driver_allocated ?? '').trim())) {
      alert('Enter both the allocated vehicle and driver before recommending.');
      return;
    }

    try {
      setActionLoading(true);
      const response = await api.patch(`/requests/${id}/recommend`, {
        position: recommendationPosition,
        decision,
        notes: recommendationNotes,
        vehicle_allocated: vehicleAllocated ?? request.vehicle_allocated ?? '',
        driver_allocated: driverAllocated ?? request.driver_allocated ?? ''
      });
      setRequest(response.data.request);
      setRecommendationPosition('');
      setRecommendationNotes('');
      alert(decision === 'REJECTED' ? 'Transport application rejected.' : 'Transport application recommended.');
    } catch (err) {
      alert(err.response?.data?.message || 'Could not recommend this transport application.');
    } finally {
      setActionLoading(false);
    }
  };

  // Print Duty Authority Form
  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this approved/rejected application and its attached files? This cannot be undone.')) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/requests/${id}`);
      navigate('/dashboard');
    } catch (deleteError) {
      alert(deleteError.response?.data?.message || 'Could not delete this application.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const response = await api.get(
        `/requests/${id}/attachments/${attachment.id}`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file_name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      alert(downloadError.response?.data?.message || 'Could not download this document.');
    }
  };

  if (loading) {
    return <div style={styles.centerMessage}>Loading request details...</div>;
  }

  if (error || !request) {
    return (
      <div style={styles.container}>
        <div style={styles.errorAlert}>{error || 'Request not found.'}</div>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={`request-details-page${request.application_type === 'duty travel' ? ' duty-travel-request' : request.application_type === 'transport' ? ' transport-request' : ''}`} style={styles.container}>
      {['duty travel', 'transport'].includes(request.application_type) && (
        <>
          <style>{`
            .print-authority, .print-transport { display: none; }
            @media print {
              @page { size: A4 portrait; margin: 14mm; }
              body { background: #fff !important; color: #111 !important; }
              body * { visibility: hidden !important; }
              .print-authority, .print-authority *, .print-transport, .print-transport * { visibility: visible !important; }
              .request-details-page.duty-travel-request, .request-details-page.transport-request { max-width: none !important; margin: 0 !important; padding: 0 !important; }
              .request-details-page.duty-travel-request > *, .request-details-page.transport-request > * { display: none !important; }
              .request-details-page.duty-travel-request > .print-authority, .request-details-page.transport-request > .print-transport { display: block !important; position: absolute; inset: 0; width: 100%; }
              .print-authority, .print-transport { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.35; color: #111; }
              .print-council-logo { display: block; width: 82px; height: 82px; object-fit: contain; margin: 0 auto 4px; }
              .print-council-name { text-align: center; font: bold 11pt Arial, sans-serif; margin: 0 0 2px; }
              .print-contact-row { display: flex; justify-content: space-between; border-top: 1px solid #111; padding-top: 2px; font: 9pt Arial, sans-serif; line-height: 1.15; }
              .print-contact-left, .print-contact-right { width: 48%; }
              .print-contact-right { text-align: right; }
              .print-department { text-align: center; font: bold 11pt Arial, sans-serif; border-bottom: 1px solid #111; padding: 11px 0 3px; margin-bottom: 23px; }
              .print-form-title { text-align: center; font-size: 12pt; font-weight: bold; margin: 0 0 12px; }
              .print-instruction { font-size: 9pt; font-style: italic; margin-bottom: 8px; }
              .print-row { display: flex; gap: 22px; margin: 0 0 7px; min-height: 17px; }
              .print-field { display: flex; align-items: baseline; flex: 1; min-width: 0; gap: 4px; }
              .print-field-label { white-space: nowrap; }
              .print-field-value { flex: 1; min-width: 16px; min-height: 16px; border-bottom: 1px dotted #111; padding: 0 3px 1px; overflow-wrap: anywhere; }
              .print-row.single { margin-bottom: 7px; }
              .print-reason-label { margin: 8px 0 3px; }
              .print-reason-value { min-height: 58px; white-space: pre-wrap; overflow-wrap: anywhere; border-bottom: 1px dotted #111; padding: 2px 3px; }
              .print-signature-row { margin-top: 7px; }
              .print-applicant-signature { max-width: 140px; max-height: 42px; object-fit: contain; vertical-align: bottom; }
              .print-acting-title { font-weight: bold; font-style: italic; margin: 12px 0 7px; }
              .print-approval-title { text-align: center; font-weight: bold; margin: 17px 0 8px; }
              .print-approval-status { flex: 2.2; }
              .print-approval-date { flex: 0.8; }
              .print-approval-signature { max-width: 125px; max-height: 38px; object-fit: contain; vertical-align: bottom; }
              .print-transport .print-council-logo { width: 76px; height: 76px; margin-bottom: 1px; }
              .print-transport .print-contact-row { min-height: 43px; }
              .print-transport .print-contact-left { text-align: left; }
              .print-transport .print-contact-right { text-align: right; }
              .print-transport .print-department { padding: 8px 0 3px; margin-bottom: 18px; }
              .print-transport .print-form-title { margin-bottom: 17px; }
              .print-transport .print-row { gap: 16px; margin-bottom: 6px; }
              .print-transport .print-row.single { margin-bottom: 6px; }
              .print-transport .print-field-value { min-height: 14px; }
              .print-transport-officers-title { margin: 7px 0 3px; font-size: 9pt; }
              .print-transport-officers { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28px; row-gap: 1px; margin: 0 0 12px; }
              .print-transport-officer { display: flex; align-items: baseline; gap: 7px; min-height: 14px; font-size: 9pt; }
              .print-transport-officer-number { width: 12px; flex: 0 0 12px; text-align: right; }
              .print-transport-officer-line { flex: 1; min-width: 0; min-height: 14px; border-bottom: 1px dotted #111; }
              .print-transport .print-signature-row { margin-top: 1px; }
              .print-transport .print-applicant-signature { max-width: 110px; max-height: 30px; }
              .print-transport-approval { margin-top: 12px; }
              .print-transport-recommended-name { flex: 2.2; }
              .print-transport-recommended-position { flex: 1; }
              .print-transport-recommended-date { flex: 0.65; }
              .print-transport-approval-signature { max-width: 100px; max-height: 28px; object-fit: contain; vertical-align: bottom; }
            }
          `}</style>
          {request.application_type === 'duty travel' && (
          <section className="print-authority">
            <img className="print-council-logo" src={councilLogo} alt="Petauke Town Council" />
            <div className="print-council-name">PETAUKE TOWN COUNCIL</div>
            <div className="print-contact-row">
              <div className="print-contact-left">
                <div><strong>Email:</strong> petaukedistrictcouncil@gmail.com</div>
                <div><strong>Facebook:</strong> Petauke Town Council</div>
                <div><strong>Tel:</strong> +260 (216) 371624</div>
              </div>
              <div className="print-contact-right">
                <div>P O Box 560192</div>
                <div>Petauke</div>
                <div><strong>ZAMBIA</strong></div>
              </div>
            </div>
            <div className="print-department">DEPARTMENT OF HEALTH SERVICES</div>
            <h1 className="print-form-title">AUTHORITY TO TRAVEL ON DUTY</h1>
            <div className="print-instruction">(To be filled by officer)</div>

            <div className="print-row">
              <PrintField label="NAME:" value={request.officer_name || request.applicant_name} />
              <PrintField label="FILE NO.:" value={request.file_number} />
            </div>
            <div className="print-row">
              <PrintField label="TITLE OF OFFICER:" value={request.officer_title} />
              <PrintField label="DATE:" value={formatPrintDate(request.application_date)} />
            </div>
            <div className="print-row single">
              <PrintField label="DATE TO LEAVE STATION:" value={formatPrintDate(request.leave_date)} />
            </div>
            <div className="print-row single">
              <PrintField label="DATE OF REPORTING:" value={formatPrintDate(request.reporting_date)} />
            </div>
            <div className="print-row single">
              <PrintField label="NO. OF DAYS:" value={request.number_of_days} />
            </div>
            <div className="print-reason-label">REASON FOR TRAVEL <em>(DESCRIBE THE ACTIVITY TO BE TAKEN)</em></div>
            <div className="print-reason-value">{request.reason || request.purpose || ''}</div>
            <div className="print-row print-signature-row">
              <div className="print-field">
                <span className="print-field-label">SIGNATURE OF APPLYING OFFICER:</span>
                <span className="print-field-value">
                  {request.applicant_signature && <img className="print-applicant-signature" src={request.applicant_signature} alt="Applicant signature" />}
                </span>
              </div>
              <PrintField label="DATE:" value={formatPrintDate(request.application_date)} />
            </div>

            <div className="print-acting-title">(IN MY ABSENCE, THE OFFICER MENTIONED BELOW WILL ACT FOR ADMINISTRATIVE CONVENIENCE)</div>
            <div className="print-row single"><PrintField label="NAME OF OFFICER:" value={request.acting_officer_name} /></div>
            <div className="print-row single"><PrintField label="TITLE OF OFFICER:" value={request.acting_officer_title} /></div>
            <div className="print-row single"><PrintField label="CONTACT NUMBER:" value={request.acting_officer_contact} /></div>

            <div className="print-approval-title">FOR OFFICIAL USE</div>
            <div className="print-row">
              <PrintField className="print-approval-status" label="TRAVEL APPROVED / NOT APPROVED:" value={request.status} />
              <PrintField className="print-approval-date" label="DATE:" value={formatPrintDate(request.approval_date || request.decision_date)} />
            </div>
            <div className="print-row single">
              <PrintField label="NAME OF APPROVING OFFICER:" value={request.approver_name || request.approved_by} />
            </div>
            <div className="print-row single">
              <PrintField label="TITLE OF APPROVING OFFICER:" value={request.approver_title || request.approved_position} />
            </div>
            <div className="print-row single">
              <div className="print-field">
                <span className="print-field-label">APPROVING OFFICER'S SIGNATURE:</span>
                <span className="print-field-value">
                  {request.approver_signature && <img className="print-approval-signature" src={request.approver_signature} alt="Approving officer signature" />}
                </span>
              </div>
            </div>
          </section>
          )}
          {request.application_type === 'transport' && (
            <section className="print-transport">
              <img className="print-council-logo" src={councilLogo} alt="Petauke Town Council" />
              <div className="print-council-name">PETAUKE TOWN COUNCIL</div>
              <div className="print-contact-row">
                <div className="print-contact-left">
                  <div>P O Box 560192</div>
                  <div>Petauke</div>
                  <div><strong>ZAMBIA</strong></div>
                </div>
                <div className="print-contact-right">
                  <div><strong>Email:</strong> petaukedistrictcouncil@gmail.com</div>
                  <div><strong>Facebook:</strong> Petauke Town Council</div>
                  <div><strong>Tel:</strong> +260 (216) 371624</div>
                </div>
              </div>
              <div className="print-department">DEPARTMENT OF HEALTH SERVICES</div>
              <h1 className="print-form-title">TRANSPORT APPLICATION FORM</h1>

              <div className="print-row single"><PrintField label="NAME OF APPLICANT:" value={request.applicant_name} /></div>
              <div className="print-row">
                <PrintField label="DUTY STATION:" value={request.duty_station} />
                <PrintField label="CELL # :" value={request.cell_number} />
              </div>
              <div className="print-row single"><PrintField label="NATURE OF DUTY/REQUEST:" value={request.nature_of_duty} /></div>
              <div className="print-row single"><PrintField label="RESPONSIBLE OFFICER DURING THE JOURNEY:" value={request.responsible_officer} /></div>
              <div className="print-row print-signature-row">
                <div className="print-field">
                  <span className="print-field-label">SIGNATURE OF APPLICANT:</span>
                  <span className="print-field-value">
                    {request.applicant_signature && <img className="print-applicant-signature" src={request.applicant_signature} alt="Applicant signature" />}
                  </span>
                </div>
              </div>

              <div className="print-transport-officers-title">OTHER OFFICERS ON THE PROGRAM:</div>
              <div className="print-transport-officers">
                {Array.from({ length: 10 }, (_, index) => (
                  <div className="print-transport-officer" key={index}>
                    <span className="print-transport-officer-number">{index + 1}.</span>
                    <span className="print-transport-officer-line">{request.other_officers?.[index] || ''}</span>
                  </div>
                ))}
              </div>

              <div className="print-row">
                <PrintField label="REQUIRED FROM:" value={formatPrintDate(request.departure_date)} />
                <PrintField label="TO:" value={formatPrintDate(request.return_date)} />
                <PrintField label="DATE:" value={formatPrintDate(request.application_date)} />
              </div>
              <div className="print-row single"><PrintField label="ROUTE(S) TO BE TAKEN/DESTINATION:" value={request.destination} /></div>
              <div className="print-row single"><PrintField label="DURATION OF THE PROGRAM(S):" value={request.program_duration} /></div>
              <div className="print-row print-transport-approval">
                <PrintField className="print-transport-recommended-name" label="RECOMMENDED BY:" value={request.recommended_by} />
                <PrintField className="print-transport-recommended-position" label="POSITION:" value={request.recommended_position} />
                <PrintField className="print-transport-recommended-date" label="DATE:" value={formatPrintDate(request.recommended_date)} />
              </div>
              <div className="print-row">
                <PrintField label="VEHICLE ALLOCATED:" value={request.vehicle_allocated} />
                <PrintField label="DRIVER ALLOCATED:" value={request.driver_allocated} />
              </div>
              <div className="print-row single">
                <PrintField label="RECOMMENDATION DECISION:" value={request.recommendation_decision || 'RECOMMENDED'} />
              </div>
              {request.recommendation_notes && (
                <div className="print-row single">
                  <PrintField label="RECOMMENDATION NOTES:" value={request.recommendation_notes} />
                </div>
              )}
              <div className="print-row">
                <PrintField label="APPROVED BY:" value={request.approved_by || request.approver_name} />
                <PrintField label="POSITION:" value={request.approved_position || request.approver_title} />
                <div className="print-field">
                  <span className="print-field-label">SIGN:</span>
                  <span className="print-field-value">
                    {request.approver_signature && <img className="print-transport-approval-signature" src={request.approver_signature} alt="Approving officer signature" />}
                  </span>
                </div>
              </div>
              <div className="print-row single"><PrintField label="DATE:" value={formatPrintDate(request.approval_date || request.decision_date)} /></div>
            </section>
          )}
        </>
      )}
      {/* Navigation Header */}
      <div className="screen-request-details" style={styles.topBar}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
        <div style={styles.topBarActions}>
          {request.can_edit && (
            <button onClick={() => navigate(`/requests/${id}/edit`)} style={styles.editBtn}>
              Edit Application
            </button>
          )}
          {request.can_delete && (
            <button onClick={handleDelete} disabled={deleteLoading} style={styles.deleteBtn}>
              {deleteLoading ? 'Deleting...' : 'Delete Application'}
            </button>
          )}
          <button onClick={handlePrint} style={styles.printBtn}>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Main Request Card */}
      <div className="screen-request-details" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.headerMain}>
            {request.application_type === 'duty travel' && (
              <img src={councilLogo} alt="Petauke Town Council" style={styles.councilLogo} />
            )}
            <div>
              <span style={styles.refCode}>
                REF: {request.reference_number || `REQ-${request.id}`}
              </span>
              <h1 style={styles.title}>
                {request.application_type === 'duty travel'
                  ? 'Authority to Travel on Duty'
                  : request.application_type === 'transport'
                  ? 'Transport Application Form'
                  : request.destination}
              </h1>
            </div>
          </div>
          {getStatusBadge(request.status)}
        </div>

        {/* Detailed Information Grid */}
        <div style={styles.detailsGrid}>
          {request.application_type === 'duty travel' ? (
            <>
              <Detail label="Name of officer" value={request.officer_name || request.applicant_name} />
              <Detail label="File number" value={request.file_number} />
              <Detail label="Title of officer" value={request.officer_title} />
              <Detail label="Application date" value={request.application_date} />
              <Detail label="Date to leave station" value={request.leave_date} />
              <Detail label="Date of reporting" value={request.reporting_date} />
              <Detail label="Number of days" value={request.number_of_days} />
              <Detail label="Acting officer" value={request.acting_officer_name || 'Not specified'} />
              <Detail label="Acting officer title" value={request.acting_officer_title || 'Not specified'} />
              <Detail label="Acting officer contact" value={request.acting_officer_contact || 'Not specified'} />
            </>
          ) : (
            <>
              <Detail label="Name of applicant" value={request.applicant_name} />
              <Detail label="Duty station" value={request.duty_station} />
              <Detail label="Cell number" value={request.cell_number} />
              <Detail label="Nature of duty / request" value={request.nature_of_duty} />
              <Detail label="Responsible officer during the journey" value={request.responsible_officer} />
              <Detail label="Required from" value={request.departure_date} />
              <Detail label="To date" value={request.return_date} />
              <Detail label="Route(s) / destination" value={request.destination} />
              <Detail label="Duration of the program(s)" value={request.program_duration} />
            </>
          )}
        </div>

        {request.application_type === 'transport' && request.other_officers?.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Other officers on the program</h3>
            <ol start="6" style={styles.officerList}>
              {request.other_officers.map((officer, index) => <li key={`${index}-${officer}`}>{officer}</li>)}
            </ol>
          </div>
        )}

        {request.application_type === 'transport' && (
          <div style={styles.auditBox}>
            <h4 style={styles.auditTitle}>Recommended by</h4>
            <p style={styles.auditText}><strong>Name:</strong> {request.recommended_by || 'Awaiting recommendation'}</p>
            {request.recommended_by && (
              <>
                <p style={styles.auditText}><strong>Position:</strong> {request.recommended_position}</p>
                <p style={styles.auditText}><strong>Date:</strong> {request.recommended_date}</p>
                <p style={styles.auditText}><strong>Decision:</strong> {request.recommendation_decision || 'RECOMMENDED'}</p>
                <p style={styles.auditText}><strong>Vehicle allocated:</strong> {request.vehicle_allocated || 'Not assigned'}</p>
                <p style={styles.auditText}><strong>Driver allocated:</strong> {request.driver_allocated || 'Not assigned'}</p>
                {request.recommendation_notes && (
                  <p style={styles.auditText}><strong>Recommendation notes:</strong> {request.recommendation_notes}</p>
                )}
              </>
            )}
          </div>
        )}

        {request.applicant_signature && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Signature of Applying Officer</h3>
            <img src={request.applicant_signature} alt="Applicant signature" style={styles.signatureImage} />
          </div>
        )}

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            {request.application_type === 'transport' ? 'Nature of duty / request' : 'Purpose & Justification'}
          </h3>
          <p style={styles.textBlock}>{request.reason || request.purpose}</p>
        </div>

        {request.special_instructions && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Special Instructions / Logistics</h3>
            <p style={styles.textBlock}>{request.special_instructions}</p>
          </div>
        )}

        {request.attachments?.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Supporting Documents</h3>
            <ul style={styles.attachmentList}>
              {request.attachments.map((attachment) => (
                <li key={attachment.id} style={styles.attachmentRow}>
                  <span>{attachment.file_name}</span>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(attachment)}
                    style={styles.downloadBtn}
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Approval Audit Trail */}
        {request.approver_name && (
          <div style={styles.auditBox}>
            <h4 style={styles.auditTitle}>Approval Details</h4>
            <p style={styles.auditText}>
              <strong>Processed By:</strong> {request.approver_name}
            </p>
            {request.decision_date && (
              <p style={styles.auditText}>
                <strong>Date:</strong> {new Date(request.decision_date).toLocaleString()}
              </p>
            )}
            {request.notes && (
              <p style={styles.auditText}>
                <strong>Approver Notes:</strong> {request.notes}
              </p>
            )}
            {request.application_type === 'transport' && (
              <>
                <p style={styles.auditText}><strong>Travel approved/not approved:</strong> {request.status}</p>
                <p style={styles.auditText}><strong>Approved by:</strong> {request.approved_by || request.approver_name}</p>
                <p style={styles.auditText}><strong>Position:</strong> {request.approved_position || request.approver_title}</p>
                <p style={styles.auditText}><strong>Date:</strong> {request.approval_date || request.decision_date}</p>
                <p style={styles.auditText}><strong>Supporting documents:</strong> {request.supporting_documents_status || 'ATTACHED'}</p>
                {request.approver_signature && (
                  <img src={request.approver_signature} alt="Approving officer signature" style={styles.signatureImage} />
                )}
              </>
            )}
            {request.application_type === 'duty travel' && (
              <>
                <p style={styles.auditText}>
                  <strong>Travel approved/not approved:</strong> {request.status}
                </p>
                <p style={styles.auditText}>
                  <strong>Supporting documents:</strong> {request.supporting_documents_status || 'ATTACHED'}
                </p>
                {request.approver_title && (
                  <p style={styles.auditText}>
                    <strong>Approving officer title:</strong> {request.approver_title}
                  </p>
                )}
                {request.approver_signature && (
                  <img src={request.approver_signature} alt="Approving officer signature" style={styles.signatureImage} />
                )}
              </>
            )}
          </div>
        )}

        {request.application_type === 'transport' && user?.role === 'RECOMMENDER' &&
          request.status === 'PENDING' && !request.recommended_by && (
          <div style={styles.actionPanel}>
            <h3 style={styles.actionTitle}>Recommendation</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Name of recommending officer</label>
              <input value={user.full_name || ''} readOnly style={styles.textarea} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Position *</label>
              <input value={recommendationPosition} onChange={(event) => setRecommendationPosition(event.target.value)} required style={styles.textarea} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Vehicle allocated *</label>
              <input
                value={vehicleAllocated ?? request.vehicle_allocated ?? ''}
                onChange={(event) => setVehicleAllocated(event.target.value)}
                style={styles.textarea}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Driver allocated *</label>
              <input
                value={driverAllocated ?? request.driver_allocated ?? ''}
                onChange={(event) => setDriverAllocated(event.target.value)}
                style={styles.textarea}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Rejection reason (required to reject)</label>
              <textarea
                value={recommendationNotes}
                onChange={(event) => setRecommendationNotes(event.target.value)}
                rows="3"
                style={styles.textarea}
              />
            </div>
            <p style={styles.auditText}><strong>Date:</strong> {new Date().toISOString().slice(0, 10)}</p>
            <div style={styles.actionButtons}>
              <button onClick={() => handleRecommendation('REJECTED')} disabled={actionLoading} style={styles.rejectBtn}>
                {actionLoading ? 'Submitting...' : 'Reject Request'}
              </button>
              <button onClick={() => handleRecommendation('RECOMMENDED')} disabled={actionLoading} style={styles.approveBtn}>
                {actionLoading ? 'Submitting...' : 'Recommend Transport Application'}
              </button>
            </div>
          </div>
        )}

        {request.application_type === 'transport' && ['APPROVER', 'ADMIN'].includes(user?.role) &&
          request.status === 'PENDING' && !request.recommended_by && (
          <div role="status" style={styles.awaitingRecommendation}>
            Awaiting recommendation by a Recommender before final approval.
          </div>
        )}

        {/* Action Panel for Approvers/Admins on Pending Requests */}
        {(user?.role === 'APPROVER' || user?.role === 'ADMIN') && request.status === 'PENDING' &&
          (request.application_type !== 'transport' || request.recommended_by) && (
          <div style={styles.actionPanel}>
            <h3 style={styles.actionTitle}>Authorization Decision</h3>
            {['transport', 'duty travel'].includes(request.application_type) && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Name of approving officer</label>
                  <input value={user?.full_name || ''} readOnly style={styles.textarea} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Position of approving officer *</label>
                  <input
                    value={approverTitle}
                    onChange={(event) => setApproverTitle(event.target.value)}
                    required
                    style={styles.textarea}
                  />
                </div>
              </>
            )}
            <div style={styles.formGroup}>
              <label style={styles.label}>Approver Comments / Instructions</label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows="3"
                placeholder="Add comments or instructions (Required for rejection)..."
                style={styles.textarea}
              />
            </div>

            <SignaturePad
              label={request.application_type === 'transport' ? 'Signature of approving officer *' : 'Approver Digital Signature *'}
              onSignatureSave={setSignature}
            />

            <div style={styles.actionButtons}>
              <button
                onClick={() => handleDecision('REJECTED')}
                disabled={actionLoading}
                style={styles.rejectBtn}
              >
                Reject Request
              </button>
              <button
                onClick={() => handleDecision('APPROVED')}
                disabled={actionLoading}
                style={styles.approveBtn}
              >
                Approve Transport Request
              </button>
            </div>
          </div>
        )}

        {['duty travel', 'transport'].includes(request.application_type) && (
          <div style={styles.stampBox}>
            <strong>OFFICIAL STAMP</strong>
            <span>For authorized office use</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatPrintDate(value) {
  if (!value) return '';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
}

function PrintField({ label, value, className = '' }) {
  return (
    <div className={`print-field ${className}`}>
      <span className="print-field-label">{label}</span>
      <span className="print-field-value">{value || ''}</span>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div style={styles.detailItem}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value || 'N/A'}</span>
    </div>
  );
}

// Inline Styles
const styles = {
  container: {
    maxWidth: '800px',
    margin: '30px auto',
    padding: '0 20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  topBarActions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: '8px'
  },
  backBtn: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  printBtn: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  editBtn: {
    backgroundColor: '#146356',
    color: '#ffffff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  deleteBtn: {
    backgroundColor: '#ffffff',
    color: '#a33a46',
    border: '1px solid #d56b6b',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '32px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '20px',
    marginBottom: '24px'
  },
  headerMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  councilLogo: {
    width: '76px',
    height: '76px',
    objectFit: 'contain',
    flexShrink: 0
  },
  refCode: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  title: {
    margin: '4px 0 0 0',
    fontSize: '22px',
    color: '#0f172a'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '28px',
    backgroundColor: '#f8fafc',
    padding: '20px',
    borderRadius: '8px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  label: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  value: {
    fontSize: '14px',
    color: '#0f172a',
    fontWeight: '600'
  },
  signatureImage: {
    display: 'block',
    maxWidth: '260px',
    maxHeight: '100px',
    objectFit: 'contain',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #64748b'
  },
  officerList: {
    margin: 0,
    padding: '12px 12px 12px 34px',
    borderTop: '1px solid #e2e8f0',
    color: '#334155',
    lineHeight: 1.7
  },
  stampBox: {
    display: 'flex',
    width: '190px',
    height: '100px',
    margin: '24px 0 0 auto',
    border: '1px dashed #64748b',
    color: '#64748b',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px'
  },
  awaitingRecommendation: {
    marginTop: '24px',
    padding: '12px 14px',
    border: '1px solid #fcd34d',
    borderRadius: '6px',
    backgroundColor: '#fffbeb',
    color: '#92400e',
    fontSize: '13px'
  },
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '14px',
    color: '#334155',
    marginBottom: '8px',
    fontWeight: '600'
  },
  attachmentList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    borderTop: '1px solid #e2e8f0'
  },
  attachmentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '13px'
  },
  downloadBtn: {
    backgroundColor: '#ffffff',
    color: '#334155',
    border: '1px solid #cbd5e1',
    padding: '6px 10px',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  textBlock: {
    fontSize: '14px',
    color: '#334155',
    lineHeight: '1.6',
    margin: 0,
    backgroundColor: '#ffffff',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0'
  },
  auditBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '24px'
  },
  auditTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#166534'
  },
  auditText: {
    margin: '4px 0',
    fontSize: '13px',
    color: '#15803d'
  },
  actionPanel: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '2px dashed #e2e8f0'
  },
  actionTitle: {
    fontSize: '16px',
    color: '#0f172a',
    marginBottom: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '16px'
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'vertical'
  },
  actionButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  approveBtn: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  centerMessage: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b',
    fontSize: '15px'
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    fontSize: '14px',
    marginBottom: '16px'
  }
};