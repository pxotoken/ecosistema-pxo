import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  FileText,
  CheckCircle,
  AlertTriangle,
  Save,
  Loader2,
  Landmark,
} from 'lucide-react';
import { FileUpload } from './FileUpload';
import { KYCStatusBadge } from './KYCStatusBadge';
import { useKYC, normalizeCountryToIso2 } from '../../hooks/useKYC';
import { useAuthContext } from '../../contexts/AuthContext';
import { KYCStatus } from '@pxo/shared/types';
import { Toast } from '../common/Toast';
import { useToast } from '../../hooks/useToast';
import api, { getApiError } from '../../lib/api';

const COUNTRY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'MX', label: 'Mexico' },
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'ES', label: 'Spain' },
  { code: 'AR', label: 'Argentina' },
  { code: 'CL', label: 'Chile' },
  { code: 'CO', label: 'Colombia' },
  { code: 'PE', label: 'Peru' },
  { code: 'BR', label: 'Brazil' },
];

interface KYCFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string; // ISO-2
  dateOfBirth: string; // YYYY-MM-DD
  documentType: 'dni' | 'passport';
  documentNumber: string;
  frontDocument: File | null;
  backDocument: File | null;
  passport: File | null;
}

type KYCFormErrors = Partial<Record<keyof KYCFormData, string>>;

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
        formErrors[field]
          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
          : 'border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base'
      }`}
      placeholder={placeholder}
    />
    {formErrors[field] && (
      <p className="text-sm text-red-500 mt-1">{formErrors[field]}</p>
    )}
  </div>
);

export const KYCSettings: React.FC = () => {
  const { user, updateUser, refreshUserProfile } = useAuthContext();
  const { submitKyc, getKycStatus, loading, error, clearError } = useKYC();
  const { toast, showToast, hideToast } = useToast();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const isFormDisabled = user?.KYC_status === KYCStatus.VALIDATING;

  const [formData, setFormData] = useState<KYCFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'MX',
    dateOfBirth: '',
    documentType: 'dni',
    documentNumber: '',
    frontDocument: null,
    backDocument: null,
    passport: null,
  });

  const [existingDocs, setExistingDocs] = useState<{
    front:    { url: string; path: string } | null;
    back:     { url: string; path: string } | null;
    passport: { url: string; path: string } | null;
  }>({ front: null, back: null, passport: null });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formErrors, setFormErrors] = useState<KYCFormErrors>({});

  // CLABE registration — independent from the KYC form; PATCHes api-users/me.
  const [clabeInput, setClabeInput] = useState('');
  const [clabeError, setClabeError] = useState<string | null>(null);
  const [clabeSaving, setClabeSaving] = useState(false);
  const savedClabe = user?.CLABE ?? null;
  const clabeChanged = clabeInput !== '' && clabeInput !== (savedClabe ?? '');
  const clabeInputValid = /^\d{18}$/.test(clabeInput);

  const toDateInputValue = (raw: string | undefined): string => {
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getUTCFullYear();
    const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd   = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setIsLoadingProfile(false);
        return;
      }
      setIsLoadingProfile(true);
      try {
        await refreshUserProfile();
        const { submission } = await getKycStatus();
        if (submission) {
          const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string ?? '').replace(/\/$/, '');
          const toPublicUrl = (path: string) =>
            `${supabaseUrl}/storage/v1/object/public/pxos-files/${path}`;

          if (submission.personal_info) {
            const info = submission.personal_info;
            const [firstName, ...rest] = (info.fullName || '').trim().split(' ');
            const lastName = rest.join(' ');
            setFormData((prev) => ({
              ...prev,
              firstName: firstName || prev.firstName,
              lastName: lastName || prev.lastName,
              email: info.email || prev.email,
              phone: info.phone || prev.phone,
              country: info.country || prev.country,
              documentType: info.documentType === 'passport' ? 'passport' : 'dni',
              dateOfBirth: toDateInputValue(info.dateOfBirth) || prev.dateOfBirth,
              documentNumber: info.documentNumber || prev.documentNumber,
            }));
          }

          if (submission.documents?.length) {
            const front    = submission.documents.find((d: { type: string }) => d.type === 'id_front');
            const back     = submission.documents.find((d: { type: string }) => d.type === 'id_back');
            const passport = submission.documents.find((d: { type: string }) => d.type === 'passport');
            setExistingDocs({
              front:    front    ? { url: toPublicUrl(front.path),    path: front.path    } : null,
              back:     back     ? { url: toPublicUrl(back.path),     path: back.path     } : null,
              passport: passport ? { url: toPublicUrl(passport.path), path: passport.path } : null,
            });
          }
        }
      } catch (err) {
        console.error('Error loading KYC data:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: prev.email || user.mail || '',
        phone: prev.phone || user.phone || '',
        country: prev.country || normalizeCountryToIso2(user.country) || 'MX',
      }));
    }
  }, [user]);

  useEffect(() => {
    // Seed the CLABE input with whatever's currently registered so the field
    // shows the existing value without immediately looking "dirty".
    if (user?.CLABE) setClabeInput(user.CLABE);
  }, [user?.CLABE]);

  const handleSaveClabe = async () => {
    if (!clabeInputValid) {
      setClabeError('CLABE must be exactly 18 digits');
      return;
    }
    setClabeError(null);
    setClabeSaving(true);
    try {
      const { data } = await api.patch('/api/users/me', { CLABE: clabeInput });
      if (updateUser && data?.user) {
        updateUser({ ...user!, CLABE: data.user.CLABE });
      }
      showToast('CLABE saved successfully', 'success');
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { status?: number } }).response?.status === 409
      ) {
        setClabeError(
          'This CLABE cannot be registered. Please contact support if you believe this is an error.',
        );
      } else {
        setClabeError(getApiError(err, 'Failed to save CLABE'));
      }
    } finally {
      setClabeSaving(false);
    }
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ''));
  const validateDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));

  const hasRequiredDocuments = (): boolean => {
    if (formData.documentType === 'dni') {
      return Boolean((formData.frontDocument || existingDocs.front) && (formData.backDocument || existingDocs.back));
    }
    return Boolean(formData.passport || existingDocs.passport);
  };

  const validateForm = (): boolean => {
    const errors: KYCFormErrors = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!validateEmail(formData.email)) errors.email = 'Please enter a valid email';
    if (!formData.phone.trim()) errors.phone = 'Phone is required';
    else if (!validatePhone(formData.phone)) errors.phone = 'Please enter a valid phone number';
    if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    else if (!validateDate(formData.dateOfBirth)) errors.dateOfBirth = 'Invalid date format';
    if (!formData.documentNumber.trim()) errors.documentNumber = 'Document number is required';
    else if (formData.documentNumber.trim().length < 3) errors.documentNumber = 'Min 3 characters';
    if (!formData.country) errors.country = 'Country is required';

    if (formData.documentType === 'dni') {
      if (!formData.frontDocument && !existingDocs.front) errors.frontDocument = 'Front ID photo is required';
      if (!formData.backDocument && !existingDocs.back) errors.backDocument = 'Back ID photo is required';
    } else if (formData.documentType === 'passport') {
      if (!formData.passport && !existingDocs.passport) errors.passport = 'Passport photo is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isFormValid = (): boolean =>
    Boolean(
      formData.firstName.trim() &&
        formData.lastName.trim() &&
        formData.email.trim() &&
        validateEmail(formData.email) &&
        formData.phone.trim() &&
        validatePhone(formData.phone) &&
        formData.dateOfBirth &&
        validateDate(formData.dateOfBirth) &&
        formData.documentNumber.trim().length >= 3 &&
        formData.country &&
        hasRequiredDocuments() &&
        acceptedTerms &&
        acceptedDisclaimer,
    );

  const handleInputChange = (field: keyof KYCFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: undefined });
    }
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      showToast('User not authenticated', 'error');
      return;
    }

    if (user.KYC_status === KYCStatus.VALIDATING || user.KYC_status === KYCStatus.VALIDATED) {
      setShowConfirmDialog(true);
      return;
    }

    await submitForm();
  };

  const submitForm = async () => {
    if (!validateForm() || !user?.id) return;

    try {
      await submitKyc({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        dateOfBirth: formData.dateOfBirth,
        documentType: formData.documentType,
        documentNumber: formData.documentNumber,
        frontDocument:        formData.frontDocument  ?? undefined,
        backDocument:         formData.backDocument   ?? undefined,
        passport:             formData.passport       ?? undefined,
        existingFrontPath:    !formData.frontDocument  ? (existingDocs.front?.path   ?? undefined) : undefined,
        existingBackPath:     !formData.backDocument   ? (existingDocs.back?.path    ?? undefined) : undefined,
        existingPassportPath: !formData.passport       ? (existingDocs.passport?.path ?? undefined) : undefined,
      });

      showToast('KYC submitted successfully. Your information is being validated.', 'success');

      // El microservicio ya actualiza users.KYC_status → refrescamos el perfil.
      if (updateUser && user) {
        updateUser({ ...user, KYC_status: KYCStatus.VALIDATING });
      }
    } catch (err) {
      console.error('Error submitting KYC:', err);
      showToast(getApiError(err, 'Error submitting KYC. Please try again.'), 'error');
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

      <AnimatePresence>
        {user.KYC_status === KYCStatus.VALIDATING && <ValidationWarning />}
        {user.KYC_status === KYCStatus.VALIDATED && <ValidationSuccess />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-light-surface dark:bg-dark-surface rounded-xl p-6 border border-light-border dark:border-dark-border"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal information */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Date of Birth"
                field="dateOfBirth"
                type="date"
                formData={formData}
                formErrors={formErrors}
                isFormDisabled={isFormDisabled}
                onChange={handleInputChange('dateOfBirth')}
              />
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  Country *
                </label>
                <select
                  value={formData.country}
                  onChange={handleInputChange('country')}
                  disabled={isFormDisabled}
                  className={`w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-pxo-primary focus:border-transparent transition-colors bg-light-base dark:bg-dark-base ${
                    isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Identity verification */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Identity Verification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  Document Type *
                </label>
                <select
                  value={formData.documentType}
                  onChange={handleInputChange('documentType')}
                  disabled={isFormDisabled}
                  className={`w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-pxo-primary focus:border-transparent transition-colors bg-light-base dark:bg-dark-base ${
                    isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="dni">ID Card / INE</option>
                  <option value="passport">Passport</option>
                </select>
              </div>
              <FormInput
                label="Document Number"
                field="documentNumber"
                placeholder="e.g. 12345678"
                formData={formData}
                formErrors={formErrors}
                isFormDisabled={isFormDisabled}
                onChange={handleInputChange('documentNumber')}
              />
            </div>

            {formData.documentType === 'dni' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUpload
                  label="Front ID Photo *"
                  required
                  value={formData.frontDocument}
                  onChange={(file) => {
                    setFormData({ ...formData, frontDocument: file });
                    if (!file) setExistingDocs((prev) => ({ ...prev, front: null }));
                  }}
                  error={formErrors.frontDocument}
                  disabled={isFormDisabled}
                  existingImageUrl={existingDocs.front?.url ?? null}
                />
                <FileUpload
                  label="Back ID Photo *"
                  required
                  value={formData.backDocument}
                  onChange={(file) => {
                    setFormData({ ...formData, backDocument: file });
                    if (!file) setExistingDocs((prev) => ({ ...prev, back: null }));
                  }}
                  error={formErrors.backDocument}
                  disabled={isFormDisabled}
                  existingImageUrl={existingDocs.back?.url ?? null}
                />
              </div>
            ) : (
              <FileUpload
                label="Passport Photo *"
                required
                value={formData.passport}
                onChange={(file) => {
                  setFormData({ ...formData, passport: file });
                  if (!file) setExistingDocs((prev) => ({ ...prev, passport: null }));
                }}
                error={formErrors.passport}
                disabled={isFormDisabled}
                existingImageUrl={existingDocs.passport?.url ?? null}
              />
            )}
          </div>

          {/* Terms */}
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

      {/* Bank Account — independent from the KYC form; PATCHes api-users/me. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-light-surface dark:bg-dark-surface rounded-xl p-6 border border-light-border dark:border-dark-border"
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            Bank Account (SPEI)
          </h3>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Register your CLABE (18-digit bank account) to enable MXN deposits via SPEI. All
            SPEI deposits used to buy PXO must originate from this account.
          </p>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
              CLABE *
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={clabeInput}
              onChange={(e) => {
                setClabeInput(e.target.value.replace(/\D/g, '').slice(0, 18));
                if (clabeError) setClabeError(null);
              }}
              maxLength={18}
              placeholder="18 digits, no spaces"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pxo-primary focus:border-transparent transition-colors font-mono tracking-wider ${
                clabeError
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base'
              }`}
            />
            {savedClabe && !clabeChanged && (
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                Currently registered: ****{savedClabe.slice(-4)}
              </p>
            )}
            {clabeError && (
              <p className="text-sm text-red-500 mt-1">{clabeError}</p>
            )}
          </div>

          <motion.button
            type="button"
            onClick={handleSaveClabe}
            disabled={!clabeInputValid || !clabeChanged || clabeSaving}
            whileHover={{ scale: clabeInputValid && clabeChanged && !clabeSaving ? 1.02 : 1 }}
            whileTap={{ scale: clabeInputValid && clabeChanged && !clabeSaving ? 0.98 : 1 }}
            className={`py-2.5 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              clabeInputValid && clabeChanged && !clabeSaving
                ? 'bg-pxo-primary text-white hover:bg-pxo-primary/90'
                : 'bg-light-text-secondary/20 dark:bg-dark-text-secondary/20 text-light-text-secondary dark:text-dark-text-secondary cursor-not-allowed'
            }`}
          >
            {clabeSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{savedClabe ? 'Update CLABE' : 'Save CLABE'}</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

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
                  : 'Your KYC is currently under validation. Modifying your data at this time could cause delays in the process. Do you want to continue?'}
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

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};
