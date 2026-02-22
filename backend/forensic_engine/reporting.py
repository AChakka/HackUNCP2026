import os
from datetime import datetime


def generate_pdf(report_text: str, file_name: str, output_path: str) -> str:
    """Generate a PDF forensic report. Returns the saved output path."""
    try:
        from fpdf import FPDF
    except ImportError:
        raise ImportError("fpdf2 is required: pip install fpdf2")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # ── Header bar ────────────────────────────────────────────────────────────
    pdf.set_fill_color(10, 10, 10)
    pdf.rect(0, 0, 210, 28, "F")
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Courier", "B", 14)
    pdf.set_xy(10, 7)
    pdf.cell(0, 8, "CORONER  --  FORENSIC ANALYSIS REPORT", ln=True)

    pdf.set_font("Courier", "", 8)
    pdf.set_text_color(160, 160, 160)
    pdf.set_xy(10, 17)
    pdf.cell(
        0, 6,
        f"File: {file_name}   |   {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC",
        ln=True,
    )

    # Red divider
    pdf.set_draw_color(192, 57, 43)
    pdf.set_line_width(0.6)
    pdf.line(10, 30, 200, 30)
    pdf.ln(12)

    # ── Body ──────────────────────────────────────────────────────────────────
    pdf.set_text_color(30, 30, 30)
    pdf.set_font("Courier", "", 8)

    for line in report_text.split("\n"):
        stripped = line.rstrip()
        if stripped.startswith("## "):
            pdf.ln(3)
            pdf.set_font("Courier", "B", 10)
            pdf.set_text_color(192, 57, 43)
            pdf.multi_cell(0, 6, stripped[3:])
            pdf.set_font("Courier", "", 8)
            pdf.set_text_color(30, 30, 30)
        elif stripped == "":
            pdf.ln(3)
        else:
            pdf.multi_cell(0, 5, stripped)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    pdf.output(output_path)
    return output_path
