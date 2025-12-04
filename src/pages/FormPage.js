import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./FormPage.css";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://tce-careerpage-cuml.onrender.com";

function FormPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    id: null,
    applicationId: "",
    email: "",
    name: "",
    phone: "",
    applicantType: "",
    department: "",
    ugPercentage: "",
    pgPercentage: "",
    mastersInstitute: "",
    specialization: "",
    phdInstitute: "",
    phdTopic: "",
    phdStatus: "",
    currentInstitution: "",
    jobTitle: "",
    expAcademics: "",
    expIndustry: "",
    journals: "",
    projects: "",
    placementIncharge: "",
    fileKey: "",
    fileName: "",
    file: null
  });

  // Handle input change
  const handleChange = (e) => {
    const { name, value, files, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "file" ? files[0] : value
    }));
  };

  // Prefill on email
  const handleEmailBlur = async () => {
    if (!formData.email) return;

    try {
      const res = await fetch(`${API_BASE}/api/applications/email/${formData.email}`);

      if (!res.ok) return; // no existing record, continue

      const data = await res.json();

      setFormData((prev) => ({
        ...prev,
        ...data,
        id: data.id,
        applicationId: data.applicationId,
        file: null
      }));

      alert(`Existing application found! ID: ${data.applicationId}. You can update it.`);
    } catch (err) {
      console.error("Prefill failed:", err);
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formPayload = new FormData();

      const allowedFields = [
        "email",
        "name",
        "phone",
        "applicantType",
        "department",
        "ugPercentage",
        "pgPercentage",
        "mastersInstitute",
        "specialization",
        "phdInstitute",
        "phdTopic",
        "phdStatus",
        "currentInstitution",
        "jobTitle",
        "expAcademics",
        "expIndustry",
        "journals",
        "projects",
        "placementIncharge"
      ];

      allowedFields.forEach((key) => {
        formPayload.append(key, formData[key] || "");
      });

      if (formData.file) {
        formPayload.append("file", formData.file);
      }

      let response;

      if (formData.id) {
        // UPDATE
        response = await fetch(
          `${API_BASE}/api/applications/id/${formData.id}`,
          {
            method: "PUT",
            body: formPayload
          }
        );
      } else {
        // INSERT
        response = await fetch(`${API_BASE}/api/applications`, {
          method: "POST",
          body: formPayload
        });
      }

      const data = await response.json();

      if (!response.ok) {
        alert("Submission failed: " + data.message);
        return;
      }

      navigate("/thankyou", {
        state: {
          applicationId: data.applicationId || formData.applicationId
        }
      });
    } catch (error) {
      console.error("Submit error:", error);
      alert("Submission failed. Please try again.");
    }
  };

  return (
    <>
      <Navbar />

      <div className="form-container">
        <h2>Thiagarajar College of Engineering</h2>
        <p className="required-note">* Indicates required question</p>

        <form onSubmit={handleSubmit} className="form-grid">

          {/* EMAIL */}
          <label>
            Email *
            <input
              type="email"
              name="email"
              value={formData.email}
              required
              onChange={handleChange}
              onBlur={handleEmailBlur}
              disabled={!!formData.id}
            />
          </label>

          {/* NAME */}
          <label>
            Name *
            <input
              type="text"
              name="name"
              value={formData.name}
              required
              onChange={handleChange}
            />
          </label>

          {/* PHONE */}
          <label>
            Phone no *
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              required
              onChange={handleChange}
            />
          </label>

          {/* Applicant Type */}
          <fieldset>
            <legend>Are you a Fresher or Experienced? *</legend>
            {["Fresher", "Experienced"].map((t) => (
              <label key={t}>
                <input
                  type="radio"
                  name="applicantType"
                  value={t}
                  checked={formData.applicantType === t}
                  required
                  onChange={handleChange}
                />{" "}
                {t}
              </label>
            ))}
          </fieldset>

          {/* Department */}
          <label>
            Department Applied For *
            <select
              name="department"
              value={formData.department}
              required
              onChange={handleChange}
            >
              <option value="">Select Department</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">Mechanical</option>
              <option value="CIVIL">Civil</option>
              <option value="IT">IT</option>
              <option value="Mechatronics">Mechatronics</option>
              <option value="MSc.Data Science">MSc.Data Science</option>
              <option value="CSE AIML">CSE AI/ML</option>
              <option value="CSBS">CSBS</option>
              <option value="MCA">MCA</option>
              <option value="B.Arch">B.Arch</option>
              <option value="B.Des.Interior Design">B.Des.Interior Design</option>
              <option value="M.Plan">M.Plan</option>
            </select>
          </label>

          {/* UG / PG */}
          <label>
            UG Percentage *
            <input
              type="number"
              name="ugPercentage"
              value={formData.ugPercentage}
              required
              onChange={handleChange}
            />
          </label>

          <label>
            PG Percentage *
            <input
              type="number"
              name="pgPercentage"
              value={formData.pgPercentage}
              required
              onChange={handleChange}
            />
          </label>

          {/* Masters */}
          <label>
            Pursued Masters Degree in the Institute *
            <input
              type="text"
              name="mastersInstitute"
              value={formData.mastersInstitute}
              required
              onChange={handleChange}
            />
          </label>

          <label>
            M.E/M.Tech Area of Specialization *
            <input
              type="text"
              name="specialization"
              value={formData.specialization}
              required
              onChange={handleChange}
            />
          </label>

          {/* EXPERIENCED ONLY */}
          {formData.applicantType === "Experienced" && (
            <>
              <label>
                Pursued/Pursuing Ph.D in the Institute
                <input
                  type="text"
                  name="phdInstitute"
                  value={formData.phdInstitute}
                  required
                  onChange={handleChange}
                />
              </label>

              <label>
                Ph.D Research Topic
                <input
                  type="text"
                  name="phdTopic"
                  value={formData.phdTopic}
                  required
                  onChange={handleChange}
                />
              </label>

              <fieldset>
                <legend>Ph.D Status</legend>
                {[
                  "Completed",
                  "Comprehension completed",
                  "Thesis Submitted",
                  "Viva completed",
                  "Other"
                ].map((status) => (
                  <label key={status}>
                    <input
                      type="radio"
                      name="phdStatus"
                      value={status}
                      checked={formData.phdStatus === status}
                      onChange={handleChange}
                    />{" "}
                    {status}
                  </label>
                ))}
              </fieldset>

              <label>
                Name of your Current Institution
                <input
                  type="text"
                  name="currentInstitution"
                  value={formData.currentInstitution}
                  required
                  onChange={handleChange}
                />
              </label>

              <label>
                Current Job Title
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  required
                  onChange={handleChange}
                />
              </label>

              <label>
                Years of Experience (Academics)
                <input
                  type="number"
                  name="expAcademics"
                  value={formData.expAcademics}
                  required
                  onChange={handleChange}
                />
              </label>

              <label>
                Years of Experience (Industry)
                <input
                  type="number"
                  name="expIndustry"
                  value={formData.expIndustry}
                  required
                  onChange={handleChange}
                />
              </label>

              <label>
                No of Journals (SCI/Scopus...)
                <input
                  type="number"
                  name="journals"
                  value={formData.journals}
                  required
                  onChange={handleChange}
                />
              </label>

              <label>
                No of Sponsored R&D Projects
                <input
                  type="number"
                  name="projects"
                  value={formData.projects}
                  required
                  onChange={handleChange}
                />
              </label>

              <fieldset>
                <legend>Have been a Placement In-charge?</legend>
                {["Yes", "No"].map((option) => (
                  <label key={option}>
                    <input
                      type="radio"
                      name="placementIncharge"
                      value={option}
                      checked={formData.placementIncharge === option}
                      required
                      onChange={handleChange}
                    />{" "}
                    {option}
                  </label>
                ))}
              </fieldset>
            </>
          )}

          {/* RESUME */}
          <label>
            Upload Resume (PDF) *

            {formData.id && formData.fileKey && (
              <p>
                📄 Existing Resume:{" "}
                <a
                  href={`${API_BASE}/api/resume/view/${encodeURIComponent(formData.fileKey)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {formData.fileName || "Download"}
                </a>
              </p>
            )}

            <input
              type="file"
              name="file"
              accept="application/pdf"
              required
              onChange={handleChange}
            />
          </label>

          <button className="submit-btn" type="submit">
            {formData.id ? "Update Application" : "Submit Application"}
          </button>
        </form>
      </div>
    </>
  );
}

export default FormPage;
