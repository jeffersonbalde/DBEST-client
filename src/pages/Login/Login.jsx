import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
} from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import { showAlert, showToast } from "../../services/notificationService";
import loginBackground from "../../assets/loginbg.png";
import logo from "../../assets/logo.png";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Theme variables
  const theme = {
    primary: "#0E254B",
    primaryDark: "#0a1d3a",
    primaryLight: "#0E254B",
    textPrimary: "#0E254B",
    textSecondary: "#4a5c4a",
    backgroundLight: "#F4F8FC",
    backgroundWhite: "#ffffff",
    borderColor: "#e0e6e0",
  };

  useEffect(() => {
    const img = new Image();
    img.src = loginBackground;
    img.onload = () => setBackgroundLoaded(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password) {
      showAlert.error("Validation Error", "Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const loadingAlert = showAlert.loading("Signing you in...");

      const result = await login(form.username, form.password);

      showAlert.close();

      if (result.success) {
        showToast.success(`Welcome back, ${result.user.first_name}!`);

        setTimeout(() => {
          navigate(`/dashboard/${result.user_type}`);
        }, 1500);
      } else {
        showAlert.error(
          "Login Failed",
          result.error || "Please check your credentials and try again."
        );
      }
    } catch (error) {
      showAlert.close();
      showAlert.error(
        "Connection Error",
        "Unable to connect to the server. Please check your internet connection and try again."
      );
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-vh-100 d-flex position-relative">
      {/* Left Side - Background Image */}
      <div
        className="d-none d-lg-flex col-lg-8 position-relative"
        style={{
          minHeight: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Background Image with Blur Effect */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            backgroundImage: `url(${loginBackground})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            filter: backgroundLoaded ? "blur(0px)" : "blur(10px)",
            transition: "filter 0.5s ease-in-out",
          }}
        />
      </div>

      {/* Right Side - Login Form */}
      <div
        className="col-12 col-lg-4 d-flex align-items-center justify-content-center p-4 p-lg-5"
        style={{ backgroundColor: "#F4F8FC" }}
      >
        <div
          className="w-100"
          style={{
            maxWidth: "420px",
            animation: "fadeIn 0.6s ease-in-out",
          }}
        >
          {/* Logo Section */}
          <div className="text-center mb-4">
            <div className="d-flex align-items-center justify-content-center mx-auto mb-3">
              <img
                src={logo}
                alt="DBEST Logo"
                style={{
                  width: "250px",
                  height: "250px",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>

          {/* Title */}
          <h5
            className="text-center fw-bolder fs-4 mb-4"
            style={{
              color: "#0E254B",
            }}
          >
            Log in to your account
          </h5>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Username */}
            <label
              htmlFor="username"
              className="mb-1 fw-semibold"
              style={{ fontSize: ".9rem", color: "#0E254B" }}
            >
              Username
            </label>
            <div className="mb-3 position-relative">
              <FaUser
                className="position-absolute top-50 translate-middle-y text-muted ms-3"
                size={16}
              />
              <input
                type="text"
                name="username"
                className="form-control ps-5 fw-semibold"
                placeholder="Username"
                value={form.username}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                style={{
                  backgroundColor: "var(--input-bg, #ffffff)",
                  color: "var(--input-text, #333)",
                  border: "1px solid var(--input-border, #d1d5db)",
                }}
                id="username"
              />
            </div>

            {/* Password */}
            <label
              htmlFor="password"
              className="mb-1 fw-semibold"
              style={{ fontSize: ".9rem", color: "#0E254B" }}
            >
              Password
            </label>
            <div className="mb-3 position-relative">
              <FaLock
                className="position-absolute top-50 translate-middle-y text-muted ms-3"
                size={16}
              />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="form-control ps-5 pe-5 fw-semibold"
                placeholder="Password"
                value={form.password}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                style={{
                  backgroundColor: "var(--input-bg, #ffffff)",
                  color: "var(--input-text, #333)",
                  border: "1px solid var(--input-border, #d1d5db)",
                }}
                id="password"
              />
              <span
                onClick={() => !isSubmitting && setShowPassword(!showPassword)}
                className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                style={{ cursor: isSubmitting ? "not-allowed" : "pointer" }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            {/* Forgot Password */}
            <div className="text-end mb-3" style={{ marginTop: "-10px" }}>
              <a
                href="#"
                className="text-decoration-none small fw-semibold"
                style={{ color: "#0E254B" }}
                onClick={(e) => {
                  e.preventDefault();
                  showAlert.info(
                    "Forgot Password?",
                    "Please contact your administrator to reset your password."
                  );
                }}
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-login w-100 py-2 fw-semibold shadow-sm d-flex align-items-center justify-content-center"
              disabled={isSubmitting}
              style={{
                backgroundColor: "#0E254B",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                transition: "all 0.3s ease",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onMouseOver={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = "#0a1d3a";
                  e.target.style.transform = "translateY(-2px)";
                }
              }}
              onMouseOut={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = "#0E254B";
                  e.target.style.transform = "translateY(0)";
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="spinner me-2" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .form-control:focus {
          border-color: #0E254B;
          box-shadow: 0 0 0 0.2rem rgba(14, 37, 75, 0.25);
          outline: none;
        }

        .form-control:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 991px) {
          .min-vh-100 {
            background-image: url(${loginBackground});
            background-size: cover;
            background-position: center;
          }
        }
      `}</style>
    </div>
  );
}
