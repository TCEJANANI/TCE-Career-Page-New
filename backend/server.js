require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const bcrypt = require("bcrypt");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const JSZip = require("jszip");

const app = express();

app.use(express.json());
app.use(cors({
  origin: "https://tce-career-page-new.onrender.com", // frontend origin
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));


// -----------------------------
// MYSQL CONNECTION
// -----------------------------
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL Error:", err);
    return;
  }
  console.log("✅ MySQL Connected");
});

// -----------------------------
// B2 S3 CLIENT
// -----------------------------
const s3 = new S3Client({
  region: process.env.B2_REGION || "us-east-005",
  endpoint: `https://${process.env.B2_ENDPOINT}`,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY
  }
});

const upload = multer({ storage: multer.memoryStorage() });


// -----------------------------
// Generate Sequential Application ID
// -----------------------------
async function generateApplicationId() {
  const year = new Date().getFullYear();

  return new Promise((resolve, reject) => {
    db.query(
      `SELECT applicationId 
       FROM applications 
       WHERE applicationId LIKE 'TCE${year}%' 
       ORDER BY applicationId DESC 
       LIMIT 1`,
      (err, rows) => {
        if (err) return reject(err);

        let nextNumber = 1;

        if (rows.length > 0) {
          const lastId = rows[0].applicationId;
          const lastNumber = parseInt(lastId.slice(-4)); // last 4 digits
          nextNumber = lastNumber + 1;
        }

        const padded = String(nextNumber).padStart(4, "0");
        const newId = `TCE${year}${padded}`;

        resolve(newId);
      }
    );
  });
}


// -----------------------------
// Upload Resume to B2
// -----------------------------
async function uploadToB2(file) {
  const key = `resumes/${Date.now()}_${file.originalname}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.B2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    })
  );

  return key;
}

// -----------------------------
// ADMIN AUTH MIDDLEWARE
// -----------------------------
function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET, (err, admin) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.admin = admin;
    next();
  });
}

// -----------------------------
// ALLOWED FIELDS FOR INSERT/UPDATE
// -----------------------------
const ALLOWED_FIELDS = [
  "email", "name", "phone", "applicantType", "department",
  "ugPercentage", "pgPercentage", "mastersInstitute",
  "specialization", "phdInstitute", "phdTopic", "phdStatus",
  "currentInstitution", "jobTitle", "expAcademics", "expIndustry",
  "journals", "projects", "placementIncharge"
];

// -----------------------------
// ROUTE 1 — INSERT APPLICATION
// -----------------------------

app.get( "/", ( req, res ) => res.send( "Career Page API is running" ) );


app.post("/api/applications", upload.single("file"), async (req, res) => {
  try {
    const applicationId = await generateApplicationId();

    // filter allowed fields
    let fields = {};
    ALLOWED_FIELDS.forEach((f) => {
      fields[f] = req.body[f] || "";
    });

    // numeric conversion
    ["ugPercentage", "pgPercentage", "expAcademics", "expIndustry", "journals", "projects"]
      .forEach((key) => {
        fields[key] = fields[key] ? Number(fields[key]) : 0;
      });

    let fileKey = null;
    let fileName = null;

    if (req.file) {
      fileKey = await uploadToB2(req.file);
      fileName = req.file.originalname;
    }

    const sql = `
      INSERT INTO applications (
        applicationId, email, name, phone, applicantType, department,
        ugPercentage, pgPercentage, mastersInstitute, specialization,
        phdInstitute, phdTopic, phdStatus, currentInstitution, jobTitle,
        expAcademics, expIndustry, journals, projects, placementIncharge,
        fileKey, fileName
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

    db.query(
      sql,
      [
        applicationId,
        fields.email,
        fields.name,
        fields.phone,
        fields.applicantType,
        fields.department,
        fields.ugPercentage,
        fields.pgPercentage,
        fields.mastersInstitute,
        fields.specialization,
        fields.phdInstitute,
        fields.phdTopic,
        fields.phdStatus,
        fields.currentInstitution,
        fields.jobTitle,
        fields.expAcademics,
        fields.expIndustry,
        fields.journals,
        fields.projects,
        fields.placementIncharge,
        fileKey,
        fileName
      ],
      (err) => {
        if (err) {
          console.error("❌ Insert Error:", err.sqlMessage);
          return res.status(500).json({ message: "DB Error", error: err.sqlMessage });
        }
        res.json({ success: true, applicationId });
      }
    );
  } catch (e) {
    console.error("❌ Server Error:", e);
    res.status(500).json({ message: "Server Error" });
  }
});

// -----------------------------
// ROUTE 2 — UPDATE BY ID
// -----------------------------
app.put("/api/applications/id/:id", upload.single("file"), async (req, res) => {
  try {
    const id = req.params.id;

    let fields = {};
    ALLOWED_FIELDS.forEach((f) => {
      if (req.body[f] !== undefined) fields[f] = req.body[f];
    });

    ["ugPercentage", "pgPercentage", "expAcademics", "expIndustry", "journals", "projects"]
      .forEach((key) => {
        if (fields[key]) fields[key] = Number(fields[key]);
      });

    if (req.file) {
      fields.fileKey = await uploadToB2(req.file);
      fields.fileName = req.file.originalname;
    }

    const setClause = Object.keys(fields).map((k) => `${k}=?`).join(",");
    const values = [...Object.values(fields), id];

    db.query(
      `UPDATE applications SET ${setClause} WHERE id=?`,
      values,
      (err, result) => {
        if (err) {
          console.error("❌ Update Error:", err.sqlMessage);
          return res.status(500).json({ message: "DB Error", error: err.sqlMessage });
        }
        res.json({ success: true });
      }
    );
  } catch (e) {
    console.error("❌ Server Error:", e);
    res.status(500).json({ message: "Server Error" });
  }
});

// -----------------------------
// ROUTE 3 — GET APPLICATION BY EMAIL
// -----------------------------
app.get("/api/applications/by-email/:email", (req, res) => {
  db.query(
    "SELECT * FROM applications WHERE email=?",
    [req.params.email],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB Error" });
      if (!rows.length) return res.status(404).json({ message: "Not Found" });
      res.json(rows[0]);
    }
  );
});

// -----------------------------
// VIEW RESUME (B2 Signed URL)
// -----------------------------
app.get("/api/resume/view/:key", async (req, res) => {
  try {
    const key = req.params.key;

    if (!key || key === "null" || key === "undefined") {
      return res.status(400).json({ message: "Invalid resume key" });
    }

    // Generate 60-second signed URL
    const command = new GetObjectCommand({
      Bucket: process.env.B2_BUCKET,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    // Redirect to Backblaze B2 file
    return res.redirect(signedUrl);

  } catch (error) {
    console.error("❌ Resume View Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch resume" });
  }
});


//Admin login

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  // TODO: Validate email/password from your admin table
  // Example hardcoded:
  if (email === "admin@tce.edu" && password === "password123") {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "8h" });
    return res.json({ token });
  } else {
    return res.status(401).json({ message: "Invalid credentials" });
  }
});

// Get years for dashboard

app.get("/api/applications/years", (req, res) => {
  db.query("SELECT DISTINCT YEAR(created_at) as year FROM applications ORDER BY year", (err, rows) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    res.json({ years: rows.map(r => r.year) });
  });
});

app.get("/api/applications", (req, res) => {
  const {
    search, department, specialization, phdStatus, placementIncharge,
    applicantType, ugMin, ugMax, pgMin, pgMax, scoreMin, scoreMax,
    rankMin, rankMax, year, month, page = 1, pageSize = 10
  } = req.query;

  let where = "WHERE 1=1";
  let params = [];

  if (search) { where += " AND (name LIKE ? OR email LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
  if (department) { where += " AND department=?"; params.push(department); }
  if (specialization) { where += " AND specialization=?"; params.push(specialization); }
  if (phdStatus) { where += " AND phdStatus=?"; params.push(phdStatus); }
  if (placementIncharge) { where += " AND placementIncharge=?"; params.push(placementIncharge); }
  if (applicantType) { where += " AND applicantType=?"; params.push(applicantType); }
  if (ugMin) { where += " AND ugPercentage>=?"; params.push(ugMin); }
  if (ugMax) { where += " AND ugPercentage<=?"; params.push(ugMax); }
  if (pgMin) { where += " AND pgPercentage>=?"; params.push(pgMin); }
  if (pgMax) { where += " AND pgPercentage<=?"; params.push(pgMax); }
  if (year) { where += " AND YEAR(created_at)=?"; params.push(year); }
  if (month) { where += " AND MONTH(created_at)=?"; params.push(month); }

  const offset = (page - 1) * pageSize;
  const sql = `SELECT * FROM applications ${where} ORDER BY created_at DESC LIMIT ?,?`;
  params.push(Number(offset), Number(pageSize));

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    db.query(`SELECT COUNT(*) as count FROM applications ${where}`, params.slice(0, -2), (err2, countRows) => {
      if (err2) return res.status(500).json({ message: "DB Error" });
      res.json({ rows, total: countRows[0].count });
    });
  });
});

app.get("/api/applications/export-zip", async (req, res) => {
  try {
    const { search, department, specialization, phdStatus, placementIncharge, applicantType } = req.query;
    let where = "WHERE 1=1";
    let params = [];
    if (search) { where += " AND (name LIKE ? OR email LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
    if (department) { where += " AND department=?"; params.push(department); }
    if (specialization) { where += " AND specialization=?"; params.push(specialization); }
    if (phdStatus) { where += " AND phdStatus=?"; params.push(phdStatus); }
    if (placementIncharge) { where += " AND placementIncharge=?"; params.push(placementIncharge); }
    if (applicantType) { where += " AND applicantType=?"; params.push(applicantType); }

    db.query(`SELECT fileKey, fileName FROM applications ${where}`, params, async (err, rows) => {
      if (err) return res.status(500).json({ message: "DB Error" });
      const zip = new JSZip();
      for (const r of rows) {
        if (r.fileKey) {
          const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.B2_BUCKET, Key: r.fileKey }), { expiresIn: 60 });
          const fileResp = await fetch(url);
          const buffer = await fileResp.arrayBuffer();
          zip.file(r.fileName, buffer);
        }
      }
      const zipContent = await zip.generateAsync({ type: "nodebuffer" });
      res.set({ "Content-Type": "application/zip", "Content-Disposition": "attachment; filename=TCE_Resumes.zip" });
      res.send(zipContent);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Export failed" });
  }
});


// -----------------------------
// START SERVER
// -----------------------------
app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});
