# 📊 DataLens — Web Data Analytics Platform

A full-stack web app to upload CSV files and instantly see charts, stats, and trends.

---

## 📁 Project Structure

```
datalens/
├── frontend/
│   ├── index.html      ← Page structure (HTML)
│   ├── style.css       ← All styling (CSS)
│   └── script.js       ← All interactivity & chart logic (JavaScript)
│
├── backend/
│   ├── app.py          ← Flask web server & API routes (Python)
│   ├── analyzer.py     ← Data analysis logic using pandas (Python)
│   └── requirements.txt← Python package list
│
└── README.md
```

---

## 🚀 How to Run

### Step 1 — Start the Python Backend

```bash
cd backend

# Install dependencies (only needed once)
pip install -r requirements.txt

# Start the Flask server
python app.py
```

You'll see:
```
DataLens Backend  —  Flask Server
Running at:  http://localhost:5000
```

---

### Step 2 — Open the Frontend

Simply open the HTML file in your browser:

```bash
cd frontend
open index.html       # macOS
start index.html      # Windows
xdg-open index.html   # Linux
```

> Or use VS Code → Right-click `index.html` → **Open with Live Server**

---

## 🧪 Test the API (without the frontend)

```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"csv": "Month,Revenue\nJan,42000\nFeb,48000\nMar,55000"}'
```

---

## ✅ Features

| Feature            | Where it lives         |
|--------------------|------------------------|
| File upload / drag-drop | `script.js`       |
| CSV parsing        | `script.js`            |
| Bar / Line / Pie charts | `script.js` + Chart.js |
| Trend detection    | `script.js` + `analyzer.py` |
| Statistics (sum, avg, min, max) | `analyzer.py` |
| REST API           | `app.py`               |
| All styling        | `style.css`            |
| Page layout        | `index.html`           |

---

## 🛠 Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Frontend  | HTML5, CSS3, JavaScript |
| Charts    | Chart.js (CDN)          |
| Backend   | Python + Flask          |
| Analysis  | pandas                  |
| API       | REST (JSON)             |

---

## 📋 CSV Format

Your CSV file should look like this:

```
Month, Revenue, Users, Expenses
Jan,   42000,   1200,  31000
Feb,   48000,   1450,  33000
Mar,   55000,   1700,  35000
```

- First row = column headers
- Numeric values are auto-detected
- Max 20 rows shown in charts (all rows in table & stats)
