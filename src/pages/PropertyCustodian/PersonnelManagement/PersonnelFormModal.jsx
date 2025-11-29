import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import Swal from "sweetalert2";
import Portal from "../../../components/Portal/Portal";
import { showAlert } from "../../../services/notificationService";

const DEFAULT_FORM = {
  first_name: "",
  last_name: "",
  employee_id: "",
  id_number: "",
  username: "",
  phone: "",
  employment_status: "",
  employment_level: "",
  position: "",
  subject_area: "",
  rating: "",
  notes: "",
  password: "",
  password_confirmation: "",
  is_active: true,
};

const fieldLabels = {
  first_name: "First Name",
  last_name: "Last Name",
  employee_id: "Employee Number",
  id_number: "ID Number",
  username: "Username",
  phone: "Contact Number",
  employment_status: "Employment Status",
  employment_level: "Employment Level",
  password: "Portal Password",
  password_confirmation: "Confirm Password",
};

const formatContactPhone = (value = "") => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
};

const PersonnelFormModal = ({
  token,
  personnel,
  existingPersonnel = [],
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const isEdit = Boolean(personnel);

  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const initialStateRef = useRef(DEFAULT_FORM);

  const duplicateMap = useMemo(() => {
    const map = {
      employee_id: new Map(),
      id_number: new Map(),
      username: new Map(),
    };

    existingPersonnel.forEach((entry) => {
      if (entry.employee_id) {
        map.employee_id.set(entry.employee_id, entry.id);
      }
      if (entry.id_number) {
        map.id_number.set(entry.id_number, entry.id);
      }
      if (entry.username) {
        map.username.set(entry.username, entry.id);
      }
    });

    return map;
  }, [existingPersonnel]);

  const computeHasChanges = useCallback(
    (currentForm, currentAvatarFile, currentAvatarRemoved) => {
      if (
        JSON.stringify(currentForm) !== JSON.stringify(initialStateRef.current)
      ) {
        return true;
      }
      if (currentAvatarFile) return true;
      if (currentAvatarRemoved) return true;
      return false;
    },
    []
  );

  const resolveAvatarUrl = useCallback((entity) => {
    if (!entity?.avatar_path) return "";
    const baseUrl = import.meta.env.VITE_LARAVEL_API;
    let cleanFilename = entity.avatar_path;
    if (cleanFilename.includes("personnel-avatars/")) {
      cleanFilename = cleanFilename.replace("personnel-avatars/", "");
    }
    cleanFilename = cleanFilename.split("/").pop();
    return `${baseUrl}/personnel-avatar/${cleanFilename}`;
  }, []);

  const updateAvatarPreview = useCallback((source, isFile = false) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (isFile && source) {
      const objectUrl = URL.createObjectURL(source);
      previewUrlRef.current = objectUrl;
      setAvatarPreview(objectUrl);
    } else {
      setAvatarPreview(source || "");
    }
  }, []);

  useEffect(() => {
    if (personnel) {
      const formattedPhone = personnel.phone
        ? formatContactPhone(personnel.phone)
        : "";
      const payload = {
        ...DEFAULT_FORM,
        ...personnel,
        phone: formattedPhone,
        password: "",
        password_confirmation: "",
      };
      setFormData(payload);
      initialStateRef.current = payload;
      setHasUnsavedChanges(false);
      setErrors({});
      const existingAvatar = resolveAvatarUrl(personnel);
      setAvatarFile(null);
      setAvatarRemoved(false);
      updateAvatarPreview(existingAvatar || "");
    } else {
      setFormData(DEFAULT_FORM);
      initialStateRef.current = DEFAULT_FORM;
      setHasUnsavedChanges(false);
      setErrors({});
      setAvatarFile(null);
      setAvatarRemoved(false);
      updateAvatarPreview("");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [personnel, resolveAvatarUrl, updateAvatarPreview]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const validators = useMemo(() => {
    return {
      first_name: (value) => (value.trim() ? "" : "First name is required"),
      last_name: (value) => (value.trim() ? "" : "Last name is required"),
      employee_id: (value) => {
        if (!value.trim()) return "Employee number is required";
        const existingId = duplicateMap.employee_id.get(value.trim());
        if (existingId && existingId !== personnel?.id) {
          return "Employee number already exists";
        }
        return "";
      },
      id_number: (value) => {
        if (!value.trim()) return "ID number is required";
        const existingId = duplicateMap.id_number.get(value.trim());
        if (existingId && existingId !== personnel?.id) {
          return "ID number already exists";
        }
        return "";
      },
      username: (value) => {
        if (!value.trim()) return "Username is required";
        if (!/^[A-Za-z0-9._-]+$/.test(value.trim())) {
          return "Username may only contain letters, numbers, dots, underscores, and hyphens";
        }
        const existingId = duplicateMap.username.get(value.trim());
        if (existingId && existingId !== personnel?.id) {
          return "Username already exists";
        }
        return "";
      },
      phone: (value) => {
        if (!value) return "";
        const digits = value.replace(/\D/g, "");
        if (digits.length !== 0 && digits.length !== 11) {
          return "Contact number must be exactly 11 digits";
        }
        return "";
      },
      employment_status: (value) =>
        value.trim() ? "" : "Employment status is required",
      employment_level: (value) =>
        value.trim() ? "" : "Employment level is required",
      password: (value) => {
        if (!isEdit && !value) return "Portal password is required";
        if (value && value.length < 6) {
          return "Password must be at least 6 characters";
        }
        return "";
      },
      password_confirmation: (value) => {
        if (!isEdit && !value) return "Please confirm the password";
        if (formData.password && value !== formData.password) {
          return "Passwords do not match";
        }
        return "";
      },
    };
  }, [duplicateMap, formData.password, personnel?.id, isEdit]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    Object.entries(validators).forEach(([field, validator]) => {
      const message = validator(formData[field] || "");
      if (message && message.trim()) {
        newErrors[field] = message;
      }
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return { isValid: false, errors: newErrors };
    }
    return { isValid: true, errors: {} };
  }, [formData, validators]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let nextValue = type === "checkbox" ? checked : value;

    if (name === "phone") {
      nextValue = formatContactPhone(nextValue);
    }

    setFormData((prev) => {
      const updated = { ...prev, [name]: nextValue };
      setHasUnsavedChanges(
        computeHasChanges(updated, avatarFile, avatarRemoved)
      );
      return updated;
    });

    if (validators[name]) {
      const errorMessage = validators[name](nextValue);
      setErrors((prev) => ({ ...prev, [name]: errorMessage }));
    } else if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        avatar: "Only image files (PNG, JPG, GIF, SVG, WebP) are allowed",
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        avatar: "Please upload an image no larger than 2MB",
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setErrors((prev) => ({ ...prev, avatar: "" }));
    setAvatarRemoved(false);
    setAvatarFile(file);
    setHasUnsavedChanges(computeHasChanges(formData, file, false));
    updateAvatarPreview(file, true);
  };

  const handleAvatarClear = () => {
    setAvatarFile(null);
    setAvatarRemoved(true);
    setHasUnsavedChanges(computeHasChanges(formData, null, true));
    updateAvatarPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setErrors((prev) => ({ ...prev, avatar: "" }));
  };

  const buildPayload = () => {
    const payload = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (key === "avatar_url") {
        return;
      }
      // For edit mode, don't overwrite existing password if user leaves it blank
      if (
        isEdit &&
        (key === "password" || key === "password_confirmation") &&
        !value
      ) {
        return;
      }
      if (key === "is_active") {
        payload.append(key, value ? "1" : "0");
        return;
      }
      if (key === "phone") {
        payload.append(key, (value || "").replace(/\D/g, ""));
      } else {
        payload.append(key, value ?? "");
      }
    });

    if (avatarFile) {
      payload.append("avatar", avatarFile);
    }

    if (avatarRemoved && !avatarFile) {
      payload.append("remove_avatar", "1");
    }

    if (isEdit) {
      payload.append("_method", "PUT");
    }

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationResult = validateForm();

    if (!validationResult.isValid) {
      const errorList = Object.entries(validationResult.errors)
        .map(([field, message]) => {
          if (!message) return null;
          const fieldLabel = fieldLabels[field] || field;
          return `<li style="margin-bottom: 8px;"><strong>${fieldLabel}:</strong> ${message}</li>`;
        })
        .filter(Boolean)
        .join("");

      Swal.fire({
        title: "Validation Error",
        html: `
          <div style="text-align: left; color: #0E254B;">
            <p style="margin-bottom: 15px;">Please fix the following errors before submitting:</p>
            <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
              ${errorList}
            </ul>
          </div>
        `,
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#0E254B",
        background: "#fff",
        color: "#0E254B",
        iconColor: "#dc3545",
        width: "500px",
      });

      const formElement = document.querySelector(".modal-body");
      if (formElement) {
        formElement.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    const confirmation = await showAlert.confirm(
      isEdit ? "Update Personnel?" : "Register Personnel?",
      isEdit
        ? `Are you sure you want to update "${formData.first_name} ${formData.last_name}"? This will save all the changes you've made.`
        : `Are you sure you want to register "${formData.first_name} ${formData.last_name}"? Please verify all information is correct before proceeding.`,
      isEdit ? "Update Personnel" : "Register Personnel",
      "Cancel"
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      showAlert.loading(
        isEdit ? "Updating Personnel" : "Registering Personnel",
        "Please wait while we save the personnel information..."
      );

      const apiBase =
        import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
      const url = isEdit
        ? `${apiBase.replace(/\/$/, "")}/property-custodian/personnel/${
            personnel.id
          }`
        : `${apiBase.replace(/\/$/, "")}/property-custodian/personnel`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: buildPayload(),
      });

      const data = await response.json();
      showAlert.close();

      if (response.ok) {
        showAlert.success(
          isEdit ? "Personnel Updated" : "Personnel Registered",
          isEdit
            ? "Personnel information has been updated successfully."
            : "Personnel has been registered successfully."
        );

        if (onSave) {
          onSave(data);
        }

        initialStateRef.current = {
          ...formData,
          ...data,
          phone: formatContactPhone(data.phone || ""),
          password: "",
          password_confirmation: "",
        };
        setHasUnsavedChanges(false);
        setAvatarFile(null);
        setAvatarRemoved(false);
        updateAvatarPreview(resolveAvatarUrl(data) || "");
      } else {
        if (data.errors) {
          const backendErrors = {};
          Object.keys(data.errors).forEach((key) => {
            backendErrors[key] = Array.isArray(data.errors[key])
              ? data.errors[key][0]
              : data.errors[key];
          });
          setErrors((prev) => ({ ...prev, ...backendErrors }));
        }

        const errorMessage =
          data.message || "Failed to save personnel information";
        showAlert.error("Error", errorMessage);
      }
    } catch (error) {
      showAlert.close();
      console.error("Form submission error:", error);
      showAlert.error(
        "Error",
        error.message ||
          "Failed to save personnel information. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };
  const performClose = async () => {
    setIsClosing(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onClose();
  };

  const handleCloseAttempt = async () => {
    if (hasUnsavedChanges) {
      const confirmation = await showAlert.confirm(
        "Discard changes?",
        "You have unsaved changes. Close without saving?",
        "Discard",
        "Continue editing"
      );
      if (!confirmation.isConfirmed) {
        return;
      }
    }
    await performClose();
  };

  const handleBackdropClick = async (e) => {
    if (e.target === e.currentTarget) {
      await handleCloseAttempt();
    }
  };

  const handleEscapeKey = useCallback(
    async (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        await handleCloseAttempt();
      }
    },
    [handleCloseAttempt]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [handleEscapeKey]);

  return (
    <Portal>
      <div
        ref={modalRef}
        className={`modal fade show d-block modal-backdrop-animation ${
          isClosing ? "exit" : ""
        }`}
        onClick={handleBackdropClick}
        tabIndex="-1"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div
            ref={contentRef}
            className={`modal-content border-0 modal-content-animation ${
              isClosing ? "exit" : ""
            }`}
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{ backgroundColor: "#0E254B" }}
            >
              <h5 className="modal-title fw-bold">
                <i
                  className={`fas ${isEdit ? "fa-edit" : "fa-user-plus"} me-2`}
                ></i>
                {isEdit ? "Edit Personnel" : "Register Personnel"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleCloseAttempt}
                aria-label="Close"
                disabled={loading}
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="container-fluid px-1">
                  <div className="row gy-4">
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body text-center p-4">
                          <div className="d-flex flex-column align-items-center">
                            <div
                              className="d-flex align-items-center justify-content-center mb-3"
                              style={{
                                width: 140,
                                height: 140,
                                borderRadius: "50%",
                                border: "4px solid #e4e7ef",
                                backgroundColor: "#f4f6fb",
                                overflow: "hidden",
                              }}
                            >
                              {avatarPreview ? (
                                <img
                                  src={avatarPreview}
                                  alt="Personnel avatar preview"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <span className="text-muted">
                                  <i className="fas fa-user fa-3x" />
                                </span>
                              )}
                            </div>
                            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center align-items-center">
                              <label
                                htmlFor="personnel-avatar-input"
                                className="btn btn-outline-primary btn-sm mb-0"
                              >
                                <i className="fas fa-upload me-2" />
                                {avatarPreview
                                  ? "Change Photo"
                                  : "Upload Photo"}
                              </label>
                              <input
                                id="personnel-avatar-input"
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="d-none"
                                onChange={handleAvatarChange}
                                disabled={loading}
                              />
                              {avatarPreview && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={handleAvatarClear}
                                  disabled={loading}
                                >
                                  <i className="fas fa-trash me-2" />
                                  Remove Photo
                                </button>
                              )}
                            </div>
                            <small className="text-muted mt-2">
                              Recommended: square image up to 2MB (JPG, PNG,
                              WebP)
                            </small>
                            {errors.avatar && (
                              <div className="text-danger small mt-2">
                                {errors.avatar}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-xl-6">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                          <h6 className="text-uppercase text-muted fw-semibold mb-3">
                            Identity & Credentials
                          </h6>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                First Name{" "}
                                <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.first_name ? "is-invalid" : ""
                                }`}
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                disabled={loading}
                              />
                              {errors.first_name && (
                                <div className="invalid-feedback">
                                  {errors.first_name}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                Last Name <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.last_name ? "is-invalid" : ""
                                }`}
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                disabled={loading}
                              />
                              {errors.last_name && (
                                <div className="invalid-feedback">
                                  {errors.last_name}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                Employee Number{" "}
                                <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.employee_id ? "is-invalid" : ""
                                }`}
                                name="employee_id"
                                value={formData.employee_id}
                                onChange={handleChange}
                                disabled={loading}
                              />
                              {errors.employee_id && (
                                <div className="invalid-feedback">
                                  {errors.employee_id}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                ID Number <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.id_number ? "is-invalid" : ""
                                }`}
                                name="id_number"
                                value={formData.id_number}
                                onChange={handleChange}
                                disabled={loading}
                              />
                              {errors.id_number && (
                                <div className="invalid-feedback">
                                  {errors.id_number}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                Position / Item
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="position"
                                value={formData.position}
                                onChange={handleChange}
                                disabled={loading}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                Employment Status{" "}
                                <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.employment_status ? "is-invalid" : ""
                                }`}
                                name="employment_status"
                                value={formData.employment_status}
                                onChange={handleChange}
                                disabled={loading}
                              />
                              {errors.employment_status && (
                                <div className="invalid-feedback">
                                  {errors.employment_status}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                Employment Level{" "}
                                <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.employment_level ? "is-invalid" : ""
                                }`}
                                name="employment_level"
                                value={formData.employment_level}
                                onChange={handleChange}
                                disabled={loading}
                              />
                              {errors.employment_level && (
                                <div className="invalid-feedback">
                                  {errors.employment_level}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                Subject / Specialization
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="subject_area"
                                value={formData.subject_area}
                                onChange={handleChange}
                                disabled={loading}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                Contact Number
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.phone ? "is-invalid" : ""
                                }`}
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                disabled={loading}
                                maxLength={13}
                                placeholder="0951-341-9336"
                              />
                              {errors.phone && (
                                <div className="invalid-feedback">
                                  {errors.phone}
                                </div>
                              )}
                              <small className="text-muted">
                                Enter 11 digits (e.g., 0951-341-9336)
                              </small>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                Username <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.username ? "is-invalid" : ""
                                }`}
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                disabled={loading}
                              />
                              {errors.username && (
                                <div className="invalid-feedback">
                                  {errors.username}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                Rating
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="rating"
                                value={formData.rating}
                                onChange={handleChange}
                                disabled={loading}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-xl-6">
                      <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body">
                          <h6 className="text-uppercase text-muted fw-semibold mb-3">
                            Role & Portal Access
                          </h6>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                Portal Password{" "}
                                {!isEdit && (
                                  <span className="text-danger">*</span>
                                )}
                              </label>
                              <input
                                type="password"
                                className={`form-control ${
                                  errors.password ? "is-invalid" : ""
                                }`}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                disabled={loading}
                                placeholder="Temporary portal password"
                              />
                              {errors.password && (
                                <div className="invalid-feedback">
                                  {errors.password}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                Confirm Password{" "}
                                {!isEdit && (
                                  <span className="text-danger">*</span>
                                )}
                              </label>
                              <input
                                type="password"
                                className={`form-control ${
                                  errors.password_confirmation
                                    ? "is-invalid"
                                    : ""
                                }`}
                                name="password_confirmation"
                                value={formData.password_confirmation}
                                onChange={handleChange}
                                disabled={loading}
                              />
                              {errors.password_confirmation && (
                                <div className="invalid-feedback">
                                  {errors.password_confirmation}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="card border-0 shadow-sm">
                        <div className="card-body">
                          <h6 className="text-uppercase text-muted fw-semibold mb-3">
                            Notes
                          </h6>
                          <textarea
                            className="form-control"
                            rows="4"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="Add remarks about assignments, DCP pairing, or other reminders."
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top bg-white modal-smooth">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-smooth"
                  onClick={handleCloseAttempt}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-smooth"
                  style={{ backgroundColor: "#0E254B", borderColor: "#0E254B" }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-1"></i>
                      {isEdit ? "Update Personnel" : "Save Personnel"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default PersonnelFormModal;
