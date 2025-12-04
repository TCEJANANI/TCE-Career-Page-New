import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useContext,
} from "react";

import axios from "axios";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../AuthContext";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar";
import FilterDropdown from "./FilterDropdown";
import SubmissionsTable from "./SubmissionsTable";
import SubmissionModal from "./SubmissionModal";

import "./AdminDashboard.css";

const API_BASE = "https://tce-careerpage-cuml.onrender.com/api/applications";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useContext(AuthContext);

  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [spec, setSpec] = useState("");
  const [phdStatus, setPhdStatus] = useState("");
  const [placementIncharge, setPlacementIncharge] = useState("");
  const [applicantType, setApplicantType] = useState("");

  const [ugRange, setUgRange] = useState([0, 100]);
  const [pgRange, setPgRange] = useState([0, 100]);
  const [scoreRange, setScoreRange] = useState([0, 100]);
  const [rankRange, setRankRange] = useState([0, 9999]);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [loadingData, setLoadingData] = useState(false);
  const [activeRow, setActiveRow] = useState(null);

  // ⭐ Logout (Firebase + LocalStorage)
  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("tce_admin_token");
    navigate("/admin-login");
  };

  // 🔐 **Auth Check — redirect to login**
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin-login");
    }
  }, [user, authLoading, navigate]);

  // 🔹 Dropdown options
  const departmentOptions = useMemo(
    () => [
      "",
      "CSE",
      "IT",
      "ECE",
      "EEE",
      "MECH",
      "CIVIL",
      "Mechatronics",
      "MSc.Data Science",
      "CSE AIML",
      "CSBS",
      "MCA",
      "B.Arch",
      "B.Des.Interior Design",
      "M.Plan",
    ],
    []
  );

  const specializationOptions = useMemo(
    () => [
      "",
      "Network Security",
      "Machine Learning",
      "AI",
      "VLSI",
      "Power Systems",
      "Thermal",
      "Structural",
    ],
    []
  );

  const phdOptions = useMemo(() => ["", "Completed", "Pursuing"], []);
  const placementOptions = useMemo(() => ["", "Yes", "No"], []);
  const applicantTypes = useMemo(() => ["", "Fresher", "Experienced"], []);

  // ⭐ Load available years
  useEffect(() => {
    async function loadYears() {
      try {
        const token = localStorage.getItem("tce_admin_token");

        const { data } = await axios.get(`${API_BASE}/years`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setYears(data.years || []);
        if (data.years?.length) {
          setSelectedYear(data.years[data.years.length - 1]);
        }
      } catch (error) {
        console.error("Failed to load years", error);
      }
    }

    loadYears();
  }, []);

  // ⭐ Fetch dashboard data
  const fetchData = useCallback(async () => {
    setLoadingData(true);

    try {
      const token = localStorage.getItem("tce_admin_token");

      const params = {
        ...(selectedYear ? { year: selectedYear } : {}),
        ...(selectedMonth ? { month: selectedMonth } : {}),
        search,
        department: dept,
        specialization: spec,
        phdStatus,
        placementIncharge,
        applicantType,
        ugMin: ugRange[0],
        ugMax: ugRange[1],
        pgMin: pgRange[0],
        pgMax: pgRange[1],
        scoreMin: scoreRange[0],
        scoreMax: scoreRange[1],
        rankMin: rankRange[0],
        rankMax: rankRange[1],
        page,
        pageSize,
      };

      const { data } = await axios.get(API_BASE, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoadingData(false);
    }
  }, [
    selectedYear,
    selectedMonth,
    search,
    dept,
    spec,
    phdStatus,
    placementIncharge,
    applicantType,
    ugRange,
    pgRange,
    scoreRange,
    rankRange,
    page,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    dept,
    spec,
    phdStatus,
    placementIncharge,
    applicantType,
    ugRange,
    pgRange,
    scoreRange,
    rankRange,
    selectedYear,
    selectedMonth,
  ]);

  useEffect(() => {
    if (user) fetchData();
  }, [fetchData, user]);

  // ⭐ Export ZIP
  const handleExportZip = async () => {
    try {
      const token = localStorage.getItem("tce_admin_token");

      const params = {
        ...(selectedYear ? { year: selectedYear } : {}),
        ...(selectedMonth ? { month: selectedMonth } : {}),
        search,
        department: dept,
        specialization: spec,
        phdStatus,
        placementIncharge,
        applicantType,
      };

      const response = await axios.get(`${API_BASE}/export-zip`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "TCE_Resumes.zip");
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Try again.");
    }
  };

  // 🔄 Show while Firebase checks auth state
  if (authLoading) return <div>Checking authentication...</div>;

  return (
    <div className="admin-dashboard">
      <Sidebar
        years={years}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        onExportZip={handleExportZip}
        onLogout={handleLogout}
      />

      <main className="admin-main">
        <div className="toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name or email..."
          />

          <div className="filters">
            <FilterDropdown
              label="Department"
              value={dept}
              options={departmentOptions}
              onChange={setDept}
            />
            <FilterDropdown
              label="Specialization"
              value={spec}
              options={specializationOptions}
              onChange={setSpec}
            />
            <FilterDropdown
              label="PhD Status"
              value={phdStatus}
              options={phdOptions}
              onChange={setPhdStatus}
            />
            <FilterDropdown
              label="Placement In-charge"
              value={placementIncharge}
              options={placementOptions}
              onChange={setPlacementIncharge}
            />
            <FilterDropdown
              label="Applicant Type"
              value={applicantType}
              options={applicantTypes}
              onChange={setApplicantType}
            />
          </div>
        </div>

        <SubmissionsTable
          loading={loadingData}
          rows={rows}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onRowClick={setActiveRow}
        />
      </main>

      {activeRow && (
        <SubmissionModal row={activeRow} onClose={() => setActiveRow(null)} />
      )}
    </div>
  );
}
