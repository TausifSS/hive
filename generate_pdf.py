import os
import sys
import subprocess

# Auto-install fpdf2 if not present
try:
    from fpdf import FPDF
except ImportError:
    print("fpdf2 not found. Installing it now...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fpdf2"])
    from fpdf import FPDF

class HIVEPDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return  # Skip header on cover page
        self.set_font("helvetica", "I", 9)
        self.set_text_color(124, 58, 237)  # Brand Purple
        self.cell(0, 10, "HIVE: Single-Window Campus Engagement Hub", border=0, align="L")
        self.set_text_color(107, 114, 128)  # Gray text
        self.cell(0, 10, "Project Pitch & Specifications", border=0, align="R")
        self.ln(10)
        # Header line
        self.set_draw_color(139, 92, 246)
        self.set_line_width(0.3)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)

    def footer(self):
        if self.page_no() == 1:
            return  # Skip footer on cover page
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(107, 114, 128)  # Gray
        # Footer line
        self.set_draw_color(229, 231, 235)
        self.line(10, self.get_y() - 2, 200, self.get_y() - 2)
        self.cell(0, 10, "GH Raisoni College (GHR) - Confidential HIVE Pitch", border=0, align="L")
        self.cell(0, 10, f"Page {self.page_no()}", border=0, align="R")

    def cover_page(self):
        self.add_page()
        self.set_y(40)
        
        # HIVE Title
        self.set_font("helvetica", "B", 42)
        self.set_text_color(124, 58, 237)  # Primary Purple
        self.cell(0, 20, "HIVE", border=0, align="C")
        self.ln(20)

        # Subtitle
        self.set_font("helvetica", "B", 18)
        self.set_text_color(79, 70, 229)  # Accent Indigo
        self.cell(0, 15, "Single-Window Campus Engagement Hub", border=0, align="C")
        self.ln(15)

        # Description
        self.set_font("helvetica", "", 12)
        self.set_text_color(75, 85, 99)  # Charcoal Gray
        self.multi_cell(0, 8, "Complete Project Documentation, Product Specifications,\nTechnical Architecture & Security Guidelines.", align="C")
        self.ln(40)

        # Decorative Box (Brand Gradient representation)
        self.set_fill_color(245, 243, 255)  # Very soft purple background
        self.set_draw_color(139, 92, 246)   # Purple border
        self.rect(20, self.get_y(), 170, 50, "DF")
        
        self.set_y(self.get_y() + 5)
        self.set_font("helvetica", "B", 11)
        self.set_text_color(109, 40, 217)
        self.cell(0, 8, "Target Institution: GH Raisoni College (GHR)", align="C")
        self.ln(8)
        self.set_font("helvetica", "", 10)
        self.set_text_color(75, 85, 99)
        self.cell(0, 6, "Prepared for: GHR College Management & Evaluators", align="C")
        self.ln(6)
        self.cell(0, 6, "Platform Components: Web App (Vite/React) & Backend Service (Node/Express)", align="C")
        self.ln(6)
        self.cell(0, 6, "Database: Supabase PostgreSQL (Postgres Cloud Server)", align="C")
        self.ln(6)
        
        self.set_y(230)
        self.set_font("helvetica", "I", 10)
        self.set_text_color(156, 163, 175)
        self.cell(0, 10, "Document Version 1.0.0 (Production-ready Pitching Build)", align="C")
        self.ln(6)
        self.cell(0, 10, "Date of Issue: June 4, 2026", align="C")

    def section_header(self, title):
        self.ln(8)
        self.set_font("helvetica", "B", 16)
        self.set_text_color(124, 58, 237)  # Primary Purple
        self.cell(0, 10, title, border=0, align="L")
        self.ln(10)

    def subsection_header(self, title):
        self.ln(4)
        self.set_font("helvetica", "B", 12)
        self.set_text_color(79, 70, 229)  # Accent Indigo
        self.cell(0, 8, title, border=0, align="L")
        self.ln(8)

    def body_text(self, text):
        self.set_font("helvetica", "", 10.5)
        self.set_text_color(31, 41, 55)  # Dark Charcoal Text
        self.multi_cell(0, 6, text)
        self.ln(4)

    def bullet_point(self, title, desc):
        self.set_font("helvetica", "B", 10.5)
        self.set_text_color(31, 41, 55)
        self.write(6, "  - ")
        self.set_font("helvetica", "B", 10.5)
        self.write(6, f"{title}: ")
        self.set_font("helvetica", "", 10.5)
        self.write(6, f"{desc}\n")
        self.ln(2)

def generate():
    pdf = HIVEPDF()
    pdf.cover_page()
    
    # ----------------- SECTION 1 -----------------
    pdf.add_page()
    pdf.section_header("1. Product Requirements Document (PRD)")
    pdf.body_text("The Product Requirements Document (PRD) outlines the core business rationale, problems solved, and operational features of the HIVE platform designed specifically for GH Raisoni College (GHR).")
    
    pdf.subsection_header("1.1 Problem Statement")
    pdf.body_text("In modern educational campuses like GH Raisoni College, student communication and event organization are severely fragmented:")
    pdf.bullet_point("Communication Gaps", "Students miss crucial campus workshops, tech fests, and cultural events because notifications are scattered across WhatsApp groups, Telegram chats, and offline notice boards.")
    pdf.bullet_point("Manual Operations", "Club coordinators spend valuable hours manually registering students, tracking fests, verifying event attendance, and updating attendance registers.")
    pdf.bullet_point("Lack of Motivation", "There is no gamified reward system or central directory to encourage students to participate in co-curricular activities, making it difficult for campus clubs to sustain engagement.")
    pdf.bullet_point("Inefficient Query Resolution", "Students struggle to get real-time answers about event guidelines, points, schedules, or admin panels.")

    pdf.subsection_header("1.2 Target Users")
    pdf.bullet_point("Students (Primary Users)", "Tech-savvy students seeking a single-window dashboard to discover fests, register, track points, and interact with peers.")
    pdf.bullet_point("Club Administrators", "Club coordinators, department heads, or student volunteers who organize events, scan tickets, verify check-ins, and export registers.")
    pdf.bullet_point("College Administrators", "Deans, HODs, or management staff who supervise all campus activities, approve club fests, manage user blocks, and review statistics.")

    pdf.subsection_header("1.3 Product Vision")
    pdf.body_text("To build HIVE - the ultimate single-window campus engagement hub for GH Raisoni College. HIVE gamifies campus life by tracking student participation through a centralized points leaderboard, automates event registration via custom QR-code ticket scans, provides a localized campus AI assistant ('Hey GHR') to answer student queries, and centralizes official announcements and chats.")

    pdf.subsection_header("1.4 Core MVP Features")
    pdf.bullet_point("Centralized Event Management", "Creation, deletion, and editing of campus events by verified Club and College Admins.")
    pdf.bullet_point("Mandatory Profile Details", "Mandatory fields for Name, Division, Year, and Department, ensuring robust student tracking.")
    pdf.bullet_point("QR-Code Ticket Check-in", "Mobile camera scanning of student QR tickets to automate event check-ins and verify attendance in real-time.")
    pdf.bullet_point("Campus AI Assistant (Hey GHR)", "An intelligent conversational helper integrated with Google Gemini API to resolve campus, event, and study queries in Hinglish and English.")
    pdf.bullet_point("Leaderboards & Points", "A real-time points ranking list tracking student participation to gamify and encourage engagement.")

    # ----------------- SECTION 2 -----------------
    pdf.add_page()
    pdf.section_header("2. Technical Architecture Document (TAD)")
    pdf.body_text("The Technical Architecture Document (TAD) details the technical stack, codebase structure, and hosting details governing the GHR HIVE application.")

    pdf.subsection_header("2.1 Technology Stack")
    pdf.bullet_point("Frontend Framework", "React 19, TypeScript, Vite (v7.1.3), Tailwind CSS, and Framer Motion.")
    pdf.bullet_point("Backend Engine", "Node.js with Express.js runtime, utilizing Server-Sent Events (SSE) for real-time chat broadcasts.")
    pdf.bullet_point("Database Management", "Supabase hosted PostgreSQL Cloud Server. Utilizes Transaction Pooler on Port 6543 to bypass Render's outbound IPv6 network constraints.")
    pdf.bullet_point("Hosting Infrastructure", "Vercel (Frontend SPA) & Render (Backend Web Service).")

    pdf.subsection_header("2.2 Directory Layout")
    pdf.body_text("The repository is cleanly split into frontend components and backend logic:\n"
                  "  - proto1/vercel.json: Rewrites non-static URLs to index.html to fix SPA routing.\n"
                  "  - proto1/backend/server.mjs: Houses API endpoints, SSE updates, and user authentication.\n"
                  "  - proto1/backend/db.mjs: Configures the PostgreSQL client pool, migrations, and SQL schema queries.\n"
                  "  - proto1/src/lib/api.ts: Coordinates fetch calls and frontend state logic.\n"
                  "  - proto1/src/pages/HeyGHR.tsx: Incorporates the Web Speech API voice input and Gemini chatbot.")

    pdf.subsection_header("2.3 Database Tables")
    pdf.bullet_point("users", "id, email (Unique), name, password_hash, role (student/club_admin/Admin), points, div, year, department, blocked_at, avatar_url.")
    pdf.bullet_point("sessions", "token (Primary Key), user_id, expires_at.")
    pdf.bullet_point("events", "id, title, description, category, date, venue, organizer_id, capacity, points, image_url.")
    pdf.bullet_point("event_registrations", "event_id, user_id, registered_at, attended_at (tracks successful check-in timestamp).")

    # ----------------- SECTION 3 -----------------
    pdf.add_page()
    pdf.section_header("3. Security & Access Document (SAD)")
    pdf.body_text("The Security & Access Document (SAD) details how user privacy is guarded, role-based checks are verified, and database transactions are kept clean.")

    pdf.subsection_header("3.1 Authentication & Restriction")
    pdf.bullet_point("Google OAuth Integration", "Login is powered by Google Identity Services (GSI) and whitelists college domains (.raisoni.net, ghrcem.edu), blocking arbitrary personal emails.")
    pdf.bullet_point("Session Security", "All private API calls require a database-backed bearer token, checked securely via session headers.")

    pdf.subsection_header("3.2 User Roles & Matrix")
    pdf.body_text("Permissions are strictly separated on both client and server-side:\n"
                  "  1. Student: Read posts/events, register, view own points, chat with HeyGHR.\n"
                  "  2. Club Admin: Add events, scan QR tickets to log student attendance, export registrations.\n"
                  "  3. College Admin: Supervise all database tables, review club certificates, manage user states (block/unblock), edit/delete any content.")

    pdf.subsection_header("3.3 Error Handling & Edge Cases")
    pdf.bullet_point("Query Constraints", "SQL schemas specify target columns in all conflict statements (e.g. followers or registration uniques) to prevent query failures.")
    pdf.bullet_point("DoS Safety", "Incoming payload body limits (MAX_BODY_BYTES = 5MB) prevent RAM overflow exploits.")
    pdf.bullet_point("Gemini API Fallback", "If the AI API key is missing or fails, the chatbot smoothly switches to regex local rules so the site remains functional.")

    # ----------------- SECTION 4 -----------------
    pdf.add_page()
    pdf.section_header("4. Frontend Specification Document (FSD)")
    pdf.body_text("The Frontend Specification Document (FSD) details the design system, animations, UI components, and client integration rules.")

    pdf.subsection_header("4.1 Color Palette & Styling")
    pdf.bullet_point("Primary Brand Purple", "#7C3AED - represents campus innovation and youth.")
    pdf.bullet_point("Accent Colors", "Indigo (#4F46E5) and soft violet-to-pink gradient panels.")
    pdf.bullet_point("Backgrounds", "#F5F3FF (Soft Light Purple) transitioning to #EDE9FE.")
    pdf.bullet_point("Bubble Glassmorphic Design", "Assistant bubbles use rgba(255,255,255,0.95) with backdrop-filter: blur(10px) and a soft card shadow.")

    pdf.subsection_header("4.2 Spacing & Responsive Rules")
    pdf.body_text("  - Desktop Screen Layout: Dual sticky sidebar system. Left navigation sidebar, center feed column, and right-hand side column (stories/recent fests).\n"
                  "  - Mobile Screen Layout: Locked to max-width 450px centered shell to simulate a native app look, utilizing a bottom navigation bar.")

    pdf.subsection_header("4.3 Micro-Animations & Integrations")
    pdf.bullet_point("Web Speech API Integration", "Clicking the chatbot mic icon triggers HTML5 SpeechRecognition. Transcribes mixed Hindi/English speech directly into the text input box.")
    pdf.bullet_point("HTML5 Camera Scanner", "Uses the browser's video stream in real-time to decode check-in tickets inside the Club/Admin panel.")
    pdf.bullet_point("Excel CSV Generation", "Outputs instant tabular packages of event registration records directly to the coordinator's download folder.")

    # ----------------- SECTION 5 -----------------
    pdf.add_page()
    pdf.section_header("5. Feature Ticket List (FTL)")
    pdf.body_text("The Feature Ticket List details the status of all core technical components deployed for the HIVE application:")
    
    pdf.ln(5)
    pdf.set_font("helvetica", "B", 10.5)
    pdf.set_text_color(109, 40, 217)
    pdf.cell(40, 8, "Ticket ID", 1, 0, "C")
    pdf.cell(110, 8, "Feature / Task", 1, 0, "L")
    pdf.cell(30, 8, "Status", 1, 1, "C")
    
    pdf.set_font("helvetica", "", 9.5)
    pdf.set_text_color(31, 41, 55)
    
    tasks = [
        ("T-01", "Supabase PostgreSQL Database Migration", "COMPLETED"),
        ("T-02", "Mandatory Student Profile Field Validation", "COMPLETED"),
        ("T-03", "Google OAuth restriction to college email domains", "COMPLETED"),
        ("T-04", "Gemini 2.5 Flash API Assistant integration (HeyGHR)", "COMPLETED"),
        ("T-05", "Web Speech API mic integration for voice typing", "COMPLETED"),
        ("T-06", "Vercel SPA Routing and rewrite rules (vercel.json)", "COMPLETED"),
        ("T-07", "QR Attendance in-app camera scanner integration", "COMPLETED"),
        ("T-08", "Attendance Live Excel CSV Exporter Utility", "COMPLETED"),
    ]
    
    for tid, name, status in tasks:
        pdf.cell(40, 8, tid, 1, 0, "C")
        pdf.cell(110, 8, f" {name}", 1, 0, "L")
        pdf.cell(30, 8, status, 1, 1, "C")

    pdf.output("HIVE_Pitching_Documentation.pdf")
    print("Successfully generated HIVE_Pitching_Documentation.pdf!")

if __name__ == "__main__":
    generate()
