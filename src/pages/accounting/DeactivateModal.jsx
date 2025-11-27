// src/pages/accounting/DeactivateModal.jsx

import React, { useState, useEffect } from "react";

import Portal from "../../components/Portal/Portal";

import { showAlert } from "../../services/notificationService";



const DeactivateModal = ({ user, onClose, onDeactivate, loading }) => {

  const [deactivateReason, setDeactivateReason] = useState("");

  const [isClosing, setIsClosing] = useState(false);



  const handleBackdropClick = async (e) => {

    if (e.target === e.currentTarget && !loading) {

      await closeModal();

    }

  };



  const handleEscapeKey = async (e) => {

    if (e.key === "Escape" && !loading) {

      e.preventDefault();

      await closeModal();

    }

  };



  React.useEffect(() => {

    document.addEventListener("keydown", handleEscapeKey);

    

    return () => {

      document.removeEventListener("keydown", handleEscapeKey);

    };

  }, []);



  const handleSubmit = async (e) => {

    e.preventDefault();

    

    if (!deactivateReason.trim()) {

      showAlert.error("Error", "Please provide a reason for deactivation");

      return;

    }



    await onDeactivate(deactivateReason);

  };



  const closeModal = async () => {

    if (loading) return;

    setIsClosing(true);

    // Wait for exit animation to complete

    await new Promise(resolve => setTimeout(resolve, 200));

    onClose();

  };



  const predefinedReasons = [

    "Left the organization",

    "Performance issues",

    "Violation of policies",

    "Position eliminated",

    "Other"

  ];



  const fullName = user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim();



  return (

    <Portal>

      <div 

        className={`modal fade show d-block modal-backdrop-animation ${isClosing ? 'exit' : ''}`}

        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}

        onClick={handleBackdropClick}

        tabIndex="-1"

      >

        <div className="modal-dialog modal-dialog-centered">

          <div 

            className={`modal-content border-0 modal-content-animation ${isClosing ? 'exit' : ''}`}

            style={{ 

              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",

            }}

          >

            {/* Header */}

            <div 
              className="modal-header border-0 text-white modal-smooth"
              style={{ backgroundColor: "#0E254B" }}
            >

              <h5 className="modal-title fw-bold">

                <i className="fas fa-user-slash me-2"></i>

                Deactivate Accounting

              </h5>

              <button 

                type="button" 

                className="btn-close btn-close-white btn-smooth"

                onClick={closeModal}

                aria-label="Close"

                disabled={loading}

              ></button>

            </div>

            

            <form onSubmit={handleSubmit}>

              {/* Modal Body with grey background */}

              <div 

                className="modal-body modal-smooth"

                style={{

                  backgroundColor: "#f8f9fa",

                }}

              >

                <div className="alert alert-warning border-0">

                  <i className="fas fa-exclamation-triangle me-2"></i>

                  You are about to deactivate <strong>{fullName}</strong>'s account.

                </div>



                <div className="mb-3">

                  <label className="form-label small fw-semibold text-dark mb-1">

                    Reason for Deactivation <span className="text-danger">*</span>

                  </label>

                  

                  <div className="mb-3">

                    {predefinedReasons.map((reason) => (

                      <button

                        key={reason}

                        type="button"

                        className="btn btn-outline-secondary btn-sm me-2 mb-2 btn-smooth"

                        onClick={() => setDeactivateReason(reason)}

                        disabled={loading}

                      >

                        {reason}

                      </button>

                    ))}

                  </div>



                  <textarea

                    className="form-control modal-smooth"

                    rows="4"

                    placeholder="Please provide a detailed reason for deactivation..."

                    value={deactivateReason}

                    onChange={(e) => setDeactivateReason(e.target.value)}

                    required

                    disabled={loading}

                    style={{ backgroundColor: "#ffffff" }}

                  />

                  <div className="form-text">

                    This reason will be recorded and may be used for reporting purposes.

                  </div>

                </div>



                <div className="alert alert-info border-0">

                  <i className="fas fa-info-circle me-2"></i>

                  <strong>Note:</strong> Deactivated accounts can be reactivated later. 

                  The accounting member will lose access to the system until reactivated.

                </div>

              </div>

              

              {/* Footer */}

              <div className="modal-footer border-top bg-white modal-smooth">

                <button 

                  type="button" 

                  className="btn btn-outline-secondary btn-smooth"

                  onClick={closeModal}

                  disabled={loading}

                  style={{ minWidth: "100px" }}

                >

                  Cancel

                </button>

                <button 

                  type="submit" 

                  className="btn fw-semibold position-relative btn-smooth"

                  disabled={loading || !deactivateReason.trim()}

                  style={{

                    backgroundColor: loading ? "#6c757d" : "#dc3545",

                    borderColor: loading ? "#6c757d" : "#dc3545",

                    color: "white",

                    minWidth: "160px"

                  }}

                >

                  {loading ? (

                    <>

                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>

                      Deactivating...

                    </>

                  ) : (

                    <>

                      <i className="fas fa-user-slash me-2"></i>

                      Deactivate Accounting

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



export default DeactivateModal;

