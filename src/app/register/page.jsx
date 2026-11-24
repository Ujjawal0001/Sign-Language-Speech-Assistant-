"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/lib/validations/auth";
import {
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Check,
  Lock,
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role")?.toUpperCase();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: initialRole === "TEACHER" ? "TEACHER" : "STUDENT",
    },
  });

  const selectedRole = watch("role");
  const emailValue = watch("email") || "";
  const passwordValue = watch("password") || "";

  // Live Email Validation Checks
  const isEmailFormatValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailValue.trim());

  // Live Password Validation Criteria
  const passwordCriteria = [
    { id: "len", label: "At least 8 characters", met: passwordValue.length >= 8 },
    { id: "upper", label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(passwordValue) },
    { id: "lower", label: "One lowercase letter (a-z)", met: /[a-z]/.test(passwordValue) },
    { id: "num", label: "One number (0-9)", met: /[0-9]/.test(passwordValue) },
    { id: "sym", label: "One special character (!@#$%...)", met: /[^a-zA-Z0-9]/.test(passwordValue) },
  ];

  const metCriteriaCount = passwordCriteria.filter((c) => c.met).length;

  const getStrengthMeta = () => {
    if (!passwordValue) return { label: "", color: "bg-gray-200", text: "text-gray-400", width: "0%" };
    if (metCriteriaCount <= 2) return { label: "Weak", color: "bg-red-500", text: "text-red-600", width: "30%" };
    if (metCriteriaCount <= 4) return { label: "Moderate", color: "bg-amber-500", text: "text-amber-600", width: "70%" };
    return { label: "Strong & Secure", color: "bg-emerald-500", text: "text-emerald-600", width: "100%" };
  };

  const strength = getStrengthMeta();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setServerError(result.error || "Registration failed. Please review your input.");
        setIsLoading(false);
        return;
      }

      // Route to role-specific dashboard upon successful registration
      if (result.user.role === "TEACHER") {
        router.push("/teacher/dashboard");
      } else if (result.user.role === "STUDENT") {
        router.push("/student/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setServerError("Network connection error. Please ensure the backend is running.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-auralis-bg">
      <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-auralis-accent rounded-lg"
          >
            <div className="w-9 h-9 rounded-xl bg-auralis-dark text-white flex items-center justify-center font-bold text-base shadow-tactile border border-auralis-accent/30">
              <span className="text-auralis-secondary font-heading">A</span>
            </div>
            <span className="font-heading font-extrabold text-xl tracking-tight text-auralis-text">
              AURALIS
            </span>
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto my-8">
          <div className="mb-6">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-auralis-accent bg-auralis-highlight px-3 py-1 rounded-full border border-auralis-secondary/60">
              Registration
            </span>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-auralis-text tracking-tight mt-3 mb-2">
              Create your Auralis account.
            </h1>
            <p className="text-sm text-auralis-muted">
              Select your academic role to personalize your live caption workspace.
            </p>
          </div>

          {serverError && (
            <div
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3 mb-6"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <span className="font-bold">Registration error: </span>
                {serverError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-auralis-text mb-2.5">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue("role", "TEACHER")}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    selectedRole === "TEACHER"
                      ? "bg-white border-auralis-accent shadow-tactile ring-2 ring-auralis-accent/15"
                      : "bg-white/60 border-auralis-border hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        selectedRole === "TEACHER"
                          ? "bg-auralis-accent text-white"
                          : "bg-auralis-bg text-auralis-muted"
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    {selectedRole === "TEACHER" && (
                      <CheckCircle2 className="w-4 h-4 text-auralis-accent" />
                    )}
                  </div>
                  <div className="font-heading font-bold text-sm text-auralis-text">Instructor</div>
                  <div className="text-[11px] text-auralis-muted">Broadcast lectures & captions</div>
                </button>

                <button
                  type="button"
                  onClick={() => setValue("role", "STUDENT")}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    selectedRole === "STUDENT"
                      ? "bg-white border-auralis-accent shadow-tactile ring-2 ring-auralis-accent/15"
                      : "bg-white/60 border-auralis-border hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        selectedRole === "STUDENT"
                          ? "bg-auralis-accent text-white"
                          : "bg-auralis-bg text-auralis-muted"
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                    </div>
                    {selectedRole === "STUDENT" && (
                      <CheckCircle2 className="w-4 h-4 text-auralis-accent" />
                    )}
                  </div>
                  <div className="font-heading font-bold text-sm text-auralis-text">Student</div>
                  <div className="text-[11px] text-auralis-muted">Read captions & sign doubts</div>
                </button>
              </div>
              {errors.role && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.role.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-xs font-bold uppercase tracking-wider text-auralis-text mb-2"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                disabled={isLoading}
                {...register("name")}
                placeholder="Prof. Ananya Sharma or Aarav Patel"
                className={`w-full px-4 py-3 rounded-xl bg-white border text-sm text-auralis-text placeholder:text-auralis-muted/60 transition-colors shadow-tactile focus:outline-none focus:ring-2 focus:ring-auralis-accent ${
                  errors.name ? "border-red-400 bg-red-50/20" : "border-auralis-border"
                }`}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="mt-1.5 text-xs text-red-600 font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-auralis-text"
                >
                  Email Address
                </label>
                {emailValue && isEmailFormatValid && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Valid format</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  {...register("email")}
                  placeholder="name@university.edu"
                  className={`w-full px-4 py-3 rounded-xl bg-white border text-sm text-auralis-text placeholder:text-auralis-muted/60 transition-colors shadow-tactile focus:outline-none focus:ring-2 focus:ring-auralis-accent ${
                    errors.email
                      ? "border-red-400 bg-red-50/20"
                      : isEmailFormatValid
                      ? "border-emerald-500/70 focus:border-emerald-500"
                      : "border-auralis-border"
                  }`}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {emailValue && isEmailFormatValid && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-red-600 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-auralis-text"
                >
                  Password
                </label>
                {passwordValue && (
                  <span className={`text-[11px] font-bold ${strength.text}`}>
                    Strength: {strength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...register("password")}
                  placeholder="Create a strong password"
                  className={`w-full px-4 py-3 rounded-xl bg-white border text-sm text-auralis-text placeholder:text-auralis-muted/60 transition-colors shadow-tactile pr-11 focus:outline-none focus:ring-2 focus:ring-auralis-accent ${
                    errors.password
                      ? "border-red-400 bg-red-50/20"
                      : metCriteriaCount === 5
                      ? "border-emerald-500/70"
                      : "border-auralis-border"
                  }`}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-auralis-muted hover:text-auralis-text p-1 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Progress Bar */}
              {passwordValue && (
                <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
              )}

              {/* Password Requirement Checklist */}
              <div className="mt-2.5 p-3 rounded-xl bg-white border border-auralis-border shadow-sm text-xs space-y-1.5">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-auralis-muted block mb-1">
                  Password Requirements:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {passwordCriteria.map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                        c.met
                          ? "text-emerald-700 font-bold"
                          : "text-auralis-muted opacity-80"
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                          c.met ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {c.met ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <span className="w-1 h-1 rounded-full bg-gray-400" />}
                      </div>
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {errors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-red-600 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-6 rounded-xl bg-auralis-accent hover:bg-auralis-accent-hover text-white font-heading font-bold text-sm transition-all shadow-tactile flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-auralis-accent focus-visible:ring-offset-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-auralis-secondary" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-auralis-border/80 text-center text-xs text-auralis-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-auralis-accent hover:underline focus:outline-none"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="text-[11px] text-auralis-muted text-center sm:text-left flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-auralis-accent shrink-0" />
          <span>Passwords securely salted and hashed with bcrypt. Never logged in plain text.</span>
        </div>
      </div>

      <div className="hidden lg:flex lg:col-span-5 bg-auralis-dark text-white p-12 lg:p-16 flex-col justify-between relative overflow-hidden border-l border-auralis-dark">
        <div className="absolute inset-0 bg-[radial-gradient(#2FE4BD10_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-mono font-bold tracking-wider text-auralis-secondary uppercase mb-8">
            <span>INCLUSIVE EDUCATION</span>
          </div>

          <h2 className="font-heading font-extrabold text-3xl lg:text-4xl text-white tracking-tight leading-tight mb-6">
            Join the movement toward truly barrier-free learning.
          </h2>

          <p className="text-sm text-white/70 leading-relaxed mb-8">
            Whether you are an instructor creating welcoming lectures or a student seeking unhindered participation, Auralis is designed to support your academic journey.
          </p>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="text-xs font-bold text-auralis-secondary uppercase tracking-wider">
              What You Get Instantly:
            </div>
            <ul className="text-xs text-white/80 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-auralis-secondary font-bold">✓</span>
                <span>Immediate access to create or join live lecture rooms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-auralis-secondary font-bold">✓</span>
                <span>Automatic lecture transcription and downloadable records</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-auralis-secondary font-bold">✓</span>
                <span>Real-time Indian Sign Language (ISL) gesture recognition</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/15 text-xs text-white/50 font-mono">
          <span>AURALIS • EVERY VOICE. EVERY GESTURE. EVERY STUDENT.</span>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-auralis-bg">
          <Loader2 className="w-8 h-8 animate-spin text-auralis-accent" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
