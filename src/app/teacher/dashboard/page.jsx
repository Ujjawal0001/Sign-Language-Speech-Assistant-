"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Radio,
  History,
  Settings,
  LogOut,
  Plus,
  Users,
  BookOpen,
  Copy,
  Check,
  Play,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";

export default function TeacherDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  // Modal State for Create Classroom
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSubject, setCreateSubject] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createSemester, setCreateSemester] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    fetchSessionAndClassrooms();
  }, []);

  const fetchSessionAndClassrooms = async () => {
    try {
      const userRes = await fetch("/api/auth/me");
      if (!userRes.ok) {
        router.push("/login");
        return;
      }
      const userData = await userRes.json();

      if (userData.user.role === "STUDENT") {
        router.push("/student/dashboard");
        return;
      }
      setUser(userData.user);

      const classRes = await fetch("/api/classrooms");
      if (classRes.ok) {
        const classData = await classRes.json();
        setClassrooms(classData.classrooms || []);
      }
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (e) {
      router.push("/login");
    }
  };

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    if (!createName.trim() || !createSubject.trim()) {
      setModalError("Classroom name and subject are required.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await fetch("/api/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          subject: createSubject.trim(),
          description: createDesc.trim() || undefined,
          semester: createSemester.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Failed to create classroom");
        setIsSubmitting(false);
        return;
      }

      setClassrooms([data.classroom, ...classrooms]);
      setIsModalOpen(false);
      setCreateName("");
      setCreateSubject("");
      setCreateDesc("");
      setCreateSemester("");
    } catch (err) {
      setModalError("Network error while creating classroom.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalStudents = classrooms.reduce((acc, c) => acc + (c._count?.members || 0), 0);
  const totalLectures = classrooms.reduce((acc, c) => acc + (c._count?.lectures || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-auralis-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-auralis-accent" />
          <span className="text-xs font-semibold text-auralis-muted uppercase tracking-wider">
            Loading Instructor Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-auralis-bg">
      <aside className="w-full md:w-64 bg-white border-r border-auralis-border flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 border-b border-auralis-border">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-auralis-dark text-white flex items-center justify-center font-bold text-base shadow-tactile border border-auralis-accent/30">
                <span className="text-auralis-secondary font-heading">A</span>
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-extrabold text-lg text-auralis-text leading-none">
                  AURALIS
                </span>
                <span className="text-[10px] font-semibold text-auralis-accent uppercase tracking-wider mt-1">
                  Instructor Suite
                </span>
              </div>
            </Link>
          </div>

          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "overview"
                  ? "bg-auralis-highlight text-auralis-accent shadow-tactile font-bold"
                  : "text-auralis-muted hover:text-auralis-text hover:bg-auralis-bg"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("classrooms")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "classrooms"
                  ? "bg-auralis-highlight text-auralis-accent shadow-tactile font-bold"
                  : "text-auralis-muted hover:text-auralis-text hover:bg-auralis-bg"
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>My Classrooms</span>
            </button>

            <button
              onClick={() => setActiveTab("sessions")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "sessions"
                  ? "bg-auralis-highlight text-auralis-accent shadow-tactile font-bold"
                  : "text-auralis-muted hover:text-auralis-text hover:bg-auralis-bg"
              }`}
            >
              <Radio className="w-4 h-4 shrink-0" />
              <span>Live Sessions</span>
            </button>

            <Link
              href="/lectures"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-auralis-muted hover:text-auralis-text hover:bg-auralis-bg transition-all"
            >
              <History className="w-4 h-4 shrink-0" />
              <span>Lecture History</span>
            </Link>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "settings"
                  ? "bg-auralis-highlight text-auralis-accent shadow-tactile font-bold"
                  : "text-auralis-muted hover:text-auralis-text hover:bg-auralis-bg"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-auralis-border space-y-3">
          <div className="p-3 rounded-xl bg-auralis-bg border border-auralis-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-auralis-accent text-white flex items-center justify-center font-bold text-xs uppercase">
              {user?.name?.slice(0, 2) || "TR"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-auralis-text truncate">{user?.name}</div>
              <div className="text-[10px] text-auralis-muted truncate">{user?.email}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-auralis-border">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-auralis-accent bg-auralis-highlight px-3 py-1 rounded-full border border-auralis-secondary/60">
                Instructor Workspace
              </span>
              <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-auralis-text tracking-tight mt-3">
                {getGreeting()}, {user?.name}
              </h1>
              <p className="text-sm text-auralis-muted mt-1">
                Your classroom is ready for more inclusive learning.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-xl bg-auralis-accent hover:bg-auralis-accent-hover text-white font-heading font-bold text-sm transition-all shadow-tactile hover:shadow shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-auralis-accent"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Classroom</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            <div className="md:col-span-6 rounded-2xl bg-auralis-dark text-white p-7 flex flex-col justify-between shadow-float relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-auralis-accent/20 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-auralis-secondary">
                    Active Teaching Workspaces
                  </span>
                  <GraduationCap className="w-5 h-5 text-auralis-secondary" />
                </div>
                <div className="font-heading font-extrabold text-5xl text-white tracking-tight">
                  {classrooms.length}
                </div>
                <p className="text-xs text-white/70 mt-2">
                  Active academic classrooms configured with live speech-to-text and ISL gesture classification.
                </p>
              </div>

              <div className="relative z-10 mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-xs">
                <span className="text-white/60">Room code sharing ready</span>
                <span className="text-auralis-secondary font-mono font-semibold">100% In-Browser</span>
              </div>
            </div>

            <div className="md:col-span-3 rounded-2xl bg-white border border-auralis-border p-6 flex flex-col justify-between shadow-tactile">
              <div>
                <div className="w-9 h-9 rounded-xl bg-auralis-highlight text-auralis-accent flex items-center justify-center mb-4">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-auralis-muted uppercase tracking-wider">
                  Enrolled Students
                </div>
                <div className="font-heading font-extrabold text-3xl text-auralis-text mt-1">
                  {totalStudents}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-auralis-border text-[11px] text-auralis-muted">
                Across all your active classrooms.
              </div>
            </div>

            <div className="md:col-span-3 rounded-2xl bg-white border border-auralis-border p-6 flex flex-col justify-between shadow-tactile">
              <div>
                <div className="w-9 h-9 rounded-xl bg-auralis-bg text-auralis-accent flex items-center justify-center mb-4 border border-auralis-border">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-auralis-muted uppercase tracking-wider">
                  Lectures Delivered
                </div>
                <div className="font-heading font-extrabold text-3xl text-auralis-text mt-1">
                  {totalLectures}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-auralis-border text-[11px] text-auralis-muted">
                Archived with searchable transcripts.
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading font-bold text-xl text-auralis-text">
                  Your Classrooms
                </h2>
                <p className="text-xs text-auralis-muted">
                  Share the joining code with deaf and hearing students to start synchronized lectures.
                </p>
              </div>
              <span className="text-xs font-mono text-auralis-muted bg-white px-2.5 py-1 rounded-md border border-auralis-border">
                {classrooms.length} Classrooms
              </span>
            </div>

            {classrooms.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-auralis-border space-y-4">
                <div className="w-12 h-12 rounded-xl bg-auralis-highlight text-auralis-accent mx-auto flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-auralis-text">
                    No classrooms created yet
                  </h3>
                  <p className="text-xs text-auralis-muted max-w-sm mx-auto mt-1">
                    Create your first classroom to generate a unique invite code and launch live caption broadcasts.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-auralis-accent text-white text-xs font-bold shadow-tactile"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Classroom Now</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {classrooms.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-5 rounded-2xl bg-white border border-auralis-border hover:border-auralis-accent/50 transition-all shadow-tactile flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-auralis-highlight text-auralis-accent flex items-center justify-center font-bold font-heading text-base shrink-0">
                        {cls.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-bold text-base text-auralis-text">
                            {cls.name}
                          </h3>
                          <span className="text-[11px] font-semibold text-auralis-muted bg-auralis-bg px-2 py-0.5 rounded border border-auralis-border">
                            {cls.subject}
                          </span>
                        </div>
                        {cls.description && (
                          <p className="text-xs text-auralis-muted mt-0.5 line-clamp-1">
                            {cls.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-auralis-muted font-mono">
                          <span>{cls._count?.members || 0} students enrolled</span>
                          <span>•</span>
                          <span>{cls._count?.lectures || 0} lectures recorded</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-auralis-border/60">
                      <button
                        onClick={() => handleCopyCode(cls.code)}
                        className="px-3 py-2 rounded-xl bg-auralis-bg hover:bg-auralis-surface border border-auralis-border flex items-center gap-2 text-xs font-mono font-bold text-auralis-text transition-colors group"
                        title="Click to copy student invite code"
                      >
                        <span className="text-auralis-accent">{cls.code}</span>
                        {copiedCode === cls.code ? (
                          <Check className="w-3.5 h-3.5 text-auralis-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-auralis-muted group-hover:text-auralis-text" />
                        )}
                      </button>

                      <Link
                        href={`/classroom/${cls.id}?role=teacher`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-auralis-accent hover:bg-auralis-accent-hover text-white text-xs font-bold transition-all shadow-tactile"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Start Lecture</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-float border border-auralis-border p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-auralis-border">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-auralis-accent">
                  New Workspace
                </span>
                <h3 className="font-heading font-extrabold text-2xl text-auralis-text mt-1">
                  Create Inclusive Classroom
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-auralis-muted hover:text-auralis-text hover:bg-auralis-bg"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClassroom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-auralis-text mb-1.5">
                  Classroom Name *
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Wave Mechanics & Optics"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-auralis-border text-sm text-auralis-text placeholder:text-auralis-muted focus:outline-none focus:ring-2 focus:ring-auralis-accent focus:border-auralis-accent focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-auralis-text mb-1.5">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={createSubject}
                  onChange={(e) => setCreateSubject(e.target.value)}
                  placeholder="e.g. Physics 301"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-auralis-border text-sm text-auralis-text placeholder:text-auralis-muted focus:outline-none focus:ring-2 focus:ring-auralis-accent focus:border-auralis-accent focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-auralis-text mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Topics, syllabus scope, or classroom accessibility notes..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-auralis-border text-sm text-auralis-text placeholder:text-auralis-muted focus:outline-none focus:ring-2 focus:ring-auralis-accent focus:border-auralis-accent focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-auralis-text mb-1.5">
                  Semester / Term (Optional)
                </label>
                <input
                  type="text"
                  value={createSemester}
                  onChange={(e) => setCreateSemester(e.target.value)}
                  placeholder="e.g. Fall 2026 / Semester 5"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-auralis-border text-sm text-auralis-text placeholder:text-auralis-muted focus:outline-none focus:ring-2 focus:ring-auralis-accent focus:border-auralis-accent focus:bg-white transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-auralis-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-auralis-border text-sm font-semibold text-auralis-text hover:bg-auralis-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-auralis-accent hover:bg-auralis-accent-hover text-white text-sm font-bold shadow-tactile flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Code...</span>
                    </>
                  ) : (
                    <span>Create Classroom</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
