// src/services/notificationService.js
import Swal from "sweetalert2";
import { toast } from "react-toastify";

export const showRejectionModal = (userName) => {
  return new Promise((resolve) => {
    // Create modal elements
    const overlay = document.createElement("div");
    const modal = document.createElement("div");
    const textarea = document.createElement("textarea");
    const confirmBtn = document.createElement("button");
    const cancelBtn = document.createElement("button");

    // Overlay styles
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;

    // Modal styles
    modal.style.cssText = `
      background: var(--background-white, #ffffff);
      padding: 1.5rem;
      border-radius: 0.5rem;
      width: 500px;
      max-width: 95vw;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    `;

    // Textarea styles
    textarea.style.cssText = `
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--input-border, #d1d5db);
      border-radius: 0.375rem;
      background-color: var(--input-bg, #ffffff);
      color: var(--input-text, #333);
      resize: vertical;
      min-height: 120px;
      font-family: inherit;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    `;

    // Confirm button styles
    confirmBtn.style.cssText = `
      background-color: #dc3545;
      border: 1px solid #dc3545;
      color: white;
      border-radius: 0.375rem;
      padding: 0.5rem 1.5rem;
      font-weight: 500;
      font-size: 0.875rem;
      margin-left: 0.5rem;
      cursor: not-allowed;
      opacity: 0.6;
    `;

    // Cancel button styles
    cancelBtn.style.cssText = `
      background-color: #6c757d;
      border: 1px solid #6c757d;
      color: white;
      border-radius: 0.375rem;
      padding: 0.5rem 1.5rem;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
    `;

    // Modal content
    modal.innerHTML = `
      <h5 style="margin: 0 0 1rem 0; font-size: 1.25rem; font-weight: 600; color: var(--text-primary, #333);">
        Reject User
      </h5>
      <p style="margin: 0 0 1rem 0; color: var(--text-primary, #333); line-height: 1.5;">
        You are about to reject <strong>${userName}</strong>. 
        Please provide a reason for rejection (minimum 10 characters).
      </p>
      <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary, #333);">
        Rejection Reason <span style="color: #dc3545;">*</span>
      </label>
    `;

    textarea.placeholder = "Please provide a detailed reason for rejection...";
    modal.appendChild(textarea);

    modal.innerHTML += `
      <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted, #6b7280); margin-bottom: 1rem;">
        Minimum 10 characters. This reason will be stored and may be used for communication with the user.
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
        <small style="color: var(--text-muted, #6b7280);" id="charCount">0/10 characters</small>
        <small style="color: var(--text-muted, #6b7280);" id="validationMessage"></small>
      </div>
    `;

    // Buttons container
    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.cssText =
      "display: flex; justify-content: flex-end; margin-top: 1rem;";

    cancelBtn.textContent = "Cancel";
    confirmBtn.textContent = "Confirm Rejection";
    confirmBtn.disabled = true;

    buttonsDiv.appendChild(cancelBtn);
    buttonsDiv.appendChild(confirmBtn);
    modal.appendChild(buttonsDiv);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Character count element
    const charCount = modal.querySelector("#charCount");
    const validationMessage = modal.querySelector("#validationMessage");

    // Validation function
    const validateInput = () => {
      const text = textarea.value.trim();
      const isValid = text.length >= 10;

      charCount.textContent = `${text.length}/10 characters`;

      if (text.length === 0) {
        validationMessage.textContent = "";
        validationMessage.style.color = "var(--text-muted, #6b7280)";
      } else if (text.length < 10) {
        validationMessage.textContent = "Minimum 10 characters required";
        validationMessage.style.color = "#dc3545";
      } else {
        validationMessage.textContent = "Valid reason";
        validationMessage.style.color = "#28a745";
      }

      confirmBtn.disabled = !isValid;
      confirmBtn.style.opacity = isValid ? "1" : "0.6";
      confirmBtn.style.cursor = isValid ? "pointer" : "not-allowed";
    };

    textarea.addEventListener("input", validateInput);

    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve(null);
    });

    confirmBtn.addEventListener("click", () => {
      const reason = textarea.value.trim();
      if (reason.length >= 10) {
        document.body.removeChild(overlay);
        resolve(reason);
      }
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(null);
      }
    });

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const reason = textarea.value.trim();
        if (reason.length >= 10) {
          document.body.removeChild(overlay);
          resolve(reason);
        }
      }
    });

    setTimeout(() => {
      textarea.focus();
      validateInput();
    }, 100);
  });
};

// SweetAlert2 configurations
export const showAlert = {
  prompt: (
    title,
    text,
    confirmButtonText,
    cancelButtonText,
    defaultValue = "",
    inputType = "text"
  ) => {
    return Swal.fire({
      title,
      text,
      input: inputType,
      inputValue: defaultValue,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      customClass: {
        confirmButton: "btn btn-primary",
        cancelButton: "btn btn-secondary",
      },
      buttonsStyling: false,
      preConfirm: (value) => {
        if (!value || value.trim() === "") {
          Swal.showValidationMessage("Please provide a reason");
          return false;
        }
        return value;
      },
    });
  },

  success: (title, text = "", timer = 3000) => {
    return Swal.fire({
      title,
      text,
      icon: "success",
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
      background: "#fff",
      color: "#0E254B",
      iconColor: "#0E254B",
    });
  },

  customSuccess: (title, htmlContent, confirmButtonText = "Okay") => {
    return Swal.fire({
      title,
      html: htmlContent,
      icon: "success",
      confirmButtonText,
      confirmButtonColor: "#0E254B",
      background: "#fff",
      color: "#0E254B",
      customClass: {
        confirmButton: "custom-success-btn",
      },
    });
  },

  error: (title, text = "", timer = 4000) => {
    return Swal.fire({
      title,
      text,
      icon: "error",
      timer,
      timerProgressBar: true,
      background: "#fff",
      color: "#0E254B",
      confirmButtonColor: "#0E254B",
      iconColor: "#dc3545",
    });
  },

  warning: (title, text = "", timer = 3000) => {
    return Swal.fire({
      title,
      text,
      icon: "warning",
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
      background: "#fff",
      color: "#0E254B",
      iconColor: "#ffc107",
    });
  },

  info: (
    title,
    htmlContent = "",
    confirmButtonText = "Close",
    timer = null,
    showCloseButton = true
  ) => {
    return Swal.fire({
      title,
      html: htmlContent,
      icon: null,
      timer: timer,
      timerProgressBar: !!timer,
      showConfirmButton: true,
      confirmButtonText,
      confirmButtonColor: "#0E254B",
      background: "#fff",
      color: "#0E254B",
      width: "450px",
      maxWidth: "95vw",
      padding: "1rem",
      backdrop: true,
      showCloseButton: showCloseButton,
      closeButtonHtml: "&times;",
      customClass: {
        container: "swal2-high-zindex",
        popup: "swal2-avatar-popup",
        title: "swal2-avatar-title",
        htmlContainer: "swal2-avatar-html",
        closeButton: "swal2-close-top",
      },
      didOpen: () => {
        const container = document.querySelector(".swal2-container");
        const popup = document.querySelector(".swal2-popup");
        if (container) container.style.zIndex = "99999";
        if (popup) popup.style.zIndex = "100000";
      },
    });
  },

  confirm: (
    title,
    text = "",
    confirmButtonText = "Yes",
    cancelButtonText = "Cancel"
  ) => {
    return Swal.fire({
      title,
      text,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0E254B",
      cancelButtonColor: "#6c757d",
      confirmButtonText,
      cancelButtonText,
      background: "#fff",
      color: "#0E254B",
      iconColor: "#0E254B",
    });
  },

  loading: (title = "Loading...") => {
    return Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      background: "#fff",
      color: "#0E254B",
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  processing: (title, text) => {
    return Swal.fire({
      title: title,
      text: text,
      icon: "info",
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  close: () => {
    Swal.close();
  },

  html: (title, htmlContent, confirmButtonText = "Close", width = 600) => {
    return Swal.fire({
      title,
      html: htmlContent,
      icon: "info",
      showConfirmButton: true,
      confirmButtonText,
      confirmButtonColor: "#0E254B",
      background: "#fff",
      color: "#0E254B",
      iconColor: "#17a2b8",
      width: `${width}px`,
    });
  },
};

// Toastify configurations
export const showToast = {
  success: (message, autoClose = 3000) => {
    toast.success(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#f8fff9",
        color: "#0E254B",
        border: "1px solid #d4edda",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#0E254B",
      },
    });
  },

  error: (message, autoClose = 4000) => {
    toast.error(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#fff5f5",
        color: "#dc3545",
        border: "1px solid #f8d7da",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#dc3545",
      },
    });
  },

  warning: (message, autoClose = 3000) => {
    toast.warn(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#fffbf0",
        color: "#856404",
        border: "1px solid #ffeaa7",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#ffc107",
      },
    });
  },

  info: (message, autoClose = 3000) => {
    toast.info(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#f0f9ff",
        color: "#0E254B",
        border: "1px solid #e8f0ec",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#0E254B",
      },
    });
  },

  default: (message, autoClose = 3000) => {
    toast(message, {
      position: "top-right",
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: "#f8f9fa",
        color: "#0E254B",
        border: "1px solid #e8f0ec",
        borderRadius: "8px",
        fontWeight: "500",
      },
      progressStyle: {
        background: "#0E254B",
      },
    });
  },
};

// Export ToastContainer for use in App.jsx
export { ToastContainer } from "react-toastify";
