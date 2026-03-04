import React from 'react';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const DriverDocumentUploadStep = ({ documentFiles, setDocumentFiles, documentErrors, setDocumentErrors }) => {

    const validateFile = (file) => {
        if (!file) return 'File is required';
        if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPEG, PNG, and PDF files are allowed';
        if (file.size > MAX_SIZE) return 'File size must be less than 5MB';
        return null;
    };

    const handleFileChange = (fieldName, file) => {
        const error = validateFile(file);
        setDocumentErrors(prev => ({ ...prev, [fieldName]: error }));
        if (!error) {
            setDocumentFiles(prev => ({ ...prev, [fieldName]: file }));
        } else {
            setDocumentFiles(prev => {
                const copy = { ...prev };
                delete copy[fieldName];
                return copy;
            });
        }
    };

    const getPreview = (fieldName) => {
        const file = documentFiles[fieldName];
        if (!file) return null;
        if (file.type === 'application/pdf') {
            return <span className="file-preview-name">{file.name} (PDF)</span>;
        }
        return <img src={URL.createObjectURL(file)} alt="Preview" className="file-preview-img" />;
    };

    return (
        <div className="documents-section">
            <h3 className="form-section-title">Upload Verification Documents</h3>
            <p className="help-text" style={{ marginBottom: '1rem' }}>
                Upload your PAN Card and Driving License for verification.
                Accepted formats: JPEG, PNG, PDF (max 5MB each).
            </p>

            {/* PAN Card */}
            <div className="form-group">
                <label className="input-label" htmlFor="pan_card">PAN Card *</label>
                <input
                    className="input-field"
                    type="file"
                    id="pan_card"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange('pan_card', e.target.files[0])}
                />
                {documentFiles.pan_card && <div className="file-preview">{getPreview('pan_card')}</div>}
                {documentErrors.pan_card && <span className="error-message">{documentErrors.pan_card}</span>}
            </div>

            {/* Driving License */}
            <div className="form-group">
                <label className="input-label" htmlFor="driving_license">Driving License *</label>
                <input
                    className="input-field"
                    type="file"
                    id="driving_license"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange('driving_license', e.target.files[0])}
                />
                {documentFiles.driving_license && <div className="file-preview">{getPreview('driving_license')}</div>}
                {documentErrors.driving_license && <span className="error-message">{documentErrors.driving_license}</span>}
            </div>
        </div>
    );
};

export default DriverDocumentUploadStep;
