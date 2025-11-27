import React, { useState, useEffect, useRef, useCallback } from "react";
import Portal from "../../../components/Portal/Portal";
import { showAlert } from "../../../services/notificationService";
import Swal from "sweetalert2";

const DEFAULT_FORM = {
  username: "",
  first_name: "",
  last_name: "",
  school_id: "",
  phone: "",
  password: "",
  password_confirmation: "",
};

const PropertyCustodianFormModal = ({ custodian, onClose, onSave, token }) => {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isClosing, setIsClosing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [existingCustodians, setExistingCustodians] = useState([]);
  const [custodiansLoading, setCustodiansLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isEdit = !!custodian;
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

      // Check for duplicate username (excluding current custodian in edit mode)
      const duplicate = existingCustodians.find(
        (c) =>
          c.username.toLowerCase() === value.trim().toLowerCase() &&
          (!isEdit || c.id !== custodian?.id)
      );
      if (duplicate) {
        return "This username is already taken";
      }
      return "";
    },
    first_name: (value) => (value.trim() ? "" : "First name is required"),
    last_name: (value) => (value.trim() ? "" : "Last name is required"),
    school_id: (value) => {
      if (!value) return "Assigned DepEd School is required";

      // Check for duplicate school (excluding current custodian in edit mode)
      const duplicate = existingCustodians.find(
        (c) =>
          c.school_id &&
          c.school_id.toString() === value.toString() &&
          (!isEdit || c.id !== custodian?.id)
      );
      if (duplicate) {
        const school = schools.find(
          (s) => s.id.toString() === value.toString()
        );
        const schoolName = school ? school.name : "This school";
        return `${schoolName} already has a property custodian assigned`;
      }
      return "";
    },
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

      // Use the custodian-avatar endpoint
      return `${baseUrl}/custodian-avatar/${cleanFilename}`;
    }

    return "";
  }, []);

  const fetchSchools = useCallback(async () => {
    setSchoolsLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        }/ict/schools`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSchools(data.schools || []);
      } else {
        throw new Error("Failed to load schools");
      }
    } catch (error) {
      console.error(error);
      showAlert.error(
        "Unable to load schools",
        "Please register DepEd schools first before assigning custodians."
      );
      setSchools([]);
    } finally {
      setSchoolsLoading(false);
    }
  }, [token]);

  const fetchExistingCustodians = useCallback(async () => {
    setCustodiansLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        }/ict/property-custodians?per_page=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const custodiansList = data.data || data || [];
        setExistingCustodians(custodiansList);
      } else {
        throw new Error("Failed to load existing custodians");
      }
    } catch (error) {
      console.error(error);
      setExistingCustodians([]);
    } finally {
      setCustodiansLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSchools();
    fetchExistingCustodians();
  }, [fetchSchools, fetchExistingCustodians]);

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

  useEffect(() => {
    if (custodian) {
      const existingAvatar = resolveAvatarUrl(custodian);
      const phoneValue = custodian.phone || "";
      const formattedPhone = phoneValue ? formatContactPhone(phoneValue) : "";

      const custodianFormState = {
        username: custodian.username || "",
        first_name: custodian.first_name || "",
        last_name: custodian.last_name || "",
        school_id: custodian.school_id || "",
        phone: formattedPhone,
        password: "",
        password_confirmation: "",
      };
      setFormData(custodianFormState);
      setAvatarFile(null);
      setAvatarRemoved(false);
      updateAvatarPreview(existingAvatar || "");
      initialStateRef.current = custodianFormState;
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
  }, [custodian, resolveAvatarUrl, updateAvatarPreview]);

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

    // Validate the field with current state
    let errorMessage = "";
    if (name === "username") {
      if (!value.trim()) {
        errorMessage = "Username is required";
      } else {
        const duplicate = existingCustodians.find(
          (c) =>
            c.username.toLowerCase() === value.trim().toLowerCase() &&
            (!isEdit || c.id !== custodian?.id)
        );
        if (duplicate) {
          errorMessage = "This username is already taken";
        }
      }
    } else if (name === "school_id") {
      if (!value) {
        errorMessage = "Assigned DepEd School is required";
      } else {
        const duplicate = existingCustodians.find(
          (c) =>
            c.school_id &&
            c.school_id.toString() === value.toString() &&
            (!isEdit || c.id !== custodian?.id)
        );
        if (duplicate) {
          const school = schools.find(
            (s) => s.id.toString() === value.toString()
          );
          const schoolName = school ? school.name : "This school";
          errorMessage = `${schoolName} already has a property custodian assigned`;
        }
      }
    } else if (validators[name]) {
      errorMessage = validators[name](value);
    }

    setErrors((prev) => ({ ...prev, [name]: errorMessage }));
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

    // Create validators with current state
    const currentValidators = {
      username: (value) => {
        if (!value.trim()) return "Username is required";

        // Check for duplicate username (excluding current custodian in edit mode)
        const duplicate = existingCustodians.find(
          (c) =>
            c.username.toLowerCase() === value.trim().toLowerCase() &&
            (!isEdit || c.id !== custodian?.id)
        );
        if (duplicate) {
          return "This username is already taken";
        }
        return "";
      },
      first_name: (value) => (value.trim() ? "" : "First name is required"),
      last_name: (value) => (value.trim() ? "" : "Last name is required"),
      school_id: (value) => {
        if (!value) return "Assigned DepEd School is required";

        // Check for duplicate school (excluding current custodian in edit mode)
        const duplicate = existingCustodians.find(
          (c) =>
            c.school_id &&
            c.school_id.toString() === value.toString() &&
            (!isEdit || c.id !== custodian?.id)
        );
        if (duplicate) {
          const school = schools.find(
            (s) => s.id.toString() === value.toString()
          );
          const schoolName = school ? school.name : "This school";
          return `${schoolName} already has a property custodian assigned`;
        }
        return "";
      },
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

    // Validate all fields with validators
    Object.entries(currentValidators).forEach(([field, validator]) => {
      const message = validator(formData[field] || "");
      if (message && message.trim()) {
        newErrors[field] = message;
      }
    });

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
    if (!formData.school_id) {
      newErrors.school_id = "Assigned DepEd School is required";
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

    // Check if schools or custodians are still loading
    if (schoolsLoading || custodiansLoading) {
      showAlert.error(
        "Please wait",
        "Data is still loading. Please wait before submitting."
      );
      return;
    }

    // Validate form before submission
    const validationResult = validateForm();
    if (!validationResult.isValid) {
      // Field errors are already set and will show red borders
      // Now show SweetAlert popup with all errors
      const fieldLabels = {
        username: "Username",
        first_name: "First Name",
        last_name: "Last Name",
        school_id: "Assigned DepEd School",
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
      isEdit ? "Update Property Custodian?" : "Create Property Custodian?",
      isEdit
        ? `Are you sure you want to update "${formData.first_name} ${formData.last_name}"? This will save all the changes you've made.`
        : `Are you sure you want to create a property custodian account for "${formData.first_name} ${formData.last_name}"? Please verify all information is correct before proceeding.`,
      isEdit ? "Update Custodian" : "Create Custodian",
      "Cancel"
    );

    if (!confirmation.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      showAlert.loading(
        isEdit ? "Updating Property Custodian" : "Creating Property Custodian",
        "Please wait while we save the property custodian information..."
      );

      const url = isEdit
        ? `${
            import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
          }/ict/property-custodians/${custodian.id}`
        : `${
            import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
          }/ict/property-custodians`;

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
          isEdit ? "Property Custodian Updated" : "Property Custodian Created",
          isEdit
            ? "Property custodian information has been updated successfully."
            : "Property custodian has been created successfully."
        );

        if (onSave) {
          onSave(data.custodian);
        }

        const refreshedAvatar = resolveAvatarUrl(data.custodian);
        const normalizedCustodian = {
          username: data.custodian.username || "",
          first_name: data.custodian.first_name || "",
          last_name: data.custodian.last_name || "",
          school_id: data.custodian.school_id || "",
          phone: data.custodian.phone || "",
          password: "",
          password_confirmation: "",
        };
        initialStateRef.current = normalizedCustodian;
        setFormData(normalizedCustodian);
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
          data.message || "Failed to save property custodian information";
        showAlert.error("Error", errorMessage);
      }
    } catch (error) {
      showAlert.close();
      console.error("Form submission error:", error);
      showAlert.error(
        "Error",
        error.message ||
          "Failed to save property custodian information. Please try again."
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
                  ? "Edit Property Custodian"
                  : "Add New Property Custodian"}
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
                                  alt="Custodian avatar preview"
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
                                htmlFor="custodian-avatar-input"
                                className="btn btn-outline-primary btn-sm mb-0"
                              >
                                <i className="fas fa-upload me-2" />
                                {avatarPreview
                                  ? "Change Photo"
                                  : "Upload Photo"}
                              </label>
                              <input
                                id="custodian-avatar-input"
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
                            disabled={loading || custodiansLoading}
                            placeholder="Unique login username"
                          />
                          {errors.username && (
                            <div className="invalid-feedback">
                              {errors.username}
                            </div>
                          )}
                          {custodiansLoading && (
                            <small className="text-muted">
                              <i className="fas fa-spinner fa-spin me-1"></i>
                              Checking username availability...
                            </small>
                          )}
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-dark mb-1">
                            Assigned DepEd School{" "}
                            <span className="text-danger">*</span>
                          </label>
                          <select
                            className={`form-select ${
                              errors.school_id ? "is-invalid" : ""
                            }`}
                            name="school_id"
                            value={formData.school_id || ""}
                            onChange={handleChange}
                            disabled={
                              loading || schoolsLoading || custodiansLoading
                            }
                          >
                            <option value="">
                              {schoolsLoading || custodiansLoading
                                ? "Loading schools..."
                                : "Select school"}
                            </option>
                            {schools.map((school) => {
                              // Check if school is already assigned to another custodian
                              const isAssigned = existingCustodians.some(
                                (c) =>
                                  c.school_id &&
                                  c.school_id.toString() ===
                                    school.id.toString() &&
                                  (!isEdit || c.id !== custodian?.id)
                              );
                              return (
                                <option
                                  key={school.id}
                                  value={school.id}
                                  disabled={isAssigned}
                                >
                                  {school.name}
                                  {school.deped_code
                                    ? ` (${school.deped_code})`
                                    : ""}
                                  {isAssigned ? " - Already Assigned" : ""}
                                </option>
                              );
                            })}
                          </select>
                          {errors.school_id && (
                            <div className="invalid-feedback">
                              {errors.school_id}
                            </div>
                          )}
                          {(schoolsLoading || custodiansLoading) && (
                            <small className="text-muted">
                              <i className="fas fa-spinner fa-spin me-1"></i>
                              Loading schools, please wait...
                            </small>
                          )}
                          {!schoolsLoading &&
                            !custodiansLoading &&
                            schools.length === 0 && (
                              <small className="text-muted">
                                No schools registered yet. Use the DepEd Schools
                                tab to register a school.
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
                  disabled={loading || schoolsLoading || custodiansLoading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-1"></i>
                      {isEdit ? "Update Custodian" : "Create Custodian"}
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

export default PropertyCustodianFormModal;
