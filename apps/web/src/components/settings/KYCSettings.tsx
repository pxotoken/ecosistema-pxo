import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Upload,
  Save,
  Loader2
} from 'lucide-react';
import { FileUpload } from './FileUpload';
import { KYCStatusBadge } from './KYCStatusBadge';
import { useKYC } from '../../hooks/useKYC';
import { useAuthContext } from '../../contexts/AuthContext';
import { KYCStatus } from '@pxo/shared/types';
import { Toast } from '../common/Toast';
import { useToast } from '../../hooks/useToast';

interface KYCFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  documentType: "dni" | "passport";
  frontDocument: File | null;
  backDocument: File | null;
  passport: File | null;
}

interface KYCFormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  documentType?: string;
  frontDocument?: string;
  backDocument?: string;
  passport?: string;
}

const ValidationWarning = () => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg"
  >
    <div className="flex items-start">
      <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          Your KYC is under validation
        </p>
        <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
          You will not be able to edit your information until your request is approved or rejected by our team.
        </p>
      </div>
    </div>
  </motion.div>
);

const ValidationSuccess = () => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4 mb-6 rounded-r-lg"
  >
    <div className="flex items-start">
      <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          Your KYC has been successfully validated
        </p>
        <p className="mt-1 text-sm text-green-700 dark:text-green-300">
          If you modify your data, you will need to go through the KYC validation process again.
        </p>
      </div>
    </div>
  </motion.div>
);

interface FormInputProps {
  label: string;
  field: keyof KYCFormData;
  type?: string;
  placeholder?: string;
  formData: KYCFormData;
  formErrors: KYCFormErrors;
  isFormDisabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FormInput = ({
  label,
  field,
  type = 'text',
  placeholder,
  formData,
  formErrors,
  isFormDisabled,
  onChange,
}: FormInputProps) => (
  <div>
    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
      {label} *
    </label>
    <input
      type={type}
      value={formData[field] as string}
      onChange={onChange}
      disabled={isFormDisabled}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pxo-primary focus:border-transparent transition-colors ${
        isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        formErrors[field as keyof KYCFormErrors]
          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
          : 'border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base'
      }`}
      placeholder={placeholder}
    />
    {formErrors[field as keyof KYCFormErrors] && (
      <p className="text-sm text-red-500 mt-1">{formErrors[field as keyof KYCFormErrors]}</p>
    )}
  </div>
);

export const KYCSettings: React.FC = () => {
  const { user, updateUser, refreshUserProfile } = useAuthContext();
  const { submitKYCData, loading, error, clearError } = useKYC();
  const { toast, showToast, hideToast } = useToast();
  
  // State for profile loading
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // Disable form when KYC is validating
  const isFormDisabled = user?.KYC_status === KYCStatus.VALIDATING;
  
  const [formData, setFormData] = useState<KYCFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'Mexico',
    documentType: 'dni',
    frontDocument: null,
    backDocument: null,
    passport: null,
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formErrors, setFormErrors] = useState<KYCFormErrors>({});

  // Refresh user data when component mounts to get latest KYC status
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setIsLoadingProfile(false);
        return;
      }
      
      setIsLoadingProfile(true);
      try {
        await refreshUserProfile();
      } catch (error) {
        console.error('Error refreshing profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.mail || '',
        phone: user.phone || '',
        country: user.country || 'Mexico',
        documentType: user.legal_identification === 'passport' ? 'passport' : 'dni',
        frontDocument: null,
        backDocument: null,
        passport: null,
      });
    }
  }, [user]);

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const hasRequiredDocuments = (): boolean => {
    if (formData.documentType === 'dni') {
      const hasFrontImage = formData.frontDocument || user?.identification_photos?.[0];
      const hasBackImage = formData.backDocument || user?.identification_photos?.[1];
      return !!(hasFrontImage && hasBackImage);
    } else {
      const hasPassportImage = formData.passport || user?.passport;
      return !!hasPassportImage;
    }
  };

  const validateForm = (): boolean => {
    const errors: KYCFormErrors = {};

    // Validate required fields
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.phone.trim()) errors.phone = 'Phone is required';

    // Validate email format
    if (formData.email && !validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    // Validate phone format
    if (formData.phone && !validatePhone(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    // Validate documents - allow existing images
    if (formData.documentType === 'dni') {
      const hasFrontImage = formData.frontDocument || user?.identification_photos?.[0];
      const hasBackImage = formData.backDocument || user?.identification_photos?.[1];
      if (!hasFrontImage) errors.frontDocument = 'Front ID photo is required';
      if (!hasBackImage) errors.backDocument = 'Back ID photo is required';
    } else if (formData.documentType === 'passport') {
      const hasPassportImage = formData.passport || user?.passport;
      if (!hasPassportImage) errors.passport = 'Passport photo is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isFormValid = (): boolean => {
    const hasRequiredFields = formData.firstName.trim() && 
                             formData.lastName.trim() && 
                             formData.email.trim() && 
                             formData.phone.trim();
    
    const isEmailValid = validateEmail(formData.email);
    const isPhoneValid = validatePhone(formData.phone);

    return Boolean(
      hasRequiredFields && 
      isEmailValid && 
      isPhoneValid && 
      hasRequiredDocuments() && 
      acceptedTerms && 
      acceptedDisclaimer
    );
  };

  const handleInputChange = (field: keyof KYCFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
    // Clear field error when user types
    if (formErrors[field as keyof KYCFormErrors]) {
      setFormErrors({ ...formErrors, [field as keyof KYCFormErrors]: undefined });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      showToast('User not authenticated', 'error');
      return;
    }

    // Show confirmation dialog if KYC is already validated or validating
    if (user.KYC_status === KYCStatus.VALIDATING || user.KYC_status === KYCStatus.VALIDATED) {
      setShowConfirmDialog(true);
      return;
    }

    await submitForm();
  };

  const submitForm = async () => {
    if (!validateForm() || !user?.id) return;

    try {
      const kycData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        legal_identification_type: formData.documentType,
        ...(formData.documentType === 'passport' 
          ? { 
              passport: formData.passport || undefined,
              // Send existing URL if no new file
              existingPassport: !formData.passport && user?.passport ? user.passport : undefined
            }
          : { 
              // Send new files with position info
              frontDocument: formData.frontDocument || undefined,
              backDocument: formData.backDocument || undefined,
              // Send existing URLs if no new files at that position
              existingFrontPhoto: !formData.frontDocument && user?.identification_photos?.[0] ? user.identification_photos[0] : undefined,
              existingBackPhoto: !formData.backDocument && user?.identification_photos?.[1] ? user.identification_photos[1] : undefined
            }
        )
      };

      const updatedUserData = await submitKYCData(user.id, kycData);
      
      // Show success notification
      showToast('KYC submitted successfully. Your information is being validated.', 'success');
      
      // Update user data with backend response
      if (updatedUserData) {
        updateUser(updatedUserData);
      }
      
    } catch (error) {
      console.error('Error submitting KYC:', error);
      showToast('Error submitting KYC. Please try again.', 'error');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto mb-4 text-light-text-secondary dark:text-dark-text-secondary" />
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Log in to access KYC settings
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while fetching profile
  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-pxo-primary animate-spin" />
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Loading profile information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text font-editorial">
            KYC Configuration
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">
            Verify your identity to access all features
          </p>
        </div>
        <KYCStatusBadge status={user.KYC_status || 'PENDING'} />
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {user.KYC_status === KYCStatus.VALIDATING && <ValidationWarning />}
        {user.KYC_status === KYCStatus.VALIDATED && <ValidationSuccess />}
      </AnimatePresence>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-light-surface dark:bg-dark-surface rounded-xl p-6 border border-light-border dark:border-dark-border"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="First Name"
                field="firstName"
                placeholder="Enter your first name"
                formData={formData}
                formErrors={formErrors}
                isFormDisabled={isFormDisabled}
                onChange={handleInputChange('firstName')}
              />
              <FormInput
                label="Last Name"
                field="lastName"
                placeholder="Enter your last name"
                formData={formData}
                formErrors={formErrors}
                isFormDisabled={isFormDisabled}
                onChange={handleInputChange('lastName')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Email"
                field="email"
                type="email"
                placeholder="email@example.com"
                formData={formData}
                formErrors={formErrors}
                isFormDisabled={isFormDisabled}
                onChange={handleInputChange('email')}
              />
              <FormInput
                label="Phone"
                field="phone"
                type="tel"
                placeholder="+52 (123) 456-7890"
                formData={formData}
                formErrors={formErrors}
                isFormDisabled={isFormDisabled}
                onChange={handleInputChange('phone')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                Country
              </label>
              <select
                value={formData.country}
                onChange={handleInputChange('country')}
                disabled={isFormDisabled}
                className={`w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-pxo-primary focus:border-transparent transition-colors bg-light-base dark:bg-dark-base ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="Mexico">Mexico</option>
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="Spain">Spain</option>
                <option value="Argentina">Argentina</option>
                <option value="Chile">Chile</option>
                <option value="Colombia">Colombia</option>
                <option value="Peru">Peru</option>
                <option value="Brazil">Brazil</option>
              </select>
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Identity Verification
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                Document Type *
              </label>
              <select
                value={formData.documentType}
                onChange={handleInputChange('documentType')}
                disabled={isFormDisabled}
                className={`w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-pxo-primary focus:border-transparent transition-colors bg-light-base dark:bg-dark-base ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="dni">ID Card / INE</option>
                <option value="passport">Passport</option>
              </select>
            </div>

            {formData.documentType === 'dni' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUpload
                  label="Front ID Photo *"
                  required
                  value={formData.frontDocument}
                  onChange={(file) => setFormData({ ...formData, frontDocument: file })}
                  error={formErrors.frontDocument}
                  disabled={isFormDisabled}
                  existingImageUrl={user?.identification_photos?.[0] || null}
                />
                <FileUpload
                  label="Back ID Photo *"
                  required
                  value={formData.backDocument}
                  onChange={(file) => setFormData({ ...formData, backDocument: file })}
                  error={formErrors.backDocument}
                  disabled={isFormDisabled}
                  existingImageUrl={user?.identification_photos?.[1] || null}
                />
              </div>
            ) : (
              <FileUpload
                label="Passport Photo *"
                required
                value={formData.passport}
                onChange={(file) => setFormData({ ...formData, passport: file })}
                error={formErrors.passport}
                disabled={isFormDisabled}
                existingImageUrl={user?.passport || null}
              />
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
              Terms and Conditions
            </h3>
            
            <div className="space-y-3">
              <label className={`flex items-start space-x-3 ${isFormDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={isFormDisabled ? true : acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  disabled={isFormDisabled}
                  className="mt-1 w-4 h-4 text-pxo-primary border-light-border dark:border-dark-border rounded focus:ring-pxo-primary"
                />
                <div className="text-sm text-light-text dark:text-dark-text">
                  <span className="font-medium">I accept the terms and conditions *</span>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
                    I have read and accept the platform's terms and conditions of use.
                  </p>
                </div>
              </label>

              <label className={`flex items-start space-x-3 ${isFormDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={isFormDisabled ? true : acceptedDisclaimer}
                  onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
                  disabled={isFormDisabled}
                  className="mt-1 w-4 h-4 text-pxo-primary border-light-border dark:border-dark-border rounded focus:ring-pxo-primary"
                />
                <div className="text-sm text-light-text dark:text-dark-text">
                  <span className="font-medium">I accept the disclaimer *</span>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
                    I understand and accept the risks associated with investments on the platform.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={!isFormValid() || loading || isFormDisabled}
            whileHover={{ scale: isFormValid() && !loading && !isFormDisabled ? 1.02 : 1 }}
            whileTap={{ scale: isFormValid() && !loading && !isFormDisabled ? 0.98 : 1 }}
            className={`
              w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2
              ${isFormValid() && !loading && !isFormDisabled
                ? 'bg-pxo-primary text-white hover:bg-pxo-primary/90 shadow-lg hover:shadow-xl'
                : 'bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 text-light-text-secondary dark:text-dark-text-secondary cursor-not-allowed'
              }
            `}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Submit KYC</span>
              </>
            )}
          </motion.button>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}
        </form>
      </motion.div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-light-surface dark:bg-dark-surface rounded-xl p-6 max-w-md w-full border border-light-border dark:border-dark-border"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
                Are you sure?
              </h3>
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6">
                {user.KYC_status === KYCStatus.VALIDATED 
                  ? 'Your KYC is currently validated. If you modify your data, you will need to go through the KYC validation process again. Do you want to continue?'
                  : 'Your KYC is currently under validation. Modifying your data at this time could cause delays in the process. Do you want to continue?'
                }
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 py-2 px-4 border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text hover:bg-light-glass dark:hover:bg-dark-glass transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    submitForm();
                  }}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};
