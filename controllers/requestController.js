const db = require('../config/db');
const fs = require('fs/promises');
const path = require('path');

const removeUploadedFiles = async (files) => {
  await Promise.all((files || []).map((file) => fs.unlink(file.path).catch(() => {})));
};

const removeStoredFiles = async (storedPaths) => {
  await Promise.all((storedPaths || []).filter(Boolean).map((storedPath) =>
    fs.unlink(path.join(__dirname, '../uploads', path.basename(storedPath))).catch(() => {})
  ));
};

const parseFormData = (value) => typeof value === 'string' ? JSON.parse(value) : value || {};

const statusToApp = {
  draft: 'DRAFT',
  submitted: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED'
};

const statusToDatabase = {
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const formatRequest = (row) => {
  const formData = typeof row.form_data === 'string'
    ? JSON.parse(row.form_data)
    : row.form_data || {};

  return {
    ...formData,
    id: row.id,
    application_type: row.type,
    reference_number: `TR-${row.id}`,
    status: statusToApp[row.status] || row.status,
    applicant_name: row.applicant_name,
    applicant_department: null,
    approver_name: row.approver_name || null,
    approver_signature: row.approver_signature || null,
    notes: row.notes || null,
    decision_date: row.decision_date || null,
    created_at: row.created_at
  };
};

const requestSelect = `
  SELECT a.id, a.officer_id, a.type, a.form_data, a.status, a.created_at,
    applicant.name AS applicant_name,
    approver.name AS approver_name,
    approval.comments AS notes,
    approval.approver_signature AS approver_signature,
    approval.timestamp AS decision_date
  FROM applications a
  JOIN users applicant ON applicant.id = a.officer_id
  LEFT JOIN approvals approval ON approval.id = (
    SELECT MAX(id) FROM approvals WHERE application_id = a.id
  )
  LEFT JOIN users approver ON approver.id = approval.approver_id
`;

exports.createRequest = async (req, res, next) => {
  const uploadedFiles = req.files || [];
  let applicantSignaturePath;
  const rejectRequest = async (message) => {
    await removeUploadedFiles(uploadedFiles);
    return res.status(400).json({ message });
  };

  if (uploadedFiles.length === 0) {
    return res.status(400).json({ message: 'Attach at least one required supporting document.' });
  }

  let connection;
  let transactionCommitted = false;
  try {
    const isDutyTravel = req.body.application_type === 'duty travel';
    let applicationType = 'transport';
    let formData;

    if (isDutyTravel) {
      const {
        file_number,
        officer_title,
        application_date,
        leave_date,
        reporting_date,
        reason,
        applicant_signature
      } = req.body;
      const datesAreValid = [application_date, leave_date, reporting_date].every((date) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date || '') && !Number.isNaN(Date.parse(date))
      );
      if (!file_number || !officer_title || !application_date || !leave_date || !reporting_date || !reason) {
        return rejectRequest('Complete the officer details, travel dates, and reason for travel.');
      }
      if (!datesAreValid || new Date(reporting_date) < new Date(leave_date)) {
        return rejectRequest('Enter valid travel dates and ensure reporting is not before departure.');
      }
      const signatureMatch = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(applicant_signature || '');
      if (!signatureMatch) {
        return rejectRequest('A confirmed applicant signature is required.');
      }
      const signatureBuffer = Buffer.from(signatureMatch[2], 'base64');
      if (!signatureBuffer.length || signatureBuffer.length > 1024 * 1024) {
        return rejectRequest('The applicant signature must be smaller than 1 MB.');
      }

      const [applicants] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
      if (!applicants[0]) return rejectRequest('Applicant account not found.');

      const signatureDirectory = path.join(__dirname, '../uploads/signatures');
      const extension = signatureMatch[1] === 'png' ? 'png' : 'jpg';
      const fileName = `applicant-${req.user.id}-${Date.now()}-${require('crypto').randomBytes(6).toString('hex')}.${extension}`;
      applicantSignaturePath = path.join(signatureDirectory, fileName);
      await fs.mkdir(signatureDirectory, { recursive: true });
      await fs.writeFile(applicantSignaturePath, signatureBuffer, { flag: 'wx' });

      const departureDate = new Date(`${leave_date}T00:00:00`);
      const reportingDate = new Date(`${reporting_date}T00:00:00`);
      const numberOfDays = Math.ceil((reportingDate - departureDate) / 86400000) + 1;
      applicationType = 'duty travel';
      formData = {
        application_type: applicationType,
        destination: 'Authority to Travel',
        departure_date: leave_date,
        return_date: reporting_date,
        vehicle_type: 'Not applicable',
        passenger_count: 1,
        purpose: reason,
        officer_name: applicants[0].name,
        file_number,
        officer_title,
        application_date,
        leave_date,
        reporting_date,
        number_of_days: numberOfDays,
        reason,
        acting_officer_name: req.body.acting_officer_name || '',
        acting_officer_title: req.body.acting_officer_title || '',
        acting_officer_contact: req.body.acting_officer_contact || '',
        applicant_signature: `/uploads/signatures/${fileName}`,
        special_instructions: ''
      };
    } else {
      const {
        duty_station,
        cell_number,
        nature_of_duty,
        responsible_officer,
        other_officers,
        destination,
        departure_date,
        return_date,
        required_time,
        program_duration,
        vehicle_allocated,
        driver_allocated,
        applicant_signature
      } = req.body;

      if (!duty_station || !cell_number || !nature_of_duty || !responsible_officer ||
          !destination || !departure_date || !return_date || !required_time || !program_duration) {
        return rejectRequest('Complete all required fields on the Transport Application Form.');
      }
      const datesAreValid = [departure_date, return_date].every((date) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date || '') && !Number.isNaN(Date.parse(date))
      );
      if (!datesAreValid || new Date(return_date) < new Date(departure_date)) {
        return rejectRequest('Enter valid dates and ensure the end date is not before the start date.');
      }

      let otherOfficerNames;
      try {
        otherOfficerNames = JSON.parse(other_officers || '[]');
      } catch {
        return rejectRequest('Other officers must be submitted as a valid list.');
      }
      if (!Array.isArray(otherOfficerNames) || otherOfficerNames.length > 5 ||
          otherOfficerNames.some((name) => typeof name !== 'string')) {
        return rejectRequest('List no more than five other officers.');
      }

      const signatureMatch = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(applicant_signature || '');
      if (!signatureMatch) return rejectRequest('A confirmed applicant signature is required.');
      const signatureBuffer = Buffer.from(signatureMatch[2], 'base64');
      if (!signatureBuffer.length || signatureBuffer.length > 1024 * 1024) {
        return rejectRequest('The applicant signature must be smaller than 1 MB.');
      }

      const signatureDirectory = path.join(__dirname, '../uploads/signatures');
      const extension = signatureMatch[1] === 'png' ? 'png' : 'jpg';
      const fileName = `applicant-${req.user.id}-${Date.now()}-${require('crypto').randomBytes(6).toString('hex')}.${extension}`;
      applicantSignaturePath = path.join(signatureDirectory, fileName);
      await fs.mkdir(signatureDirectory, { recursive: true });
      await fs.writeFile(applicantSignaturePath, signatureBuffer, { flag: 'wx' });

      formData = {
        application_type: 'transport',
        destination,
        duty_station,
        cell_number,
        nature_of_duty,
        responsible_officer,
        other_officers: otherOfficerNames,
        departure_date,
        return_date,
        required_time,
        program_duration,
        vehicle_allocated: vehicle_allocated || '',
        driver_allocated: driver_allocated || '',
        applicant_signature: `/uploads/signatures/${fileName}`,
        vehicle_type: vehicle_allocated || 'Not assigned',
        passenger_count: 1 + otherOfficerNames.filter((name) => name.trim()).length,
        purpose: nature_of_duty,
        special_instructions: ''
      };
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO applications (officer_id, type, form_data, status) VALUES (?, ?, ?, ?)',
      [req.user.id, applicationType, JSON.stringify(formData), 'submitted']
    );
    for (const file of uploadedFiles) {
      await connection.query(
        'INSERT INTO request_attachments (request_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)',
        [result.insertId, file.originalname.slice(0, 255), `/uploads/${path.basename(file.filename)}`, file.mimetype]
      );
    }
    await connection.commit();
    transactionCommitted = true;

    const [rows] = await db.query(`${requestSelect} WHERE a.id = ?`, [result.insertId]);
    res.status(201).json({ message: 'Application created.', request: formatRequest(rows[0]) });
  } catch (error) {
    if (connection && !transactionCommitted) await connection.rollback();
    if (!transactionCommitted) {
      await removeUploadedFiles(uploadedFiles);
      if (applicantSignaturePath) await fs.unlink(applicantSignaturePath).catch(() => {});
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

exports.getAllRequests = async (req, res, next) => {
  try {
    const applicantOnly = req.user.role === 'APPLICANT';
    const [rows] = await db.query(
      `${requestSelect}${applicantOnly ? ' WHERE a.officer_id = ?' : ''} ORDER BY a.created_at DESC`,
      applicantOnly ? [req.user.id] : []
    );
    res.json({ requests: rows.map(formatRequest) });
  } catch (error) {
    next(error);
  }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const [rows] = await db.query(`${requestSelect} WHERE a.id = ?`, [req.params.id]);
    const row = rows[0];
    if (!row || (req.user.role === 'APPLICANT' && row.officer_id !== req.user.id)) {
      return res.status(404).json({ message: 'Request not found.' });
    }
    const [attachments] = await db.query(
      'SELECT id, file_name, file_type, uploaded_at FROM request_attachments WHERE request_id = ? ORDER BY id',
      [req.params.id]
    );
    const formData = parseFormData(row.form_data);
    const isOwner = Number(row.officer_id) === Number(req.user.id);
    const canEdit = (isOwner || req.user.role === 'ADMIN') && row.status === 'submitted' &&
      !(row.type === 'transport' && formData.recommended_by);
    const canDelete = (isOwner || req.user.role === 'ADMIN') &&
      ['approved', 'rejected'].includes(row.status);
    res.json({ request: { ...formatRequest(row), attachments, is_owner: isOwner, can_edit: canEdit, can_delete: canDelete } });
  } catch (error) {
    next(error);
  }
};

exports.updateRequest = async (req, res, next) => {
  const uploadedFiles = req.files || [];
  let connection;
  let signatureFilePath;
  let oldSignaturePath;
  let committed = false;

  const rejectUpdate = async (status, message) => {
    if (connection) await connection.rollback();
    await removeUploadedFiles(uploadedFiles);
    if (signatureFilePath) await fs.unlink(signatureFilePath).catch(() => {});
    return res.status(status).json({ message });
  };

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT officer_id, type, status, form_data FROM applications WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    const row = rows[0];
    if (!row) return await rejectUpdate(404, 'Application not found.');
    if (Number(row.officer_id) !== Number(req.user.id) && req.user.role !== 'ADMIN') {
      return await rejectUpdate(403, 'You may only edit your own application.');
    }
    if (row.status !== 'submitted') {
      return await rejectUpdate(409, 'Only applications awaiting review can be edited.');
    }

    const formData = parseFormData(row.form_data);
    if (row.type === 'transport' && formData.recommended_by) {
      return await rejectUpdate(409, 'This application can no longer be edited because it has been recommended.');
    }

    const [existingAttachments] = await connection.query(
      'SELECT id FROM request_attachments WHERE request_id = ?',
      [req.params.id]
    );
    if (existingAttachments.length + uploadedFiles.length === 0) {
      return await rejectUpdate(400, 'At least one supporting document must remain attached.');
    }
    if (existingAttachments.length + uploadedFiles.length > 5) {
      return await rejectUpdate(400, 'A maximum of five supporting documents is allowed.');
    }

    const applicantSignature = req.body.applicant_signature;
    if (applicantSignature) {
      const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(applicantSignature);
      if (!match) return await rejectUpdate(400, 'Applicant signature must be a PNG or JPG image.');
      const signatureBuffer = Buffer.from(match[2], 'base64');
      if (!signatureBuffer.length || signatureBuffer.length > 1024 * 1024) {
        return await rejectUpdate(400, 'Applicant signature must be smaller than 1 MB.');
      }
      const signatureDirectory = path.join(__dirname, '../uploads/signatures');
      const extension = match[1] === 'png' ? 'png' : 'jpg';
      const fileName = `applicant-${req.user.id}-${Date.now()}-${require('crypto').randomBytes(6).toString('hex')}.${extension}`;
      signatureFilePath = path.join(signatureDirectory, fileName);
      await fs.mkdir(signatureDirectory, { recursive: true });
      await fs.writeFile(signatureFilePath, signatureBuffer, { flag: 'wx' });
      oldSignaturePath = formData.applicant_signature;
      formData.applicant_signature = `/uploads/signatures/${fileName}`;
    }

    if (row.type === 'duty travel') {
      const { file_number, officer_title, application_date, leave_date, reporting_date, reason } = req.body;
      const datesValid = [application_date, leave_date, reporting_date].every((date) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date || '') && !Number.isNaN(Date.parse(date))
      );
      if (!file_number || !officer_title || !reason || !datesValid ||
          new Date(reporting_date) < new Date(leave_date)) {
        return await rejectUpdate(400, 'Complete the required Authority to Travel fields and check the dates.');
      }
      if (!formData.applicant_signature) return await rejectUpdate(400, 'A confirmed applicant signature is required.');
      const departure = new Date(`${leave_date}T00:00:00`);
      const reporting = new Date(`${reporting_date}T00:00:00`);
      Object.assign(formData, {
        file_number,
        officer_title,
        application_date,
        leave_date,
        reporting_date,
        number_of_days: Math.ceil((reporting - departure) / 86400000) + 1,
        reason,
        purpose: reason,
        acting_officer_name: req.body.acting_officer_name || '',
        acting_officer_title: req.body.acting_officer_title || '',
        acting_officer_contact: req.body.acting_officer_contact || ''
      });
    } else {
      const {
        duty_station,
        cell_number,
        nature_of_duty,
        responsible_officer,
        destination,
        departure_date,
        return_date,
        required_time,
        program_duration,
        vehicle_allocated,
        driver_allocated
      } = req.body;
      const datesValid = [departure_date, return_date].every((date) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date || '') && !Number.isNaN(Date.parse(date))
      );
      if (!duty_station || !cell_number || !nature_of_duty || !responsible_officer || !destination ||
          !required_time || !program_duration || !datesValid || new Date(return_date) < new Date(departure_date)) {
        return await rejectUpdate(400, 'Complete the required Transport Application fields and check the dates.');
      }
      if (!formData.applicant_signature) return await rejectUpdate(400, 'A confirmed applicant signature is required.');

      let otherOfficers;
      try {
        otherOfficers = JSON.parse(req.body.other_officers || '[]');
      } catch {
        return await rejectUpdate(400, 'Other officers must be submitted as a valid list.');
      }
      if (!Array.isArray(otherOfficers) || otherOfficers.length > 5 ||
          otherOfficers.some((name) => typeof name !== 'string')) {
        return await rejectUpdate(400, 'List no more than five other officers.');
      }

      Object.assign(formData, {
        duty_station,
        cell_number,
        nature_of_duty,
        purpose: nature_of_duty,
        responsible_officer,
        other_officers: otherOfficers,
        destination,
        departure_date,
        return_date,
        required_time,
        program_duration,
        vehicle_allocated: vehicle_allocated || '',
        driver_allocated: driver_allocated || '',
        vehicle_type: vehicle_allocated || 'Not assigned',
        passenger_count: 1 + otherOfficers.filter((name) => name.trim()).length
      });
    }

    await connection.query(
      'UPDATE applications SET form_data = ? WHERE id = ?',
      [JSON.stringify(formData), req.params.id]
    );
    for (const file of uploadedFiles) {
      await connection.query(
        'INSERT INTO request_attachments (request_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)',
        [req.params.id, file.originalname.slice(0, 255), `/uploads/${path.basename(file.filename)}`, file.mimetype]
      );
    }
    await connection.commit();
    committed = true;
    if (oldSignaturePath) await removeStoredFiles([oldSignaturePath]);
    const [updatedRows] = await db.query(`${requestSelect} WHERE a.id = ?`, [req.params.id]);
    res.json({ message: 'Application updated.', request: formatRequest(updatedRows[0]) });
  } catch (error) {
    if (connection && !committed) await connection.rollback();
    if (!committed) {
      await removeUploadedFiles(uploadedFiles);
      if (signatureFilePath) await fs.unlink(signatureFilePath).catch(() => {});
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteRequest = async (req, res, next) => {
  let connection;
  let storedPaths = [];
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT officer_id, status, form_data FROM applications WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    const row = rows[0];
    if (!row) {
      await connection.rollback();
      return res.status(404).json({ message: 'Application not found.' });
    }
    if (Number(row.officer_id) !== Number(req.user.id) && req.user.role !== 'ADMIN') {
      await connection.rollback();
      return res.status(403).json({ message: 'You may only delete your own application.' });
    }
    if (!['approved', 'rejected'].includes(row.status)) {
      await connection.rollback();
      return res.status(409).json({ message: 'Only approved or rejected applications can be deleted.' });
    }

    const formData = parseFormData(row.form_data);
    const [attachments] = await connection.query(
      'SELECT file_path FROM request_attachments WHERE request_id = ?',
      [req.params.id]
    );
    const [approvals] = await connection.query(
      'SELECT approver_signature FROM approvals WHERE application_id = ?',
      [req.params.id]
    );
    storedPaths = [
      formData.applicant_signature,
      ...attachments.map((attachment) => attachment.file_path),
      ...approvals.map((approval) => approval.approver_signature)
    ];

    await connection.query('DELETE FROM approvals WHERE application_id = ?', [req.params.id]);
    await connection.query('DELETE FROM request_attachments WHERE request_id = ?', [req.params.id]);
    await connection.query('DELETE FROM applications WHERE id = ?', [req.params.id]);
    await connection.commit();
    await removeStoredFiles(storedPaths);
    res.json({ message: 'Application deleted.' });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

exports.downloadAttachment = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT attachment.file_name, attachment.file_path, application.officer_id
       FROM request_attachments attachment
       JOIN applications application ON application.id = attachment.request_id
       WHERE attachment.id = ? AND application.id = ?`,
      [req.params.attachmentId, req.params.id]
    );
    const attachment = rows[0];
    if (!attachment || (req.user.role === 'APPLICANT' && attachment.officer_id !== req.user.id)) {
      return res.status(404).json({ message: 'Attachment not found.' });
    }

    const filePath = path.join(__dirname, '../uploads', path.basename(attachment.file_path));
    res.download(filePath, attachment.file_name, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    next(error);
  }
};

exports.recommendRequest = async (req, res, next) => {
  const position = String(req.body.position || '').trim();
  if (!position) {
    return res.status(400).json({ message: 'Recommending officer position is required.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT officer_id, type, status, form_data FROM applications WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    if (!rows[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Request not found.' });
    }
    if (rows[0].type !== 'transport') {
      await connection.rollback();
      return res.status(400).json({ message: 'Recommendations are only used for transport applications.' });
    }
    if (Number(rows[0].officer_id) === Number(req.user.id)) {
      await connection.rollback();
      return res.status(403).json({ message: 'You cannot recommend your own transport application.' });
    }
    if (rows[0].status !== 'submitted') {
      await connection.rollback();
      return res.status(409).json({ message: 'This request is no longer awaiting recommendation.' });
    }

    const formData = typeof rows[0].form_data === 'string'
      ? JSON.parse(rows[0].form_data)
      : rows[0].form_data || {};
    if (formData.recommended_by) {
      await connection.rollback();
      return res.status(409).json({ message: 'This request has already been recommended.' });
    }

    const [users] = await connection.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    if (!users[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Recommending officer not found.' });
    }
    formData.recommended_by = users[0].name;
    formData.recommended_position = position;
    formData.recommended_date = new Date().toISOString().slice(0, 10);
    await connection.query(
      'UPDATE applications SET form_data = ? WHERE id = ?',
      [JSON.stringify(formData), req.params.id]
    );
    await connection.commit();

    const [updatedRows] = await db.query(`${requestSelect} WHERE a.id = ?`, [req.params.id]);
    res.json({ message: 'Transport application recommended.', request: formatRequest(updatedRows[0]) });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

exports.approveOrRejectRequest = async (req, res, next) => {
  const status = String(req.body.status || '').toUpperCase();
  const databaseStatus = statusToDatabase[status];
  const notes = String(req.body.notes || req.body.comments || '').trim();
  const approverTitle = String(req.body.approver_title || '').trim();

  if (!databaseStatus) {
    return res.status(400).json({ message: 'Status must be APPROVED or REJECTED.' });
  }
  if (status === 'REJECTED' && !notes) {
    return res.status(400).json({ message: 'A reason is required when rejecting a request.' });
  }
  const signatureMatch = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(req.body.signature || ''));
  if (!signatureMatch) {
    return res.status(400).json({ message: 'A PNG or JPG approver signature is required.' });
  }
  const signatureBuffer = Buffer.from(signatureMatch[2], 'base64');
  if (!signatureBuffer.length || signatureBuffer.length > 1024 * 1024) {
    return res.status(400).json({ message: 'The signature image must be smaller than 1 MB.' });
  }

  let connection;
  let signatureFilePath;
  let transactionCommitted = false;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT type, status, form_data FROM applications WHERE id = ? FOR UPDATE',
      [req.params.id]
    );

    if (!rows[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Request not found.' });
    }
    if (rows[0].status !== 'submitted') {
      await connection.rollback();
      return res.status(409).json({ message: 'This request has already been decided.' });
    }
    if (rows[0].type === 'duty travel' && !approverTitle) {
      await connection.rollback();
      return res.status(400).json({ message: 'Approving officer title is required for Authority to Travel applications.' });
    }

    const formData = typeof rows[0].form_data === 'string'
      ? JSON.parse(rows[0].form_data)
      : rows[0].form_data || {};
    if (rows[0].type === 'transport' && !['APPROVER', 'ADMIN'].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({ message: 'A transport application must be approved by an approver or administrator.' });
    }
    if (rows[0].type === 'transport' && (!formData.recommended_by || !formData.recommended_position)) {
      await connection.rollback();
      return res.status(409).json({ message: 'A recommending officer must complete their section first.' });
    }
    if (['transport', 'duty travel'].includes(rows[0].type) && !approverTitle) {
      await connection.rollback();
      return res.status(400).json({ message: 'Approving officer position is required.' });
    }

    const [approvers] = await connection.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    if (!approvers[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Approving officer not found.' });
    }
    formData.approved_by = approvers[0].name;
    formData.approved_position = approverTitle;
    formData.approval_date = new Date().toISOString().slice(0, 10);
    if (rows[0].type === 'duty travel') {
      formData.approver_title = approverTitle;
      formData.supporting_documents_status = 'ATTACHED';
    }
    if (rows[0].type === 'transport') {
      formData.approver_title = approverTitle;
      formData.supporting_documents_status = 'ATTACHED';
    }

    const extension = signatureMatch[1] === 'png' ? 'png' : 'jpg';
    const signatureDirectory = path.join(__dirname, '../uploads/signatures');
    const fileName = `approval-${req.params.id}-${Date.now()}-${require('crypto').randomBytes(6).toString('hex')}.${extension}`;
    signatureFilePath = path.join(signatureDirectory, fileName);
    await fs.mkdir(signatureDirectory, { recursive: true });
    await fs.writeFile(signatureFilePath, signatureBuffer, { flag: 'wx' });

    await connection.query(
      'UPDATE applications SET status = ?, form_data = ? WHERE id = ?',
      [databaseStatus, JSON.stringify(formData), req.params.id]
    );
    await connection.query(
      'INSERT INTO approvals (application_id, approver_id, decision, comments, approver_signature) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, req.user.id, databaseStatus, notes || null, `/uploads/signatures/${fileName}`]
    );
    await connection.commit();
    transactionCommitted = true;

    const [updatedRows] = await db.query(`${requestSelect} WHERE a.id = ?`, [req.params.id]);
    res.json({ message: 'Request decision saved.', request: formatRequest(updatedRows[0]) });
  } catch (error) {
    if (connection && !transactionCommitted) await connection.rollback();
    if (signatureFilePath && !transactionCommitted) {
      await fs.unlink(signatureFilePath).catch(() => {});
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
};