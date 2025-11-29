import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import { FaUser, FaIdCard, FaPhone } from "react-icons/fa";

const BRAND = {
  primary: "#0E254B",
  accent: "#1B5F9D",
  highlight: "#0DA9D6",
  muted: "#6b7c93",
};

const formatContactPhone = (value = "") => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
};

const MyProfile = () => {
  const { token } = useAuth();

  const [accounting, setAccounting] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    phone: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const initialStateRef = useRef(formData);

  const validators = {
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
  };

  const computeHasChanges = useCallback(
    (currentForm, currentAvatarFile, currentAvatarRemoved) => {
      const baseline = initialStateRef.current || {};
      if (JSON.stringify(currentForm) !== JSON.stringify(baseline)) {
        return true;
      }
      if (currentAvatarFile) return true;
      if (currentAvatarRemoved) return true;
      return false;
    },
    []
  );

  const resolveAvatarUrl = useCallback((entity) => {
    if (!entity) return "";
    if (entity.avatar_path) {
      const baseUrl = import.meta.env.VITE_LARAVEL_API;
      let cleanFilename = entity.avatar_path;
      if (cleanFilename.includes("avatars/")) {
        cleanFilename = cleanFilename.replace("avatars/", "");
      }
      cleanFilename = cleanFilename.split("/").pop();
      return `${baseUrl}/accounting-avatar/${cleanFilename}`;
    }
    return entity.avatar_url || "";
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

  const loadAccountingProfile = useCallback(async () => {
    setLoading(true);
    try {
      const apiBase =
        import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/accounting/profile/me?t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showAlert.error(
          "Profile",
          data?.message ||
            "Unable to load your profile. Please contact your administrator."
        );
        setAccounting(null);
        return;
      }

      const fetchedAccounting = data.accounting || data;
      setAccounting(fetchedAccounting);

      const contactPhone = fetchedAccounting.phone
        ? formatContactPhone(fetchedAccounting.phone)
        : "";

      const payload = {
        first_name: fetchedAccounting.first_name || "",
        last_name: fetchedAccounting.last_name || "",
        username: fetchedAccounting.username || "",
        phone: contactPhone,
      };

      setFormData(payload);
      initialStateRef.current = payload;
      setAvatarFile(null);
      setAvatarRemoved(false);
      setHasChanges(false);
      const avatar = resolveAvatarUrl(fetchedAccounting);
      updateAvatarPreview(avatar || "");
      setErrors({});
    } catch (error) {
      console.error("Error loading accounting profile:", error);
      showAlert.error(
        "Profile",
        "Unable to load your profile. Please try again later."
      );
      setAccounting(null);
    } finally {
      setLoading(false);
    }
  }, [token, resolveAvatarUrl, updateAvatarPreview]);

  useEffect(() => {
    loadAccountingProfile();

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [loadAccountingProfile]);

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "phone") {
      value = formatContactPhone(value);
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      setHasChanges(computeHasChanges(next, avatarFile, avatarRemoved));
      return next;
    });

    if (validators[name]) {
      const errorMessage = validators[name](value || "");
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
    setHasChanges(computeHasChanges(formData, file, false));
    updateAvatarPreview(file, true);
  };

  const handleAvatarClear = () => {
    setAvatarFile(null);
    setAvatarRemoved(true);
    setFormData((prev) => {
      const next = { ...prev };
      setHasChanges(computeHasChanges(next, null, true));
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

    Object.entries(validators).forEach(([field, validator]) => {
      const message = validator(formData[field] || "");
      if (message && message.trim()) {
        newErrors[field] = message;
      }
    });

    if (!formData.first_name || !formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name || !formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    setErrors(newErrors);
    return newErrors;
  };

  const buildPayload = () => {
    const payload = new FormData();

    // Fields that can be updated
    const updatableFields = ["first_name", "last_name", "phone"];

    updatableFields.forEach((key) => {
      const value = formData[key];
      if (value !== undefined && value !== null) {
        // Strip dashes from phone number before sending
        if (key === "phone") {
          const phoneDigits = (value || "").replace(/\D/g, "");
          if (phoneDigits) {
            payload.append(key, phoneDigits);
          } else {
            payload.append(key, "");
          }
        } else {
          payload.append(key, value || "");
        }
      }
    });

    if (avatarFile) {
      payload.append("avatar", avatarFile);
    }

    if (avatarRemoved && !avatarFile) {
      payload.append("remove_avatar", "1");
    }

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      showAlert.error(
        "Validation Error",
        "Please check the highlighted fields and try again."
      );
      return;
    }

    const confirmation = await showAlert.confirm(
      "Update Profile?",
      "Are you sure you want to update your profile details?",
      "Save Changes",
      "Cancel"
    );

    if (!confirmation.isConfirmed) return;

    setSaving(true);
    try {
      showAlert.loading(
        "Updating Profile",
        "Please wait while we save your profile details..."
      );

      const apiBase =
        import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
      const payload = buildPayload();

      // Add _method=PUT for Laravel to handle FormData correctly
      payload.append("_method", "PUT");

      // Debug: Log what we're sending
      console.log("Sending update payload:", {
        formData,
        hasAvatarFile: !!avatarFile,
        avatarRemoved,
      });

      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/accounting/profile/me`,
        {
          method: "POST", // Use POST with _method=PUT for FormData
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            // Don't set Content-Type - let browser set it with boundary for FormData
          },
          body: payload,
        }
      );

      const data = await response.json();
      showAlert.close();

      if (!response.ok) {
        if (data.errors) {
          setErrors((prev) => ({ ...prev, ...data.errors }));
          const errorMessages = Object.entries(data.errors)
            .map(([field, messages]) => {
              const messageText = Array.isArray(messages)
                ? messages[0]
                : messages;
              return `${field}: ${messageText}`;
            })
            .join("\n");
          showAlert.error("Update Failed", errorMessages);
        } else {
          showAlert.error(
            "Update Failed",
            data.message || "Unable to update profile right now."
          );
        }
        return;
      }

      showToast.success("Profile updated successfully!");

      // Force a reload from the server to ensure we have the latest data
      // This ensures we get fresh data even if there are caching issues
      await loadAccountingProfile();
    } catch (error) {
      console.error("Update profile error:", error);
      showAlert.error(
        "Update Failed",
        error.message || "Unable to update profile right now."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!loading && !accounting) {
    return (
      <div className="container-fluid px-2 px-md-3 py-4 fadeIn">
        <div className="text-center py-5">
          <h2 className="h4 mb-2" style={{ color: BRAND.primary }}>
            No Profile Found
          </h2>
          <p className="text-muted mb-0">
            Your account is not currently linked to an accounting record. Please
            contact your administrator to set up your profile.
          </p>
        </div>
      </div>
    );
  }

  const displayName = accounting
    ? `${accounting.first_name || ""} ${accounting.last_name || ""}`.trim() ||
      "Accounting"
    : "Accounting";

  return (
    <div className="container-fluid px-4 px-md-3 py-4 fadeIn">
      <div className="text-center mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-center align-items-center mb-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center mb-3 mb-md-0 me-md-3 flex-shrink-0"
            style={{
              width: "56px",
              height: "56px",
              background: "linear-gradient(135deg, #0E254B 0%, #1B5F9D 100%)",
              boxShadow: "0 10px 30px rgba(15,61,95,0.35)",
            }}
          >
            <FaUser className="text-white" size={22} />
          </div>
          <div className="text-center text-md-start">
            <h1 className="h3 mb-1 fw-bold" style={{ color: BRAND.primary }}>
              My Profile
            </h1>
            <p className="text-muted mb-0">
              {accounting?.username || "No username"}
            </p>
            <small className="text-muted">
              Keep your profile information up to date.
            </small>
          </div>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-12 col-lg-10">
          <div
            className="card border-0"
            style={{
              boxShadow: "0 20px 45px rgba(15, 23, 42, 0.15)",
              borderRadius: "16px",
            }}
          >
            <div className="card-header bg-transparent border-0 py-3 px-4">
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    background:
                      "linear-gradient(135deg, #0DA9D6 0%, #1B5F9D 100%)",
                    color: "white",
                  }}
                >
                  <FaIdCard style={{ fontSize: "0.9rem" }} />
                </div>
                <div>
                  <h6 className="mb-0 fw-bold" style={{ color: BRAND.primary }}>
                    Personal Information
                  </h6>
                  <small className="text-muted">
                    This profile is used across your assigned items and records.
                  </small>
                </div>
              </div>
            </div>

            <div className="card-body p-4">
              {loading ? (
                <div className="row g-4">
                  <div className="col-12 col-md-4">
                    <div className="d-flex flex-column align-items-center">
                      <div
                        className="placeholder-wave mb-3 rounded-circle"
                        style={{
                          width: 140,
                          height: 140,
                          borderRadius: "50%",
                          backgroundColor: "#f4f6fb",
                          border: "4px solid #e4e7ef",
                        }}
                      >
                        <span
                          className="placeholder col-12"
                          style={{
                            height: "100%",
                            borderRadius: "50%",
                          }}
                        ></span>
                      </div>
                      <div className="placeholder-wave mb-2 w-75">
                        <span
                          className="placeholder col-12"
                          style={{ height: 32, borderRadius: 999 }}
                        ></span>
                      </div>
                      <div className="placeholder-wave w-50">
                        <span
                          className="placeholder col-12"
                          style={{ height: 16, borderRadius: 999 }}
                        ></span>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-md-8">
                    <div className="row g-3">
                      {[1, 2, 3, 4].map((idx) => (
                        <div
                          className={`${idx === 1 ? "col-12" : "col-md-6"}`}
                          key={idx}
                        >
                          <div className="placeholder-wave mb-1">
                            <span
                              className="placeholder col-4"
                              style={{ height: 14 }}
                            ></span>
                          </div>
                          <div className="placeholder-wave">
                            <span
                              className="placeholder col-12"
                              style={{ height: 38 }}
                            ></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="row g-4">
                    <div className="col-12 col-md-4">
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
                              alt="Profile avatar preview"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <span className="text-muted">
                              <FaUser size={40} />
                            </span>
                          )}
                        </div>
                        <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center align-items-center">
                          <label
                            htmlFor="profile-avatar-input"
                            className="btn btn-outline-primary btn-sm mb-0"
                          >
                            <i className="fas fa-upload me-2" />
                            {avatarPreview ? "Change Photo" : "Upload Photo"}
                          </label>
                          <input
                            id="profile-avatar-input"
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="d-none"
                            onChange={handleAvatarChange}
                            disabled={saving}
                          />
                          {avatarPreview && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={handleAvatarClear}
                              disabled={saving}
                            >
                              <i className="fas fa-trash me-2" />
                              Remove Photo
                            </button>
                          )}
                        </div>
                        <small className="text-muted mt-2">
                          Recommended: square image up to 2MB (JPG, PNG, WebP)
                        </small>
                        {errors.avatar && (
                          <div className="text-danger small mt-2">
                            {errors.avatar}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-12 col-md-8">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
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
                            disabled={saving}
                          />
                          {errors.first_name && (
                            <div className="invalid-feedback">
                              {errors.first_name}
                            </div>
                          )}
                        </div>

                        <div className="col-md-6">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
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
                            disabled={saving}
                          />
                          {errors.last_name && (
                            <div className="invalid-feedback">
                              {errors.last_name}
                            </div>
                          )}
                        </div>

                        <div className="col-md-6">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
                            Username
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="username"
                            value={formData.username}
                            disabled
                            style={{
                              backgroundColor: "#f8f9fa",
                              cursor: "not-allowed",
                            }}
                          />
                          <small className="text-muted">
                            Contact your administrator to change
                          </small>
                        </div>

                        <div className="col-md-6">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
                            Contact Number
                          </label>
                          <div className="input-group">
                            <span className="input-group-text bg-transparent">
                              <FaPhone style={{ color: BRAND.muted }} />
                            </span>
                            <input
                              type="text"
                              className={`form-control ${
                                errors.phone ? "is-invalid" : ""
                              }`}
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              disabled={saving}
                              maxLength={13}
                              placeholder="e.g., 0951-341-9336"
                            />
                          </div>
                          {errors.phone && (
                            <div className="invalid-feedback d-block">
                              {errors.phone}
                            </div>
                          )}
                          <small className="text-muted">
                            Enter 11 digits (e.g., 0951-341-9336)
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 d-flex flex-column flex-md-row gap-3">
                    <button
                      type="submit"
                      className="btn ict-gradient-btn flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                      disabled={saving || !hasChanges}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm"></span>
                          Saving changes...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save"></i>
                          Save Changes
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2"
                      onClick={() => {
                        if (!hasChanges) {
                          setFormData(initialStateRef.current);
                          const avatar = resolveAvatarUrl(accounting);
                          updateAvatarPreview(avatar || "");
                          setAvatarFile(null);
                          setAvatarRemoved(false);
                          setErrors({});
                          return;
                        }
                        loadAccountingProfile();
                      }}
                      disabled={saving}
                    >
                      <i className="fas fa-undo-alt"></i>
                      Reset
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .form-control:focus {
          border-color: ${BRAND.highlight} !important;
          box-shadow: 0 0 0 0.2rem rgba(13, 169, 214, 0.25) !important;
        }
        .form-control.is-invalid {
          border-color: #e74c3c !important;
          box-shadow: 0 0 0 0.2rem rgba(231, 76, 60, 0.15) !important;
        }
      `}</style>
    </div>
  );
};

export default MyProfile;
