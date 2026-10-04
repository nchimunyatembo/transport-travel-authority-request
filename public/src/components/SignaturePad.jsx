import React, { useRef, useEffect, useState } from 'react';
import SignaturePadLib from 'signature_pad';

/**
 * SignaturePad Component
 * @param {Function} onSignatureSave - Callback function returning the signature (as a Base64 Data URL or file string)
 */
export default function SignaturePad({ onSignatureSave, label = 'Approver Digital Signature *' }) {
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  const [activeTab, setActiveTab] = useState('draw'); // 'draw' or 'upload'
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [isPadEmpty, setIsPadEmpty] = useState(true);

  // Initialize SignaturePad instance on canvas render
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      
      // Adjust canvas resolution for high-DPI displays
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);

      signaturePadRef.current = new SignaturePadLib(canvas, {
        penColor: 'rgb(0, 0, 128)', // Navy blue ink
        backgroundColor: 'rgb(255, 255, 255)'
      });

      // Listener to check if signature canvas is filled
      signaturePadRef.current.addEventListener('endStroke', () => {
        setIsPadEmpty(signaturePadRef.current.isEmpty());
      });
    }

    return () => {
      if (signaturePadRef.current) {
        signaturePadRef.current.off();
      }
    };
  }, [activeTab]);

  // Clear signature pad
  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setIsPadEmpty(true);
      setSignaturePreview(null);
      if (onSignatureSave) onSignatureSave(null);
    }
  };

  // Capture drawn signature as Base64 image
  const handleSaveDrawnSignature = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const base64Image = signaturePadRef.current.toDataURL('image/png');
      setSignaturePreview(base64Image);
      if (onSignatureSave) onSignatureSave(base64Image);
    }
  };

  // Process uploaded signature file
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result;
        setSignaturePreview(base64Image);
        if (onSignatureSave) onSignatureSave(base64Image);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>{label}</label>

      {/* Tab Switcher */}
      <div style={styles.tabContainer}>
        <button
          type="button"
          onClick={() => { setActiveTab('draw'); setSignaturePreview(null); if (onSignatureSave) onSignatureSave(null); }}
          style={{
            ...styles.tabBtn,
            borderBottom: activeTab === 'draw' ? '2px solid #2563eb' : 'none',
            color: activeTab === 'draw' ? '#2563eb' : '#64748b'
          }}
        >
          ✍️ Draw Signature
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('upload'); setSignaturePreview(null); if (onSignatureSave) onSignatureSave(null); }}
          style={{
            ...styles.tabBtn,
            borderBottom: activeTab === 'upload' ? '2px solid #2563eb' : 'none',
            color: activeTab === 'upload' ? '#2563eb' : '#64748b'
          }}
        >
          📁 Upload Image
        </button>
      </div>

      {/* Mode 1: On-Screen Canvas Drawing */}
      {activeTab === 'draw' && (
        <div style={styles.canvasWrapper}>
          <canvas ref={canvasRef} style={styles.canvas} />
          <div style={styles.actionRow}>
            <button
              type="button"
              onClick={handleClear}
              style={styles.clearBtn}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSaveDrawnSignature}
              disabled={isPadEmpty}
              style={{
                ...styles.applyBtn,
                opacity: isPadEmpty ? 0.5 : 1,
                cursor: isPadEmpty ? 'not-allowed' : 'pointer'
              }}
            >
              Confirm Signature
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Signature File Upload */}
      {activeTab === 'upload' && (
        <div style={styles.uploadWrapper}>
          <input
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleFileUpload}
            style={styles.fileInput}
          />
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Upload a clear PNG or JPG image of your official signature.
          </span>
        </div>
      )}

      {/* Active Signature Preview */}
      {signaturePreview && (
        <div style={styles.previewBox}>
          <span style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold' }}>
            ✓ Active Signature Selected:
          </span>
          <img
            src={signaturePreview}
            alt="Approver Signature Preview"
            style={styles.previewImg}
          />
        </div>
      )}
    </div>
  );
}

// Inline Styles
const styles = {
  container: {
    margin: '20px 0',
    padding: '16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#ffffff'
  },
  label: {
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#0f172a',
    display: 'block',
    marginBottom: '10px'
  },
  tabContainer: {
    display: 'flex',
    gap: '12px',
    borderBottom: '1px solid #cbd5e1',
    marginBottom: '12px'
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    padding: '8px 12px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer'
  },
  canvasWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  canvas: {
    width: '100%',
    height: '160px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    backgroundColor: '#fff',
    touchAction: 'none'
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: '10px'
  },
  clearBtn: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  applyBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '13px'
  },
  uploadWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    border: '1px dashed #cbd5e1',
    borderRadius: '6px',
    backgroundColor: '#f8fafc'
  },
  fileInput: {
    fontSize: '13px'
  },
  previewBox: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '6px'
  },
  previewImg: {
    maxHeight: '60px',
    borderBottom: '1px solid #cbd5e1',
    marginTop: '4px'
  }
};