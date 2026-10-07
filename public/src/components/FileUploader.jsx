import React, { useState } from 'react';

/**
 * FileUploader Component
 * @param {Function} onFilesSelected - Callback function passing the array of valid File objects to the parent form
 * @param {number} maxFiles - Maximum allowed files (default: 5)
 * @param {number} maxSizeMB - Maximum file size in MB per file (default: 5)
 */
export default function FileUploader({ onFilesSelected, maxFiles = 5, maxSizeMB = 5 }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState('');

  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const handleFiles = (incomingFiles) => {
    setError('');
    const newFiles = Array.from(incomingFiles);
    const validFiles = [];

    // Check file count limit
    if (selectedFiles.length + newFiles.length > maxFiles) {
      setError(`You can only upload a maximum of ${maxFiles} files.`);
      return;
    }

    for (let file of newFiles) {
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        setError(`"${file.name}" is not a supported file format. (PDF, JPG, PNG, DOC, DOCX only)`);
        return;
      }

      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`"${file.name}" exceeds the ${maxSizeMB}MB size limit.`);
        return;
      }

      validFiles.push(file);
    }

    const updatedFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(updatedFiles);
    if (onFilesSelected) onFilesSelected(updatedFiles);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = (indexToRemove) => {
    const updatedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    setSelectedFiles(updatedFiles);
    if (onFilesSelected) onFilesSelected(updatedFiles);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ margin: '0', minWidth: '190px', flex: 1 }}>
      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px', fontSize: '12px' }}>
        Supporting documents (optional)
      </label>

      {/* Drag and Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          border: '2px dashed #cbd5e0',
          borderRadius: '8px',
          padding: '12px 8px',
          textAlign: 'center',
          backgroundColor: '#f7fafc',
          cursor: 'pointer',
          transition: 'border-color 0.2s ease-in-out'
        }}
        onClick={() => document.getElementById('file-input-element').click()}
      >
        <p style={{ margin: 0, color: '#4a5568', fontSize: '14px' }}>
          Drag and drop files here, or <span style={{ color: '#3182ce', fontWeight: 'bold' }}>browse</span>
        </p>
        <span style={{ fontSize: '12px', color: '#a0aec0' }}>
          Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max {maxSizeMB}MB each)
        </span>
        <input
          id="file-input-element"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <p style={{ color: '#e53e3e', fontSize: '13px', marginTop: '6px' }}>{error}</p>
      )}

      {/* File Previews List */}
      {selectedFiles.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '12px' }}>
          {selectedFiles.map((file, index) => (
            <li
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                backgroundColor: '#edf2f7',
                borderRadius: '6px',
                marginBottom: '6px',
                fontSize: '13px'
              }}
            >
              <div>
                <strong>{file.name}</strong> ({formatFileSize(file.size)})
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e53e3e',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                ✕ Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}