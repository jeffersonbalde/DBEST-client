import React, { useState, useEffect, useRef, useCallback } from "react";
import Portal from "../../components/Portal/Portal";
import { showAlert } from "../../services/notificationService";
import Swal from "sweetalert2";

const DEFAULT_FORM = {
  username: "",
  first_name: "",
  last_name: "",
  phone: "",
  password: "",
  password_confirmation: "",
};

const AccountingFormModal = ({ accounting, onClose, onSave, token }) => {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isClosing, setIsClosing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [existingAccountings, setExistingAccountings] = useState([]);
  const [accountingsLoading, setAccountingsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isEdit = !!accounting;
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const initialStateRef = useRef(DEFAULT_FORM);

  const formatContactPhone = (value) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "");

    // Limit to 11 digits
    const limited = digits.slice(0, 11);

    // Format as 0951-341-9336
    if (limited.length <= 4) {
      return limited;
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 4)}-${limited.slice(4)}`;
    } else {
      return `${limited.slice(0, 4)}-${limited.slice(4, 7)}-${limited.slice(
        7
      )}`;
    }
  };

  const validators = {
    username: (value) => {
      if (!value.trim()) return "Username is required";

      // Check for duplicate username (excluding current accounting in edit mode)
      const duplicate = existingAccountings.find(
        (a) =>
          a.username.toLowerCase() === value.trim().toLowerCase() &&
          (!isEdit || a.id !== accounting?.id)
      );
      if (duplicate) {
        return "This username is already taken";
      }
      return "";
    },
    first_name: (value) => (value.trim() ? "" : "First name is required"),
    last_name: (value) => (value.trim() ? "" : "Last name is required"),
    phone: (value) => {
      if (!value) return "";
      const digits = value.replace(/\D/g, "");
      if (digits.length === 0) return "";
      if (digits.length !== 11) {
        return "Contact number must be exactly 11 digits (e.g., 0951-341-9336)";
      }
      return "";
    },
    password: (value) => {
      if (!isEdit && !value) {
        return "Password is required";
      }
      if (value && value.length < 8) {
        return "Password must be at least 8 characters";
      }
      if (value && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value)) {
        return "Password must include uppercase, lowercase, and a number";
      }
      return "";
    },
    password_confirmation: (value) => {
      if (formData.password && value !== formData.password) {
        return "Passwords do not match";
      }
      return "";
    },
  };

  const resolveAvatarUrl = useCallback((entity) => {
    if (!entity) return "";

    // IGNORE the existing avatar_url and always use our custom endpoint
    if (entity.avatar_path) {
      const baseUrl = import.meta.env.VITE_LARAVEL_API;

      // Extract just the filename from the path
      let cleanFilename = entity.avatar_path;

      // Remove 'avatars/' prefix if present
      if (entity.avatar_path.includes("avatars/")) {
        cleanFilename = entity.avatar_path.replace("avatars/", "");
      }

      // Remove any path prefixes and get just the filename
      cleanFilename = cleanFilename.split("/").pop();

      // Use the accounting-avatar endpoint
      return `${baseUrl}/accounting-avatar/${cleanFilename}`;
    }

    return "";
  }, []);

  const computeHasChanges = (currentForm, file, removed) => {
    return (
      JSON.stringify(currentForm) !== JSON.stringify(initialStateRef.current) ||
      currentForm.password ||
      currentForm.password_confirmation ||
      file !== null ||
      removed
    );
  };

  const updateAvatarPreview = useCallback((source, isFile = false) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!source) {
      setAvatarPreview("");
      return;
    }

    if (isFile) {
      const url = URL.createObjectURL(source);
      previewUrlRef.current = url;
      setAvatarPreview(url);
    } else {
      setAvatarPreview(source);
    }
  }, []);

  // Fetch existing accounting users for duplicate checking
  useEffect(() => {
    const fetchExistingAccountings = async () => {
      setAccountingsLoading(true);
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
          }/ict/accountings`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const accountingList = data.accountings || data.data || [];
          setExistingAccountings(accountingList);
        } else {
          setExistingAccountings([]);
        }
      } catch (error) {
        console.error("Error fetching existing accountings:", error);
        setExistingAccountings([]);
      } finally {
        setAccountingsLoading(false);
      }
    };

    fetchExistingAccountings();
  }, [token]);

  useEffect(() => {
    if (accounting) {
      const existingAvatar = resolveAvatarUrl(accounting);
      const phoneValue = accounting.phone || "";
      const formattedPhone = phoneValue ? formatContactPhone(phoneValue) : "";

      const accountingFormState = {
        username: accounting.username || "",
        first_name: accounting.first_name || "",
        last_name: accounting.last_name || "",
        phone: formattedPhone,
        password: "",
        password_confirmation: "",
      };
      setFormData(accountingFormState);
      setAvatarFile(null);
      setAvatarRemoved(false);
      updateAvatarPreview(existingAvatar || "");
      initialStateRef.current = accountingFormState;
      setHasUnsavedChanges(false);
    } else {
      setFormData(DEFAULT_FORM);
      setAvatarFile(null);
      setAvatarRemoved(false);
      updateAvatarPreview("");
      initialStateRef.current = DEFAULT_FORM;
      setHasUnsavedChanges(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [accounting, resolveAvatarUrl, updateAvatarPreview]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "phone") {
      // Auto-format the contact number
      value = formatContactPhone(value);
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      setHasUnsavedChanges(computeHasChanges(next, avatarFile, avatarRemoved));
      return next;
    });

    // Validate the field
    if (validators[name]) {
      let errorMessage = validators[name](value);

      // Additional duplicate check for username
      if (name === "username" && value.trim()) {
        const duplicate = existingAccountings.find(
          (a) =>
            a.username.toLowerCase() === value.trim().toLowerCase() &&
            (!isEdit || a.id !== accounting?.id)
        );
        if (duplicate) {
          errorMessage = "This username is already taken";
        }
      }

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
    setFormData((prev) => {
      const next = { ...prev };
      setHasUnsavedChanges(computeHasChanges(next, null, true));
      return next;
    });
    updateAvatarPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setErrors((prev) => ({ ...prev, avatar: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate all fields with validators
    Object.entries(validators).forEach(([field, validator]) => {
      const message = validator(formData[field] || "");
      if (message && message.trim()) {
        newErrors[field] = message;
      }
    });

    // Additional duplicate check for username
    if (formData.username && formData.username.trim()) {
      const duplicate = existingAccountings.find(
        (a) =>
          a.username.toLowerCase() === formData.username.trim().toLowerCase() &&
          (!isEdit || a.id !== accounting?.id)
      );
      if (duplicate) {
        newErrors.username = "This username is already taken";
      }
    }

    // Check for required fields that might not have validators
    if (!formData.username || !formData.username.trim()) {
      newErrors.username = "Username is required";
    }
    if (!formData.first_name || !formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }
    if (!formData.last_name || !formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    // Filter out empty error messages
    const filteredErrors = {};
    Object.entries(newErrors).forEach(([field, message]) => {
      if (message && message.trim()) {
        filteredErrors[field] = message;
      }
    });

    setErrors(filteredErrors);

    // If there are errors, show them and prevent submission
    if (Object.keys(filteredErrors).length > 0) {
      // Scroll to first error field after a short delay to ensure DOM is updated
      setTimeout(() => {
        const firstErrorField = Object.keys(filteredErrors)[0];
        const errorElement = document.querySelector(
          `[name="${firstErrorField}"]`
        );
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
          errorElement.focus();
        }
      }, 100);
      return { isValid: false, errors: filteredErrors };
    }

    return { isValid: true, errors: {} };
  };

  const buildFormPayload = () => {
    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      // Include password_confirmation only if password is provided
      if (key === "password_confirmation") {
        // Only include if password is also being sent
        if (formData.password && formData.password.trim()) {
          payload.append(key, value ?? "");
        }
      } else {
        // For password, only include if it has a value (not empty)
        if (key === "password") {
          if (value && value.trim()) {
            payload.append(key, value);
          }
        } else {
          payload.append(key, value ?? "");
        }
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
    e.stopPropagation();

    // Validate form before submission
    const validationResult = validateForm();
    if (!validationResult.isValid) {
      // Field errors are already set and will show red borders
      // Now show SweetAlert popup with all errors
      const fieldLabels = {
        username: "Username",
        first_name: "First Name",
        last_name: "Last Name",
        phone: "Contact Number",
        password: "Password",
        password_confirmation: "Confirm Password",
        avatar: "Avatar",
      };

      // Build error list HTML
      const errorList = Object.entries(validationResult.errors)
        .map(([field, message]) => {
          if (!message) return null;
          const fieldLabel = fieldLabels[field] || field;
          return `<li style="margin-bottom: 8px;"><strong>${fieldLabel}:</strong> ${message}</li>`;
        })
        .filter(Boolean)
        .join("");

      // Show SweetAlert error popup with HTML support
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

      // Scroll to top of form to see field errors
      const formElement = document.querySelector(".modal-body");
      if (formElement) {
        formElement.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    // Show confirmation modal before submitting
    const confirmation = await showAlert.confirm(
      isEdit ? "Update Accounting Account?" : "Create Accounting Account?",
      isEdit
        ? `Are you sure you want to update "${formData.first_name} ${formData.last_name}"? This will save all the changes you've made.`
        : `Are you sure you want to create an accounting account for "${formData.first_name} ${formData.last_name}"? Please verify all information is correct before proceeding.`,
      isEdit ? "Update Account" : "Create Account",
      "Cancel"
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      showAlert.loading(
        isEdit ? "Updating Accounting Account" : "Creating Accounting Account",
        "Please wait while we save the accounting account information..."
      );

      const url = isEdit
        ? `${
            import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
          }/ict/accountings/${accounting.id}`
        : `${
            import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
          }/ict/accountings`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: buildFormPayload(),
      });

      const data = await response.json();
      showAlert.close();

      if (response.ok) {
        showAlert.success(
          isEdit ? "Accounting Account Updated" : "Accounting Account Created",
          isEdit
            ? "Accounting account information has been updated successfully."
            : "Accounting account has been created successfully."
        );

        if (onSave) {
          onSave(data.user || data);
        }

        const refreshedAvatar = resolveAvatarUrl(data.user || data);
        const normalizedAccounting = {
          username: (data.user || data).username || "",
          first_name: (data.user || data).first_name || "",
          last_name: (data.user || data).last_name || "",
          phone: (data.user || data).phone || "",
          password: "",
          password_confirmation: "",
        };
        initialStateRef.current = normalizedAccounting;
        setFormData(normalizedAccounting);
        setHasUnsavedChanges(false);
        setAvatarFile(null);
        setAvatarRemoved(false);
        updateAvatarPreview(refreshedAvatar || "");
      } else {
        // Handle validation errors from backend
        if (data.errors) {
          const backendErrors = {};
          Object.keys(data.errors).forEach((key) => {
            // Handle Laravel validation error format (array of messages)
            backendErrors[key] = Array.isArray(data.errors[key])
              ? data.errors[key][0]
              : data.errors[key];
          });
          setErrors((prev) => ({ ...prev, ...backendErrors }));
        }

        const errorMessage =
          data.message || "Failed to save accounting account information";
        showAlert.error("Error", errorMessage);
      }
    } catch (error) {
      showAlert.close();
      console.error("Form submission error:", error);
      showAlert.error(
        "Error",
        error.message ||
          "Failed to save accounting account information. Please try again."
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

  const handleEscapeKey = async (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      await handleCloseAttempt();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, []);

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
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div
            ref={contentRef}
            className={`modal-content border-0 modal-content-animation ${
              isClosing ? "exit" : ""
            }`}
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{ backgroundColor: "#0E254B" }}
            >
              <h5 className="modal-title fw-bold">
                <i className={`fas ${isEdit ? "fa-edit" : "fa-plus"} me-2`}></i>
                {isEdit
                  ? "Edit Accounting Account"
                  : "Add New Accounting Account"}
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
                                  alt="Accounting avatar preview"
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
                                htmlFor="accounting-avatar-input"
                                className="btn btn-outline-primary btn-sm mb-0"
                              >
                                <i className="fas fa-upload me-2" />
                                {avatarPreview
                                  ? "Change Photo"
                                  : "Upload Photo"}
                              </label>
                              <input
                                id="accounting-avatar-input"
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
                              GIF, SVG, WebP)
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

                    <div className="col-12">
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
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
                            disabled={loading || accountingsLoading}
                            placeholder="Unique login username"
                          />
                          {errors.username && (
                            <div className="invalid-feedback">
                              {errors.username}
                            </div>
                          )}
                          {accountingsLoading && (
                            <small className="text-muted">
                              <i className="fas fa-spinner fa-spin me-1"></i>
                              Checking username availability...
                            </small>
                          )}
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            First Name <span className="text-danger">*</span>
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
                            placeholder="Enter first name"
                          />
                          {errors.first_name && (
                            <div className="invalid-feedback">
                              {errors.first_name}
                            </div>
                          )}
                        </div>

                        <div className="col-12 col-md-6">
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
                            placeholder="Enter last name"
                          />
                          {errors.last_name && (
                            <div className="invalid-feedback">
                              {errors.last_name}
                            </div>
                          )}
                        </div>

                        <div className="col-12 col-md-6">
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
                            placeholder="e.g., 0951-341-9336"
                            maxLength={13}
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

                        <div className="col-12">
                          <div className="card border-warning bg-white">
                            <div className="card-header bg-warning bg-opacity-10">
                              <h6 className="mb-0 text-warning">
                                <i className="fas fa-key me-2"></i>
                                {isEdit
                                  ? "Update Password (Optional)"
                                  : "Password Information"}
                              </h6>
                            </div>
                            <div className="card-body">
                              <div className="row">
                                <div className="col-md-6">
                                  <div className="mb-3 position-relative">
                                    <label className="form-label small fw-semibold text-dark mb-1">
                                      Password {isEdit ? "" : "*"}
                                    </label>
                                    <div className="input-group">
                                      <span
                                        className={`input-group-text bg-white border-end-0 ${
                                          errors.password ? "border-danger" : ""
                                        }`}
                                      >
                                        <i className="fas fa-lock"></i>
                                      </span>
                                      <input
                                        type={
                                          showPassword ? "text" : "password"
                                        }
                                        className={`form-control border-start-0 ps-2 ${
                                          errors.password ? "is-invalid" : ""
                                        }`}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={loading}
                                        placeholder={
                                          isEdit
                                            ? "Leave blank to keep current password"
                                            : "Enter password"
                                        }
                                      />
                                      <span
                                        className={`input-group-text bg-white border-start-0 ${
                                          errors.password ? "border-danger" : ""
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          className="btn btn-sm p-0 border-0 bg-transparent text-muted"
                                          onClick={() =>
                                            setShowPassword(!showPassword)
                                          }
                                          disabled={loading}
                                        >
                                          <i
                                            className={`fas ${
                                              showPassword
                                                ? "fa-eye-slash"
                                                : "fa-eye"
                                            }`}
                                          ></i>
                                        </button>
                                      </span>
                                    </div>
                                    {errors.password ? (
                                      <div className="invalid-feedback d-block">
                                        {errors.password}
                                      </div>
                                    ) : (
                                      <small className="text-muted">
                                        Must be at least 8 characters with
                                        uppercase, lowercase, and a number.
                                      </small>
                                    )}
                                  </div>
                                </div>

                                <div className="col-md-6">
                                  <div className="mb-3 position-relative">
                                    <label className="form-label small fw-semibold text-dark mb-1">
                                      Confirm Password
                                    </label>
                                    <div className="input-group">
                                      <span
                                        className={`input-group-text bg-white border-end-0 ${
                                          errors.password_confirmation
                                            ? "border-danger"
                                            : ""
                                        }`}
                                      >
                                        <i className="fas fa-lock"></i>
                                      </span>
                                      <input
                                        type={
                                          showConfirmPassword
                                            ? "text"
                                            : "password"
                                        }
                                        className={`form-control border-start-0 ps-2 ${
                                          errors.password_confirmation
                                            ? "is-invalid"
                                            : ""
                                        }`}
                                        name="password_confirmation"
                                        value={formData.password_confirmation}
                                        onChange={handleChange}
                                        disabled={loading}
                                        placeholder="Confirm password"
                                      />
                                      <span
                                        className={`input-group-text bg-white border-start-0 ${
                                          errors.password_confirmation
                                            ? "border-danger"
                                            : ""
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          className="btn btn-sm p-0 border-0 bg-transparent text-muted"
                                          onClick={() =>
                                            setShowConfirmPassword(
                                              !showConfirmPassword
                                            )
                                          }
                                          disabled={loading}
                                        >
                                          <i
                                            className={`fas ${
                                              showConfirmPassword
                                                ? "fa-eye-slash"
                                                : "fa-eye"
                                            }`}
                                          ></i>
                                        </button>
                                      </span>
                                    </div>
                                    {errors.password_confirmation && (
                                      <div className="invalid-feedback d-block">
                                        {errors.password_confirmation}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
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
                  style={{
                    backgroundColor: "#0E254B",
                    borderColor: "#0E254B",
                  }}
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
                      {isEdit ? "Update Account" : "Create Account"}
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

export default AccountingFormModal;
