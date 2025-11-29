import React, { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import {
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaKey,
  FaArrowRight,
  FaShieldAlt,
  FaUser,
} from "react-icons/fa";

const BRAND = {
  primary: "#0E254B",
  accent: "#1B5F9D",
  highlight: "#0DA9D6",
  muted: "#6b7c93",
};

const AccountSettings = () => {
  const { user, token, refreshUserData } = useAuth();

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
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
      setFormErrors(errors);
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

    setIsPasswordLoading(true);

    try {
      const apiBase =
        import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/accounting/settings/change-password`,
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

        setPasswordForm({
          current_password: "",
          new_password: "",
          new_password_confirmation: "",
        });
        setFormErrors({});

        setTimeout(() => {
          showAlert.success(
            "Password Updated",
            "Your password has been updated successfully."
          );
        }, 400);

        await refreshUserData?.();
      } else {
        if (data?.errors) {
          setFormErrors(data.errors);
          const errorMessages = Object.values(data.errors).flat().join("\n");
          showAlert.error("Password Change Failed", errorMessages);
        } else {
          showAlert.error(
            "Password Change Failed",
            data?.message || "An unknown error occurred."
          );
        }
      }
    } catch (error) {
      console.error("Password change error:", error);
      showAlert.close();
      showAlert.error(
        "Network Error",
        "Unable to reach the server. Please try again shortly."
      );
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const renderPasswordField = ({
    label,
    name,
    value,
    showValue,
    onToggle,
    placeholder,
    error,
    isRequired = true,
  }) => (
    <div className="col-12 col-md-6">
      <label
        className="form-label small fw-semibold mb-2"
        style={{ color: BRAND.primary }}
      >
        {label} {isRequired && "*"}
      </label>
      <div className="input-group">
        <span
          className="input-group-text bg-transparent border-end-0"
          style={{
            borderColor: error ? "#e74c3c" : "#d5d9e8",
          }}
        >
          <FaLock style={{ color: error ? "#e74c3c" : BRAND.muted }} />
        </span>
        <input
          type={showValue ? "text" : "password"}
          name={name}
          className={`form-control border-start-0 ps-2 fw-semibold ${
            error ? "is-invalid" : ""
          }`}
          style={{
            backgroundColor: "#ffffff",
            color: BRAND.primary,
            borderColor: error ? "#e74c3c" : "#d5d9e8",
          }}
          value={value}
          onChange={handlePasswordInputChange}
          placeholder={placeholder}
          disabled={isPasswordLoading}
          required={isRequired}
        />
        <span
          className="input-group-text bg-transparent border-start-0"
          style={{
            borderColor: error ? "#e74c3c" : "#d5d9e8",
          }}
        >
          <button
            type="button"
            className="btn btn-sm p-0 border-0 bg-transparent"
            style={{ color: error ? "#e74c3c" : BRAND.muted }}
            onClick={onToggle}
            disabled={isPasswordLoading}
          >
            {showValue ? (
              <FaEyeSlash style={{ fontSize: "0.875rem" }} />
            ) : (
              <FaEye style={{ fontSize: "0.875rem" }} />
            )}
          </button>
        </span>
      </div>
      {error && (
        <div className="invalid-feedback d-block small mt-1">{error[0]}</div>
      )}
    </div>
  );

  const displayName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Accounting"
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
            <FaShieldAlt className="text-white" size={22} />
          </div>
          <div className="text-center text-md-start">
            <h1 className="h3 mb-1 fw-bold" style={{ color: BRAND.primary }}>
              Account Settings
            </h1>
            <p className="text-muted mb-0">
              {displayName} • Password management
            </p>
            <small className="text-muted">
              Update your account password securely
            </small>
          </div>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-12 col-lg-9">
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
                  <FaLock style={{ fontSize: "0.9rem" }} />
                </div>
                <div>
                  <h6 className="mb-0 fw-bold" style={{ color: BRAND.primary }}>
                    Change Password
                  </h6>
                  <small className="text-muted">
                    Update your account password
                  </small>
                </div>
              </div>
            </div>

            <div className="card-body p-4">
              <div
                className="alert border-0 mb-4"
                style={{
                  backgroundColor: "rgba(14,37,75,0.08)",
                  borderColor: "rgba(14,37,75,0.15)",
                  color: BRAND.primary,
                }}
              >
                <strong>Security Note:</strong> For profile information updates,
                please visit the{" "}
                <a
                  href="/accounting/profile"
                  style={{ color: BRAND.highlight, textDecoration: "none" }}
                >
                  My Profile
                </a>{" "}
                page. Only password changes are available here.
              </div>

              <form onSubmit={handlePasswordChange}>
                <div className="row g-3">
                  <div className="col-12">
                    <label
                      className="form-label small fw-semibold mb-2"
                      style={{ color: BRAND.primary }}
                    >
                      Current Password *
                    </label>
                    <div className="input-group">
                      <span
                        className="input-group-text bg-transparent border-end-0"
                        style={{
                          borderColor: formErrors.current_password
                            ? "#e74c3c"
                            : "#d5d9e8",
                        }}
                      >
                        <FaLock
                          style={{
                            color: formErrors.current_password
                              ? "#e74c3c"
                              : BRAND.muted,
                          }}
                        />
                      </span>
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        name="current_password"
                        className={`form-control border-start-0 ps-2 fw-semibold ${
                          formErrors.current_password ? "is-invalid" : ""
                        }`}
                        style={{
                          backgroundColor: "#ffffff",
                          color: BRAND.primary,
                          borderColor: formErrors.current_password
                            ? "#e74c3c"
                            : "#d5d9e8",
                        }}
                        value={passwordForm.current_password}
                        onChange={handlePasswordInputChange}
                        placeholder="Enter current password"
                        disabled={isPasswordLoading}
                        required
                      />
                      <span
                        className="input-group-text bg-transparent border-start-0"
                        style={{
                          borderColor: formErrors.current_password
                            ? "#e74c3c"
                            : "#d5d9e8",
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-sm p-0 border-0 bg-transparent"
                          style={{
                            color: formErrors.current_password
                              ? "#e74c3c"
                              : BRAND.muted,
                          }}
                          onClick={() =>
                            setShowCurrentPassword((prev) => !prev)
                          }
                          disabled={isPasswordLoading}
                        >
                          {showCurrentPassword ? (
                            <FaEyeSlash style={{ fontSize: "0.875rem" }} />
                          ) : (
                            <FaEye style={{ fontSize: "0.875rem" }} />
                          )}
                        </button>
                      </span>
                    </div>
                    {formErrors.current_password && (
                      <div className="invalid-feedback d-block small mt-1">
                        {formErrors.current_password[0]}
                      </div>
                    )}
                  </div>

                  {renderPasswordField({
                    label: "New Password",
                    name: "new_password",
                    value: passwordForm.new_password,
                    showValue: showNewPassword,
                    onToggle: () => setShowNewPassword((prev) => !prev),
                    placeholder: "Enter new password (min. 8 characters)",
                    error: formErrors.new_password,
                  })}

                  {renderPasswordField({
                    label: "Confirm New Password",
                    name: "new_password_confirmation",
                    value: passwordForm.new_password_confirmation,
                    showValue: showConfirmPassword,
                    onToggle: () => setShowConfirmPassword((prev) => !prev),
                    placeholder: "Confirm new password",
                    error: formErrors.new_password_confirmation,
                  })}
                </div>

                <div className="mt-4 d-flex flex-column flex-md-row gap-3">
                  <button
                    type="submit"
                    className="btn ict-gradient-btn flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                    disabled={isPasswordLoading}
                  >
                    {isPasswordLoading ? (
                      <>
                        <FaSpinner className="fa-spin" />
                        Securing credentials...
                      </>
                    ) : (
                      <>
                        <FaKey />
                        Update Password
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2"
                    onClick={() => {
                      setPasswordForm({
                        current_password: "",
                        new_password: "",
                        new_password_confirmation: "",
                      });
                      setFormErrors({});
                    }}
                    disabled={isPasswordLoading}
                  >
                    <FaArrowRight />
                    Reset Form
                  </button>
                </div>
              </form>
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

export default AccountSettings;
