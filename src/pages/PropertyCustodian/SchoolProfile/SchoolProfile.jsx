import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import { FaSchool, FaMapMarkerAlt, FaPhone, FaEnvelope } from "react-icons/fa";

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

const SchoolProfile = () => {
  const { token } = useAuth();

  const [school, setSchool] = useState(null);
  const [formData, setFormData] = useState({
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
    name: (value) => (value.trim() ? "" : "School name is required"),
    contact_email: (value) =>
      value && !/\S+@\S+\.\S+/.test(value) ? "Invalid email format" : "",
    contact_phone: (value) => {
      if (!value) return "";
      const digits = value.replace(/\D/g, "");
      if (digits.length === 0) return "";
      if (digits.length !== 11) {
        return "Contact number must be exactly 11 digits (e.g., 0951-341-9336)";
      }
      return "";
    },
    website: (value) =>
      value && !/^https?:\/\/\S+/i.test(value)
        ? "Enter a valid URL (https://example.com)"
        : "",
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
      if (cleanFilename.includes("school-avatars/")) {
        cleanFilename = cleanFilename.replace("school-avatars/", "");
      }
      cleanFilename = cleanFilename.split("/").pop();
      return `${baseUrl}/school-avatar/${cleanFilename}`;
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

  const loadSchoolProfile = useCallback(async () => {
    setLoading(true);
    try {
      const apiBase =
        import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/property-custodian/school-profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showAlert.error(
          "School Profile",
          data?.message ||
            "Unable to load your school profile. Please contact your ICT administrator."
        );
        setSchool(null);
        return;
      }

      const fetchedSchool = data.school || data;
      setSchool(fetchedSchool);

      const contactPhone = fetchedSchool.contact_phone
        ? formatContactPhone(fetchedSchool.contact_phone)
        : "";

      const payload = {
        name: fetchedSchool.name || "",
        deped_code: fetchedSchool.deped_code || "",
        region: fetchedSchool.region || "",
        division: fetchedSchool.division || "",
        district: fetchedSchool.district || "",
        address: fetchedSchool.address || "",
        contact_person: fetchedSchool.contact_person || "",
        contact_email: fetchedSchool.contact_email || "",
        contact_phone: contactPhone,
        website: fetchedSchool.website || "",
      };

      setFormData(payload);
      initialStateRef.current = payload;
      setAvatarFile(null);
      setAvatarRemoved(false);
      setHasChanges(false);
      const avatar = resolveAvatarUrl(fetchedSchool);
      updateAvatarPreview(avatar || "");
      setErrors({});
    } catch (error) {
      console.error("Error loading school profile:", error);
      showAlert.error(
        "School Profile",
        "Unable to load your school profile. Please try again later."
      );
      setSchool(null);
    } finally {
      setLoading(false);
    }
  }, [token, resolveAvatarUrl, updateAvatarPreview]);

  useEffect(() => {
    loadSchoolProfile();

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [loadSchoolProfile]);

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "contact_phone") {
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

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "School name is required";
    }

    setErrors(newErrors);
    return newErrors;
  };

  const buildPayload = () => {
    const payload = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (key === "avatar_url") return;
      payload.append(key, value ?? "");
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
      "Update School Profile?",
      "Are you sure you want to update your school profile details?",
      "Save Changes",
      "Cancel"
    );

    if (!confirmation.isConfirmed) return;

    setSaving(true);
    try {
      showAlert.loading(
        "Updating School Profile",
        "Please wait while we save your school details..."
      );

      const apiBase =
        import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/property-custodian/school-profile`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: buildPayload(),
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
            data.message || "Unable to update school profile right now."
          );
        }
        return;
      }

      showToast.success("School profile updated successfully!");
      const updatedSchool = data.school || data;
      setSchool(updatedSchool);

      const contactPhone = updatedSchool.contact_phone
        ? formatContactPhone(updatedSchool.contact_phone)
        : "";

      const payload = {
        name: updatedSchool.name || "",
        deped_code: updatedSchool.deped_code || "",
        region: updatedSchool.region || "",
        division: updatedSchool.division || "",
        district: updatedSchool.district || "",
        address: updatedSchool.address || "",
        contact_person: updatedSchool.contact_person || "",
        contact_email: updatedSchool.contact_email || "",
        contact_phone: contactPhone,
        website: updatedSchool.website || "",
      };

      setFormData(payload);
      initialStateRef.current = payload;
      setAvatarFile(null);
      setAvatarRemoved(false);
      const avatar = resolveAvatarUrl(updatedSchool);
      updateAvatarPreview(avatar || "");
      setHasChanges(false);
    } catch (error) {
      console.error("Update school profile error:", error);
      showAlert.error(
        "Update Failed",
        error.message || "Unable to update school profile right now."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!loading && !school) {
    return (
      <div className="container-fluid px-2 px-md-3 py-4 fadeIn">
        <div className="text-center py-5">
          <h2 className="h4 mb-2" style={{ color: BRAND.primary }}>
            No School Profile Linked
          </h2>
          <p className="text-muted mb-0">
            Your account is not currently linked to a DepEd school. Please
            contact your ICT administrator to configure your school profile.
          </p>
        </div>
      </div>
    );
  }

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
            <FaSchool className="text-white" size={22} />
          </div>
          <div className="text-center text-md-start">
            <h1 className="h3 mb-1 fw-bold" style={{ color: BRAND.primary }}>
              School Profile
            </h1>
            <p className="text-muted mb-0">
              {school?.deped_code || "No DepEd code set"} •{" "}
              {school?.region || "Region not set"}
            </p>
            <small className="text-muted">
              Keep your school information up to date for consistent records.
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
                  <FaMapMarkerAlt style={{ fontSize: "0.9rem" }} />
                </div>
                <div>
                  <h6 className="mb-0 fw-bold" style={{ color: BRAND.primary }}>
                    School Information
                  </h6>
                  <small className="text-muted">
                    This profile is used across your property custodian tools
                    and reports.
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
                      {[1, 2, 3, 4, 5, 6, 7].map((idx) => (
                        <div
                          className={`${
                            idx === 1 || idx === 5 ? "col-12" : "col-md-6"
                          }`}
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
                              alt="School avatar preview"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <span className="text-muted">
                              <FaSchool size={40} />
                            </span>
                          )}
                        </div>
                        <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center align-items-center">
                          <label
                            htmlFor="school-avatar-input"
                            className="btn btn-outline-primary btn-sm mb-0"
                          >
                            <i className="fas fa-upload me-2" />
                            {avatarPreview ? "Change Photo" : "Upload Photo"}
                          </label>
                          <input
                            id="school-avatar-input"
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
                        <div className="col-12">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
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
                            disabled={saving}
                          />
                          {errors.name && (
                            <div className="invalid-feedback">
                              {errors.name}
                            </div>
                          )}
                        </div>

                        <div className="col-md-6">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
                            DepEd School ID
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="deped_code"
                            value={formData.deped_code}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>

                        <div className="col-md-6">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
                            Region
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="region"
                            value={formData.region}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>

                        <div className="col-md-6">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
                            Division
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="division"
                            value={formData.division}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>

                        <div className="col-md-6">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
                            District
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="district"
                            value={formData.district}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>

                        <div className="col-12">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
                            Address
                          </label>
                          <textarea
                            className="form-control"
                            rows="2"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            disabled={saving}
                          ></textarea>
                        </div>

                        <div className="col-md-6">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
                            Contact Person
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="contact_person"
                            value={formData.contact_person}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>

                        <div className="col-md-6">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
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
                            disabled={saving}
                          />
                          {errors.contact_email && (
                            <div className="invalid-feedback">
                              {errors.contact_email}
                            </div>
                          )}
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
                                errors.contact_phone ? "is-invalid" : ""
                              }`}
                              name="contact_phone"
                              value={formData.contact_phone}
                              onChange={handleChange}
                              disabled={saving}
                              maxLength={13}
                              placeholder="e.g., 0951-341-9336"
                            />
                          </div>
                          {errors.contact_phone && (
                            <div className="invalid-feedback d-block">
                              {errors.contact_phone}
                            </div>
                          )}
                          <small className="text-muted">
                            Enter 11 digits (e.g., 0951-341-9336)
                          </small>
                        </div>

                        <div className="col-md-6">
                          <label
                            className="form-label small fw-semibold mb-1"
                            style={{ color: BRAND.primary }}
                          >
                            Website
                          </label>
                          <div className="input-group">
                            <span className="input-group-text bg-transparent">
                              <FaEnvelope style={{ color: BRAND.muted }} />
                            </span>
                            <input
                              type="text"
                              className={`form-control ${
                                errors.website ? "is-invalid" : ""
                              }`}
                              name="website"
                              value={formData.website}
                              onChange={handleChange}
                              disabled={saving}
                              placeholder="https://example.com"
                            />
                          </div>
                          {errors.website && (
                            <div className="invalid-feedback d-block">
                              {errors.website}
                            </div>
                          )}
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
                          const avatar = resolveAvatarUrl(school);
                          updateAvatarPreview(avatar || "");
                          setAvatarFile(null);
                          setAvatarRemoved(false);
                          setErrors({});
                          return;
                        }
                        loadSchoolProfile();
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

export default SchoolProfile;
