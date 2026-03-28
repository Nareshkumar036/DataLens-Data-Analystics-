# ═══════════════════════════════════════════════════════════════
# DataLens — analyzer.py
# Pure Python data analysis using pandas
# Called by app.py to process uploaded CSV data
# ═══════════════════════════════════════════════════════════════

import io
import pandas as pd


def analyze_csv(csv_text: str) -> dict:
    """
    Parse a raw CSV string and return full analysis:
      - column info
      - per-column statistics (sum, mean, min, max, std)
      - trend analysis for numeric columns
      - a plain-English summary
    """

    # ── 1. Load into DataFrame ───────────────────────────────
    df = pd.read_csv(io.StringIO(csv_text))
    df.columns = df.columns.str.strip()   # remove accidental spaces

    total_rows = len(df)
    headers    = list(df.columns)

    # ── 2. Separate column types ─────────────────────────────
    num_cols = df.select_dtypes(include='number').columns.tolist()
    str_cols = df.select_dtypes(exclude='number').columns.tolist()

    # ── 3. Per-column statistics ──────────────────────────────
    stats = {}
    for col in num_cols:
        series = df[col].dropna()
        stats[col] = {
            "sum":   round(float(series.sum()), 2),
            "mean":  round(float(series.mean()), 2),
            "min":   round(float(series.min()), 2),
            "max":   round(float(series.max()), 2),
            "std":   round(float(series.std()), 2),
            "count": int(series.count()),
        }

    # ── 4. Trend analysis (first half vs second half) ─────────
    trends = {}
    for col in num_cols:
        vals = df[col].dropna().tolist()
        if len(vals) < 2:
            continue
        half    = len(vals) // 2
        first   = vals[:half]
        last    = vals[half:]
        avg_f   = sum(first) / len(first)
        avg_l   = sum(last)  / len(last)
        if avg_f == 0:
            pct = 0.0
        else:
            pct = round(((avg_l - avg_f) / abs(avg_f)) * 100, 1)

        trends[col] = {
            "direction":  "up" if avg_l >= avg_f else "down",
            "change_pct": abs(pct),
        }

    # ── 5. Plain-English summary ──────────────────────────────
    summary_parts = [f"Dataset has {total_rows} rows and {len(headers)} columns."]

    for col, t in trends.items():
        direction_word = "increased" if t["direction"] == "up" else "decreased"
        summary_parts.append(
            f"'{col}' {direction_word} by {t['change_pct']}% across the dataset."
        )

    summary = " ".join(summary_parts)

    # ── 6. Return result ──────────────────────────────────────
    return {
        "headers":    headers,
        "num_cols":   num_cols,
        "str_cols":   str_cols,
        "total_rows": total_rows,
        "stats":      stats,
        "trends":     trends,
        "summary":    summary,
    }
