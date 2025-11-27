import { Link, useNavigate } from "react-router-dom";
import { FaHome, FaArrowLeft, FaCompass } from "react-icons/fa";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light fadeIn">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            {/* Minimalist Card */}
            <div className="text-center px-4">
              {/* Icon */}
              <div className="mb-4">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: "64px",
                    height: "64px",
                    background: "var(--background-white)",
                    border: "1.5px solid var(--border-color)",
                    color: "var(--text-muted)",
                  }}
                >
                  <FaCompass size={24} />
                </div>
              </div>

              {/* Content */}
              <div className="mb-5">
                <h1
                  className="display-3 fw-bold mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  404
                </h1>
                <h2
                  className="h5 fw-semibold mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  Page Not Found
                </h2>
                <p className="mb-0" style={{ color: "var(--text-secondary)" }}>
                  The page you're looking for doesn't exist or has been moved.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 mb-5">
                <button
                  onClick={() => navigate(-1)}
                  className="btn d-flex align-items-center justify-content-center gap-2"
                  style={{
                    background: "var(--background-white)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    padding: "0.5rem 1rem",
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.background = "var(--background-light)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.background = "var(--background-white)";
                  }}
                >
                  <FaArrowLeft size={14} />
                  Go Back
                </button>

                <Link
                  to="/login"
                  className="btn d-flex align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{
                    background: "var(--primary-color)",
                    color: "var(--btn-primary-text)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.5rem 1rem",
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.background = "var(--primary-dark)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.background = "var(--primary-color)";
                  }}
                >
                  <FaHome size={14} />
                  Go Home
                </Link>
              </div>

              {/* Support Link */}
              <div
                className="border-top pt-3"
                style={{ borderColor: "var(--border-color) !important" }}
              >
                <a
                  href="mailto:support@dbest.com"
                  className="small text-decoration-none"
                  style={{ color: "var(--text-muted)" }}
                >
                  Contact support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

