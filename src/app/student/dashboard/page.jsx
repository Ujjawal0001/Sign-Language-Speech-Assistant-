"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  PlusCircle,
  History,
  Sliders,
  LogOut,
  Radio,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sun,
  Moon,
} from "lucide-react";

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("classrooms");
  const [user, setUser] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Join Classroom State
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [joinSuccess, setJoinSuccess] = useState(null);

  // Accessibility Controls (Live State)
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    fetchSessionAndEnrolled();
  }, []);

  const fetchSessionAndEnrolled = async () => {
    try {
      const userRes = await fetch("/api/auth/me");
      if (!userRes.ok) {
        router.push("/login");
        return;
      }
      const userData = await userRes.json();

      if (userData.user.role === "TEACHER") {
        router.push("/teacher/dashboard");
        return;
      }
      setUser(userData.user);

      const classRes = await fetch("/api/classrooms");
      if (classRes.ok) {
        const classData = await classRes.json();
        setClassrooms(classData.classrooms || []);
      }
    } catch (err) {
      console.error("Student Dashboard Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinClassroom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinError("Please enter a classroom join code");
      return;
    }

    setIsJoining(true);
    setJoinError(null);
    setJoinSuccess(null);

    try {
      const res = await fetch("/api/classrooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || "Failed to join classroom");
        setIsJoining(false);
        return;
      }

      setJoinSuccess(`Enrolled successfully in ${data.classroom.name}!`);
      setJoinCode("");
      // Refresh classroom list
      const updatedRes = await fetch("/api/classrooms");
      if (updatedRes.ok) {
        const updatedData = await updatedRes.json();
        setClassrooms(updatedData.classrooms || []);
      }
    } catch (err) {
      setJoinError("Network error while joining classroom.");
    } finally {
      setIsJoining(false);
    }
  };

  const toggleContrast = () => {
    const next = !isHighContrast;
    setIsHighContrast(next);
    if (next) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (e) {
      router.push("/login");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-auralis-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-auralis-accent" />
          <span className="text-xs font-semibold text-auralis-muted uppercase tracking-wider">
            Loading Student Console...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-auralis-bg font-sans">
      <aside className="w-full md:w-64 bg-white border-r border-auralis-border flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 border-b border-auralis-border">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-auralis-accent text-white flex items-center justify-center font-bold text-base shadow-tactile">
                <span className="font-heading">A</span>
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-extrabold text-lg text-auralis-text leading-none">
                  AURALIS
                </span>
                <span className="text-[10px] font-semibold text-auralis-muted uppercase tracking-wider mt-1">
                  Student Console
                </span>
              </div>
            </Link>
          </div>

          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab("classrooms")}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "classrooms"
                  ? "bg-auralis-highlight text-auralis-accent shadow-tactile font-bold"
                  : "text-auralis-muted hover:text-auralis-text hover:bg-auralis-bg"
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>My Classrooms</span>
            </button>

            <button
              onClick={() => setActiveTab("join")}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "join"
                  ? "bg-auralis-highlight text-auralis-accent shadow-tactile font-bold"
                  : "text-auralis-muted hover:text-auralis-text hover:bg-auralis-bg"
              }`}
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Join Classroom</span>
            </button>

            <Link
              href="/lectures"
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-auralis-muted hover:text-auralis-text hover:bg-auralis-bg transition-all"
            >
              <History className="w-4 h-4 shrink-0" />
              <span>Lecture History</span>
            </Link>

            <button
              onClick={() => setActiveTab("accessibility")}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "accessibility"
                  ? "bg-auralis-highlight text-auralis-accent shadow-tactile font-bold"
                  : "text-auralis-muted hover:text-auralis-text hover:bg-auralis-bg"
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>Accessibility Settings</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-auralis-border space-y-3">
          <div className="p-3 rounded-xl bg-auralis-bg border border-auralis-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-auralis-secondary text-auralis-dark flex items-center justify-center font-bold text-xs uppercase">
              {user?.name?.slice(0, 2) || "ST"}
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
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="pb-6 border-b border-auralis-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-auralis-accent bg-auralis-highlight px-3 py-1 rounded-full border border-auralis-secondary/60">
                Student Learning Portal
              </span>
              <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-auralis-text tracking-tight mt-3">
                Welcome back, {user?.name}
              </h1>
              <p className="text-sm text-auralis-muted mt-1">
                Your live caption stream and archived transcripts are synchronized.
              </p>
            </div>

            <button
              onClick={toggleContrast}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-auralis-border bg-white text-xs font-bold text-auralis-text hover:bg-auralis-bg transition-colors shadow-tactile self-start sm:self-auto"
            >
              {isHighContrast ? (
                <>
                  <Sun className="w-4 h-4 text-auralis-warning" />
                  <span>Standard Theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-auralis-accent" />
                  <span>High-Contrast Mode</span>
                </>
              )}
            </button>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-auralis-border shadow-tactile">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-auralis-accent mb-1.5">
                <PlusCircle className="w-4 h-4" />
                <span>Join New Classroom</span>
              </div>
              <h2 className="font-heading font-bold text-xl text-auralis-text mb-2">
                Enter your instructor&apos;s 6-character classroom code
              </h2>
              <p className="text-xs text-auralis-muted leading-relaxed mb-6">
                Your instructor displays this code on the lecture projection or syllabus (e.g. <code className="font-mono font-bold text-auralis-accent bg-auralis-bg px-1.5 py-0.5 rounded">AURA-842</code>).
              </p>

              {joinError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{joinError}</span>
                </div>
              )}

              {joinSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-auralis-success" />
                  <span>{joinSuccess}</span>
                </div>
              )}

              <form onSubmit={handleJoinClassroom} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AURA-842"
                  maxLength={12}
                  className="flex-1 px-4 py-3 rounded-xl bg-white border border-auralis-border font-mono text-base font-bold text-auralis-text tracking-wider placeholder:text-auralis-muted focus:outline-none focus:ring-2 focus:ring-auralis-accent focus:border-auralis-accent focus:bg-white uppercase transition-colors"
                />
                <button
                  type="submit"
                  disabled={isJoining}
                  className="px-6 py-3 rounded-xl bg-auralis-accent hover:bg-auralis-accent-hover text-white font-heading font-bold text-sm shadow-tactile flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Join Classroom</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading font-bold text-xl text-auralis-text">
                  Your Enrolled Classrooms
                </h2>
                <p className="text-xs text-auralis-muted">
                  Click on any classroom to view real-time captions or study past lecture transcripts.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold bg-white border border-auralis-border px-2.5 py-1 rounded-md text-auralis-muted">
                {classrooms.length} Enrolled
              </span>
            </div>

            {classrooms.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-white border border-dashed border-auralis-border space-y-3">
                <BookOpen className="w-10 h-10 text-auralis-muted mx-auto" />
                <h3 className="font-heading font-bold text-base text-auralis-text">
                  No classrooms joined yet
                </h3>
                <p className="text-xs text-auralis-muted max-w-sm mx-auto">
                  Ask your teacher for their classroom code and enter it above to start participating.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {classrooms.map((cls) => {
                  const isLive = cls.lectures && cls.lectures.length > 0 && cls.lectures[0].status === "LIVE";
                  return (
                    <div
                      key={cls.id}
                      className="p-6 rounded-2xl bg-white border border-auralis-border hover:border-auralis-accent/60 transition-all shadow-tactile flex flex-col justify-between space-y-5"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-mono font-semibold text-auralis-accent bg-auralis-highlight px-2 py-0.5 rounded">
                            {cls.subject}
                          </span>
                          {isLive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-auralis-success" />
                              <span>LIVE NOW</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-auralis-muted">
                              Code: {cls.code}
                            </span>
                          )}
                        </div>

                        <h3 className="font-heading font-bold text-lg text-auralis-text">
                          {cls.name}
                        </h3>
                        {cls.description && (
                          <p className="text-xs text-auralis-muted mt-1 line-clamp-2">
                            {cls.description}
                          </p>
                        )}

                        <div className="mt-4 pt-3 border-t border-auralis-border/60 text-xs text-auralis-muted">
                          Instructor: <span className="font-semibold text-auralis-text">{cls.teacher?.name || "Faculty"}</span>
                        </div>
                      </div>

                      <Link
                        href={`/classroom/${cls.id}?role=student`}
                        className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-tactile ${
                          isLive
                            ? "bg-auralis-accent text-white hover:bg-auralis-accent-hover"
                            : "bg-auralis-bg hover:bg-auralis-surface border border-auralis-border text-auralis-text"
                        }`}
                      >
                        <Radio className="w-4 h-4" />
                        <span>{isLive ? "Join Live Caption Stream" : "Open Classroom Workspace"}</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
