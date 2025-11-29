import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import Portal from "../../../components/Portal/Portal";

const BRAND = {
  primary: "#0E254B",
  accent: "#1B5F9D",
  highlight: "#0DA9D6",
  muted: "#6b7c93",
};

const DEFAULT_PROFILE = {
  username: "",
  first_name: "",
  last_name: "",
  phone: "",
};

const DEFAULT_PASSWORD = {
  current_password: "",
  new_password: "",
  new_password_confirmation: "",
};

const Settings = () => {
  const { user, token, refreshUserData } = useAuth();

  const [profileForm, setProfileForm] = useState(DEFAULT_PROFILE);
  const [passwordForm, setPasswordForm] = useState(DEFAULT_PASSWORD);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const resolveAvatarUrl = useCallback((entity) => {
    if (!entity || !entity.avatar_path) return "";
    const baseUrl = import.meta.env.VITE_LARAVEL_API;
    let cleanFilename = entity.avatar_path;
    if (cleanFilename.includes("avatars/")) {
      cleanFilename = cleanFilename.replace("avatars/", "");
    }
    cleanFilename = cleanFilename.split("/").pop();
    return `${baseUrl}/custodian-avatar/${cleanFilename}`;
  }, []);

  // Ensure settings always load the latest profile data from the server,
  // independent of when AuthContext finishes its own fetch.
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;

      setInitialLoading(true);

      try {
        const apiBase =
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
        const response = await fetch(`${apiBase}/property-custodian/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const profile = data || {};

        setProfileForm({
          username: profile.username || "",
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          phone: profile.phone || "",
        });
        setAvatarFile(null);
        setAvatarRemoved(false);
        setAvatarPreview(resolveAvatarUrl(profile) || "");
      } catch (error) {
        console.error("Failed to load property custodian profile:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadProfile();
  }, [token, resolveAvatarUrl]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
    if (profileErrors[name]) {
      setProfileErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast.error("Only image files are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast.error("Max avatar size is 2 MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarRemoved(false);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarRemove = () => {
    setAvatarFile(null);
    setAvatarRemoved(true);
    setAvatarPreview("");
  };

  const validateProfile = () => {
    const errors = {};
    if (!profileForm.username.trim()) {
      errors.username = "Username is required.";
    }
    if (!profileForm.first_name.trim()) {
      errors.first_name = "First name is required.";
    }
    if (!profileForm.last_name.trim()) {
      errors.last_name = "Last name is required.";
    }
    setProfileErrors(errors);
    return errors;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const errors = validateProfile();
    if (Object.keys(errors).length > 0) {
      showAlert.error("Validation Error", "Please check the form for errors.");
      return;
    }

    const confirmation = await showAlert.confirm(
      "Update Profile",
      "Are you sure you want to update your account information?",
      "Yes, Update",
      "Cancel"
    );
    if (!confirmation.isConfirmed) return;

    setLoadingProfile(true);
    showAlert.loading(
      "Updating Profile...",
      "Please wait while we update your account information."
    );

    try {
      const formData = new FormData();
      Object.entries(profileForm).forEach(([key, value]) => {
        formData.append(key, value ?? "");
      });
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }
      if (avatarRemoved && !avatarFile) {
        formData.append("remove_avatar", "1");
      }

      const response = await fetch(
        `${import.meta.env.VITE_LARAVEL_API}/property-custodian/profile`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: formData,
        }
      );

      const data = await response.json();
      showAlert.close();

      if (response.ok) {
        showToast.success("Profile updated successfully!");
        await refreshUserData?.();
      } else {
        if (data?.errors) {
          setProfileErrors(data.errors);
        }
        showAlert.error(
          "Update Failed",
          data?.message || "Unable to update profile."
        );
      }
    } catch (error) {
      console.error("Property custodian profile update error:", error);
      showAlert.close();
      showAlert.error(
        "Network Error",
        "Unable to reach the server. Please try again shortly."
      );
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordForm.current_password) {
      errors.current_password = ["Current password is required."];
    }
    if (!passwordForm.new_password) {
      errors.new_password = ["New password is required."];
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = ["Password must be at least 8 characters long."];
    }
    if (!passwordForm.new_password_confirmation) {
      errors.new_password_confirmation = ["Please confirm your new password."];
    } else if (
      passwordForm.new_password !== passwordForm.new_password_confirmation
    ) {
      errors.new_password_confirmation = ["Passwords do not match."];
    }

    return errors;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    const errors = validatePasswordForm();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      showAlert.error("Validation Error", "Please check the form for errors.");
      return;
    }

    const confirmation = await showAlert.confirm(
      "Change Password",
      "Are you sure you want to update your password?",
      "Yes, Change Password",
      "Cancel"
    );
    if (!confirmation.isConfirmed) return;

    showAlert.loading(
      "Updating Password...",
      "Please wait while we securely update your credentials."
    );

    setLoadingPassword(true);

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_LARAVEL_API
        }/property-custodian/settings/change-password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify({
            current_password: passwordForm.current_password,
            new_password: passwordForm.new_password,
            new_password_confirmation: passwordForm.new_password_confirmation,
          }),
        }
      );

      const data = await response.json();
      showAlert.close();

      if (response.ok) {
        showToast.success("Password changed successfully!");
        setPasswordForm(DEFAULT_PASSWORD);
        setPasswordErrors({});
        await refreshUserData?.();
      } else {
        if (data?.errors) {
          setPasswordErrors(data.errors);
        }
        const errorMessages = data?.errors
          ? Object.values(data.errors).flat().join("\n")
          : data?.message || "An unknown error occurred.";
        showAlert.error("Password Change Failed", errorMessages);
      }
    } catch (error) {
      console.error("Property custodian password change error:", error);
      showAlert.close();
      showAlert.error(
        "Network Error",
        "Unable to reach the server. Please try again shortly."
      );
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="container-fluid px-2 px-md-3 py-4 fadeIn">
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
            <i className="fas fa-user-shield text-white" />
          </div>
          <div className="text-center text-md-start">
            <h1 className="h3 mb-1 fw-bold" style={{ color: BRAND.primary }}>
              Account Settings
            </h1>
            <p className="text-muted mb-0">
              {user?.email || "No email provided"} • Property Custodian
            </p>
            <small className="text-muted">
              Update your profile information, avatar, and password
            </small>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div
            className="card border-0"
            style={{
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
              borderRadius: "16px",
            }}
          >
            <div className="card-header bg-transparent border-0 py-3 px-4">
              <h6 className="mb-0 fw-bold" style={{ color: BRAND.primary }}>
                Profile & Avatar
              </h6>
              <small className="text-muted">
                Keep your personal account information accurate and up-to-date
              </small>
            </div>
            <div className="card-body p-4">
              {initialLoading ? (
                <div className="row g-3">
                  <div className="col-12 text-center mb-2">
                    <div
                      className="placeholder-wave mb-2 mx-auto rounded-circle"
                      style={{
                        width: 120,
                        height: 120,
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
                    <div className="placeholder-wave mb-2 w-50 mx-auto">
                      <span
                        className="placeholder col-12"
                        style={{ height: 12, borderRadius: 999 }}
                      ></span>
                    </div>
                  </div>
                  {[1, 2, 3, 4].map((idx) => (
                    <div className="col-12" key={idx}>
                      <div className="placeholder-wave mb-1">
                        <span
                          className="placeholder col-4"
                          style={{ height: 12 }}
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
              ) : (
                <form onSubmit={handleProfileSubmit}>
                  <div className="text-center mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center mb-2 mx-auto"
                      style={{
                        width: 120,
                        height: 120,
                        borderRadius: "50%",
                        border: "4px solid #e4e7ef",
                        backgroundColor: "#f4f6fb",
                        overflow: "hidden",
                      }}
                    >
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar"
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
                    <div className="d-flex justify-content-center gap-2">
                      <label className="btn btn-outline-primary btn-sm mb-0">
                        <i className="fas fa-upload me-1" />
                        {avatarPreview ? "Change Photo" : "Upload Photo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="d-none"
                          onChange={handleAvatarChange}
                          disabled={loadingProfile}
                        />
                      </label>
                      {avatarPreview && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={handleAvatarRemove}
                          disabled={loadingProfile}
                        >
                          <i className="fas fa-trash me-1" />
                          Remove
                        </button>
                      )}
                    </div>
                    <small className="text-muted d-block mt-1">
                      Recommended: square image up to 2MB (JPG, PNG, GIF, WebP)
                    </small>
                  </div>

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        name="username"
                        className={`form-control ${
                          profileErrors.username ? "is-invalid" : ""
                        }`}
                        value={profileForm.username}
                        onChange={handleProfileChange}
                        disabled={loadingProfile}
                      />
                      {profileErrors.username && (
                        <div className="invalid-feedback">
                          {profileErrors.username}
                        </div>
                      )}
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        className={`form-control ${
                          profileErrors.first_name ? "is-invalid" : ""
                        }`}
                        value={profileForm.first_name}
                        onChange={handleProfileChange}
                        disabled={loadingProfile}
                      />
                      {profileErrors.first_name && (
                        <div className="invalid-feedback">
                          {profileErrors.first_name}
                        </div>
                      )}
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        className={`form-control ${
                          profileErrors.last_name ? "is-invalid" : ""
                        }`}
                        value={profileForm.last_name}
                        onChange={handleProfileChange}
                        disabled={loadingProfile}
                      />
                      {profileErrors.last_name && (
                        <div className="invalid-feedback">
                          {profileErrors.last_name}
                        </div>
                      )}
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        Contact Number
                      </label>
                      <input
                        type="text"
                        name="phone"
                        className="form-control"
                        value={profileForm.phone}
                        onChange={handleProfileChange}
                        disabled={loadingProfile}
                      />
                    </div>
                  </div>

                  <div className="mt-3 d-flex gap-2 justify-content-end">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        if (!user) return;
                        setProfileForm({
                          username: user.username || "",
                          first_name: user.first_name || "",
                          last_name: user.last_name || "",
                          phone: user.phone || "",
                        });
                        setProfileErrors({});
                        setAvatarFile(null);
                        setAvatarRemoved(false);
                        setAvatarPreview(resolveAvatarUrl(user) || "");
                      }}
                      disabled={loadingProfile}
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      style={{
                        backgroundColor: BRAND.primary,
                        borderColor: BRAND.primary,
                      }}
                      disabled={loadingProfile}
                    >
                      {loadingProfile ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-1" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div
            className="card border-0"
            style={{
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
              borderRadius: "16px",
            }}
          >
            <div className="card-header bg-transparent border-0 py-3 px-4">
              <h6 className="mb-0 fw-bold" style={{ color: BRAND.primary }}>
                Change Password
              </h6>
              <small className="text-muted">
                Protect your account with a strong password
              </small>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handlePasswordChange}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold mb-1">
                    Current Password
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent border-end-0">
                      <i className="fas fa-lock" />
                    </span>
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      name="current_password"
                      className={`form-control border-start-0 ps-2 ${
                        passwordErrors.current_password ? "is-invalid" : ""
                      }`}
                      value={passwordForm.current_password}
                      onChange={handlePasswordInputChange}
                      disabled={loadingPassword}
                    />
                    <span className="input-group-text bg-transparent border-start-0">
                      <button
                        type="button"
                        className="btn btn-sm p-0 border-0 bg-transparent"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        disabled={loadingPassword}
                      >
                        <i
                          className={`fas ${
                            showCurrentPassword ? "fa-eye-slash" : "fa-eye"
                          }`}
                        />
                      </button>
                    </span>
                  </div>
                  {passwordErrors.current_password && (
                    <div className="invalid-feedback d-block small">
                      {passwordErrors.current_password[0] ||
                        passwordErrors.current_password}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold mb-1">
                    New Password
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent border-end-0">
                      <i className="fas fa-lock" />
                    </span>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="new_password"
                      className={`form-control border-start-0 ps-2 ${
                        passwordErrors.new_password ? "is-invalid" : ""
                      }`}
                      value={passwordForm.new_password}
                      onChange={handlePasswordInputChange}
                      disabled={loadingPassword}
                    />
                    <span className="input-group-text bg-transparent border-start-0">
                      <button
                        type="button"
                        className="btn btn-sm p-0 border-0 bg-transparent"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        disabled={loadingPassword}
                      >
                        <i
                          className={`fas ${
                            showNewPassword ? "fa-eye-slash" : "fa-eye"
                          }`}
                        />
                      </button>
                    </span>
                  </div>
                  {passwordErrors.new_password && (
                    <div className="invalid-feedback d-block small">
                      {passwordErrors.new_password[0] ||
                        passwordErrors.new_password}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold mb-1">
                    Confirm New Password
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent border-end-0">
                      <i className="fas fa-lock" />
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="new_password_confirmation"
                      className={`form-control border-start-0 ps-2 ${
                        passwordErrors.new_password_confirmation
                          ? "is-invalid"
                          : ""
                      }`}
                      value={passwordForm.new_password_confirmation}
                      onChange={handlePasswordInputChange}
                      disabled={loadingPassword}
                    />
                    <span className="input-group-text bg-transparent border-start-0">
                      <button
                        type="button"
                        className="btn btn-sm p-0 border-0 bg-transparent"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        disabled={loadingPassword}
                      >
                        <i
                          className={`fas ${
                            showConfirmPassword ? "fa-eye-slash" : "fa-eye"
                          }`}
                        />
                      </button>
                    </span>
                  </div>
                  {passwordErrors.new_password_confirmation && (
                    <div className="invalid-feedback d-block small">
                      {passwordErrors.new_password_confirmation[0] ||
                        passwordErrors.new_password_confirmation}
                    </div>
                  )}
                </div>

                <div className="mt-3 d-flex gap-2 justify-content-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      setPasswordForm(DEFAULT_PASSWORD);
                      setPasswordErrors({});
                    }}
                    disabled={loadingPassword}
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{
                      backgroundColor: BRAND.primary,
                      borderColor: BRAND.primary,
                    }}
                    disabled={loadingPassword}
                  >
                    {loadingPassword ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-key me-1" />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
