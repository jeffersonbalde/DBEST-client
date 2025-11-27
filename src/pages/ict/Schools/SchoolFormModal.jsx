import React, { useState, useEffect, useRef, useCallback } from "react";
import Portal from "../../../components/Portal/Portal";
import { showAlert } from "../../../services/notificationService";
import Swal from "sweetalert2";

const DEFAULT_FORM = {
  name: "",
  deped_code: "",
  region: "",
  division: "",
  district: "",
  address: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  website: "",
  avatar_url: "",
};

const SchoolFormModal = ({ school, onClose, onSave, token }) => {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isClosing, setIsClosing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isEdit = !!school;
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const initialStateRef = useRef(DEFAULT_FORM);

  const isValidUrl = (value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol);
    } catch (error) {
      return false;
    }
  };

  const isValidImageUrl = (value) => {
    if (!isValidUrl(value)) return false;
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(value.split("?")[0]);
  };

  const getApiBase = useCallback(() => {
    const fallback = window.location.origin + "/api";
    return (import.meta.env.VITE_LARAVEL_API || fallback).replace(
      /\/api\/?$/,
      ""
    );
  }, []);

  const buildFileUrl = useCallback(
    (path = "") => {
      if (!path) return "";
      const cleaned = path
        .replace(/\\/g, "/")
        .replace(/^https?:\/\/[^/]+/i, "")
        .replace(/^\/?storage\//, "");
      return `${getApiBase()}/storage/${cleaned}`;
    },
    [getApiBase]
  );

  const ensureAbsoluteUrl = useCallback(
    (value = "") => {
      if (!value) return "";
      if (/^https?:\/\//i.test(value)) {
        return value;
      }
      return buildFileUrl(value);
    },
    [buildFileUrl]
  );

  const resolveAvatarUrl = useCallback((entity) => {
    if (!entity) return "";

    // IGNORE the existing avatar_url and always use our custom endpoint
    if (entity.avatar_path) {
      const baseUrl = import.meta.env.VITE_LARAVEL_API;

      // Extract just the filename from the path
      let cleanFilename = entity.avatar_path;

      // Remove 'school-avatars/' prefix if present
      if (entity.avatar_path.includes("school-avatars/")) {
        cleanFilename = entity.avatar_path.replace("school-avatars/", "");
      }

      // Remove any path prefixes and get just the filename
      cleanFilename = cleanFilename.split("/").pop();

      // Use the school-avatar endpoint
      return `${baseUrl}/school-avatar/${cleanFilename}`;
    }

    return "";
  }, []);

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
    name: (value) => (value.trim() ? "" : "School name is required"),
    contact_email: (value) =>
      value && !/\S+@\S+\.\S+/.test(value) ? "Invalid email format" : "",
    contact_phone: (value) => {
      if (!value) return "";
      // Remove all non-digit characters for validation
      const digits = value.replace(/\D/g, "");
      if (digits.length === 0) return "";
      if (digits.length !== 11) {
        return "Contact number must be exactly 11 digits (e.g., 0951-341-9336)";
      }
      return "";
    },
    website: (value) =>
      value && !isValidUrl(value)
        ? "Enter a valid URL (https://example.com)"
        : "",
    avatar_url: (value) =>
      value && !isValidImageUrl(value)
        ? "Enter a valid image URL ending in .jpg, .png, etc."
        : "",
  };

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

  const computeHasChanges = useCallback(
    (currentForm, currentAvatarFile, currentAvatarRemoved) => {
      const sanitizedForm = {
        ...currentForm,
        avatar_url: currentForm.avatar_url || "",
      };
      const baseline = {
        ...initialStateRef.current,
        avatar_url: initialStateRef.current.avatar_url || "",
      };
      if (JSON.stringify(sanitizedForm) !== JSON.stringify(baseline)) {
        return true;
      }
      if (currentAvatarFile) return true;
      if (currentAvatarRemoved) return true;
      return false;
    },
    []
  );

  useEffect(() => {
    if (school) {
      const existingAvatar = resolveAvatarUrl(school);
      // Format contact phone if it exists
      const contactPhone = school.contact_phone
        ? formatContactPhone(school.contact_phone)
        : "";

      const payload = {
        name: school.name || "",
        deped_code: school.deped_code || "",
        region: school.region || "",
        division: school.division || "",
        district: school.district || "",
        address: school.address || "",
        contact_person: school.contact_person || "",
        contact_email: school.contact_email || "",
        contact_phone: contactPhone,
        website: school.website || "",
        avatar_url: existingAvatar || "",
      };
      setFormData(payload);
      setAvatarFile(null);
      setAvatarRemoved(false);
      updateAvatarPreview(existingAvatar || "");
      initialStateRef.current = payload;
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
  }, [school, resolveAvatarUrl, updateAvatarPreview]);

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

    if (name === "contact_phone") {
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
      const errorMessage = validators[name](value);
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
      const next = { ...prev, avatar_url: "" };
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

    // Check for required fields that might not have validators
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "School name is required";
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
      payload.append(key, value ?? "");
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
        name: "School Name",
        contact_email: "Contact Email",
        contact_phone: "Contact Number",
        website: "Website / Portal URL",
        avatar_url: "Avatar URL",
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
      isEdit ? "Update School?" : "Register School?",
      isEdit
        ? `Are you sure you want to update "${formData.name}"? This will save all the changes you've made.`
        : `Are you sure you want to register "${formData.name}"? Please verify all information is correct before proceeding.`,
      isEdit ? "Update School" : "Register School",
      "Cancel"
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      showAlert.loading(
        isEdit ? "Updating School" : "Registering School",
        "Please wait while we save the school information..."
      );

      const url = isEdit
        ? `${
            import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
          }/ict/schools/${school.id}`
        : `${
            import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
          }/ict/schools`;

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
          isEdit ? "School Updated" : "School Registered",
          isEdit
            ? "School information has been updated successfully."
            : "School has been registered successfully."
        );

        if (onSave) {
          onSave(data.school);
        }

        const refreshedAvatar = resolveAvatarUrl(data.school);
        const normalizedSchool = {
          name: data.school.name || "",
          deped_code: data.school.deped_code || "",
          region: data.school.region || "",
          division: data.school.division || "",
          district: data.school.district || "",
          address: data.school.address || "",
          contact_person: data.school.contact_person || "",
          contact_email: data.school.contact_email || "",
          contact_phone: data.school.contact_phone || "",
          website: data.school.website || "",
          avatar_url: refreshedAvatar || "",
        };
        initialStateRef.current = normalizedSchool;
        setFormData(normalizedSchool);
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
          data.message || "Failed to save school information";
        showAlert.error("Error", errorMessage);
      }
    } catch (error) {
      showAlert.close();
      console.error("Form submission error:", error);
      showAlert.error(
        "Error",
        error.message || "Failed to save school information. Please try again."
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
                {isEdit ? "Edit DepEd School" : "Register DepEd School"}
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
                                  alt="School avatar preview"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <span className="text-muted">
                                  <i className="fas fa-school fa-3x" />
                                </span>
                              )}
                            </div>
                            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center align-items-center">
                              <label
                                htmlFor="school-avatar-input"
                                className="btn btn-outline-primary btn-sm mb-0"
                              >
                                <i className="fas fa-upload me-2" />
                                {avatarPreview
                                  ? "Change Photo"
                                  : "Upload Photo"}
                              </label>
                              <input
                                id="school-avatar-input"
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
                        <div className="col-12 col-lg-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            School Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${
                              errors.name ? "is-invalid" : ""
                            }`}
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="Enter official school name"
                          />
                          {errors.name && (
                            <div className="invalid-feedback">
                              {errors.name}
                            </div>
                          )}
                        </div>

                        <div className="col-12 col-lg-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            DepEd School ID
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="deped_code"
                            value={formData.deped_code}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="e.g., 305123"
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            Region
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="region"
                            value={formData.region}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="e.g., Region III"
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            Division
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="division"
                            value={formData.division}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="e.g., Aurora"
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            District
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="district"
                            value={formData.district}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="e.g., Baler District"
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            Address
                          </label>
                          <textarea
                            className="form-control"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            disabled={loading}
                            rows="2"
                            placeholder="Complete school address"
                          ></textarea>
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            Contact Person
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="contact_person"
                            value={formData.contact_person}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="Name of focal person"
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            Contact Number
                          </label>
                          <input
                            type="text"
                            className={`form-control ${
                              errors.contact_phone ? "is-invalid" : ""
                            }`}
                            name="contact_phone"
                            value={formData.contact_phone}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="e.g., 0951-341-9336"
                            maxLength={13}
                          />
                          {errors.contact_phone && (
                            <div className="invalid-feedback">
                              {errors.contact_phone}
                            </div>
                          )}
                          <small className="text-muted">
                            Enter 11 digits (e.g., 0951-341-9336)
                          </small>
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            Contact Email
                          </label>
                          <input
                            type="email"
                            className={`form-control ${
                              errors.contact_email ? "is-invalid" : ""
                            }`}
                            name="contact_email"
                            value={formData.contact_email}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="e.g., school@deped.gov.ph"
                          />
                          {errors.contact_email && (
                            <div className="invalid-feedback">
                              {errors.contact_email}
                            </div>
                          )}
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            Website / Portal URL
                          </label>
                          <input
                            type="text"
                            className={`form-control ${
                              errors.website ? "is-invalid" : ""
                            }`}
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="Optional"
                          />
                          {errors.website && (
                            <div className="invalid-feedback">
                              {errors.website}
                            </div>
                          )}
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
                      {isEdit ? "Update School" : "Register School"}
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

export default SchoolFormModal;
