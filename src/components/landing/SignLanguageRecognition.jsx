"use client";

import { useState } from "react";
import { Hand, Check, ShieldAlert, Sparkles, Eye, Camera, Activity, Layers, Scan } from "lucide-react";

export function SignLanguageRecognition() {
  const [selectedGesture, setSelectedGesture] = useState(0);
  const [viewMode, setViewMode] = useState("skeleton"); // "skeleton" | "silhouette"

  const supportedGestures = [
    {
      id: "question",
      name: "QUESTION / DOUBT",
      emoji: "☝️",
      category: "Static In-Class Pose",
      description: "Raised index finger held steadily facing instructor. Signals an academic doubt or question.",
      confidence: "95.4%",
      status: "Active",
      islGloss: "DOUBT_RAISE",
      triggerAction: "Raises Hand / Alerts Instructor Floor",
      fingerStates: [
        { name: "Index", state: "Extended Up", active: true },
        { name: "Thumb", state: "Folded Over Palm", active: false },
        { name: "Middle", state: "Curled Inward", active: false },
        { name: "Ring", state: "Curled Inward", active: false },
        { name: "Pinky", state: "Curled Inward", active: false },
      ],
      // MediaPipe keypoints scaled for 240x200 canvas
      skeleton: {
        wrist: [120, 180],
        thumb: [[120, 180], [95, 160], [80, 140], [90, 126], [102, 120]],
        index: [[120, 180], [108, 130], [106, 92], [104, 58], [102, 22]],
        middle: [[120, 180], [124, 130], [128, 114], [124, 128], [118, 138]],
        ring: [[120, 180], [138, 134], [142, 120], [138, 134], [132, 144]],
        pinky: [[120, 180], [152, 142], [156, 130], [152, 142], [146, 150]],
      },
      silhouetteSvg: (
        <g fill="#2FE4BD" fillOpacity="0.12" stroke="#2FE4BD" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
          {/* Stylized Pointing Hand Silhouette */}
          <path d="M102,22 C96,22 94,32 95,58 L96,120 C90,122 80,128 78,140 C76,152 88,166 100,175 L100,185 C108,188 132,188 140,185 L140,175 C155,165 162,150 160,135 C158,122 148,118 138,122 L138,100 C138,90 128,95 125,110 L125,95 C125,85 116,90 114,108 L114,58 C114,32 108,22 102,22 Z" />
        </g>
      ),
    },
    {
      id: "yes",
      name: "YES / AGREE (THUMBS UP)",
      emoji: "👍",
      category: "Pose Confirmation",
      description: "Closed fist with steady upward thumb. Confirms understanding or votes Affirmative in live polls.",
      confidence: "94.8%",
      status: "Active",
      islGloss: "AFFIRMATIVE_YES",
      triggerAction: "Submits 'YES' / Agrees with Poll",
      fingerStates: [
        { name: "Thumb", state: "Extended Straight Up", active: true },
        { name: "Index", state: "Curled into Fist", active: false },
        { name: "Middle", state: "Curled into Fist", active: false },
        { name: "Ring", state: "Curled into Fist", active: false },
        { name: "Pinky", state: "Curled into Fist", active: false },
      ],
      skeleton: {
        wrist: [120, 180],
        thumb: [[120, 180], [92, 155], [74, 125], [68, 85], [64, 45]],
        index: [[120, 180], [105, 138], [116, 120], [126, 130], [120, 142]],
        middle: [[120, 180], [118, 142], [130, 124], [140, 134], [134, 146]],
        ring: [[120, 180], [130, 148], [142, 130], [152, 140], [145, 152]],
        pinky: [[120, 180], [140, 154], [152, 138], [160, 148], [154, 158]],
      },
      silhouetteSvg: (
        <g fill="#2FE4BD" fillOpacity="0.12" stroke="#2FE4BD" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
          {/* Thumbs Up Silhouette */}
          <path d="M64,45 C58,45 56,58 60,85 C64,110 74,126 84,136 L84,155 C90,172 108,182 120,185 C132,185 148,176 156,160 C165,145 162,125 150,118 C144,115 132,118 126,124 C120,115 110,115 104,122 C98,116 88,118 82,126 L82,85 C82,58 70,45 64,45 Z" />
        </g>
      ),
    },
    {
      id: "no",
      name: "NO / DISAGREE (THUMBS DOWN)",
      emoji: "👎",
      category: "Pose Rejection",
      description: "Closed fist with steady downward thumb. Indicates negative reply or votes Negative in polls.",
      confidence: "93.6%",
      status: "Active",
      islGloss: "NEGATIVE_NO",
      triggerAction: "Submits 'NO' / Rejects Concept",
      fingerStates: [
        { name: "Thumb", state: "Extended Pointing Down", active: true },
        { name: "Index", state: "Curled into Fist", active: false },
        { name: "Middle", state: "Curled into Fist", active: false },
        { name: "Ring", state: "Curled into Fist", active: false },
        { name: "Pinky", state: "Curled into Fist", active: false },
      ],
      skeleton: {
        wrist: [120, 40],
        thumb: [[120, 40], [92, 65], [74, 95], [68, 135], [64, 175]],
        index: [[120, 40], [105, 82], [116, 100], [126, 90], [120, 78]],
        middle: [[120, 40], [118, 78], [130, 96], [140, 86], [134, 74]],
        ring: [[120, 40], [130, 72], [142, 90], [152, 80], [145, 68]],
        pinky: [[120, 40], [140, 66], [152, 82], [160, 72], [154, 62]],
      },
      silhouetteSvg: (
        <g fill="#2FE4BD" fillOpacity="0.12" stroke="#2FE4BD" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
          {/* Thumbs Down Silhouette */}
          <path d="M64,175 C58,175 56,162 60,135 C64,110 74,94 84,84 L84,65 C90,48 108,38 120,35 C132,35 148,44 156,60 C165,75 162,95 150,102 C144,105 132,102 126,96 C120,105 110,105 104,98 C98,104 88,102 82,94 L82,135 C82,162 70,175 64,175 Z" />
        </g>
      ),
    },
    {
      id: "peace",
      name: "PEACE / OPTION B (V-SIGN)",
      emoji: "✌️",
      category: "Multi-Choice Selection",
      description: "Index and middle fingers extended in a crisp V shape. Answers Option B in classroom polls.",
      confidence: "96.2%",
      status: "Active",
      islGloss: "VICTORY_PEACE_B",
      triggerAction: "Selects Poll Option B / Signals Victory",
      fingerStates: [
        { name: "Index", state: "Extended Left Diag", active: true },
        { name: "Middle", state: "Extended Right Diag", active: true },
        { name: "Thumb", state: "Holding Curled Digits", active: false },
        { name: "Ring", state: "Curled into Palm", active: false },
        { name: "Pinky", state: "Curled into Palm", active: false },
      ],
      skeleton: {
        wrist: [120, 180],
        thumb: [[120, 180], [92, 160], [84, 140], [96, 130], [108, 126]],
        index: [[120, 180], [104, 130], [94, 90], [84, 55], [74, 25]],
        middle: [[120, 180], [122, 130], [130, 90], [140, 55], [150, 25]],
        ring: [[120, 180], [138, 136], [144, 122], [140, 136], [134, 146]],
        pinky: [[120, 180], [152, 144], [156, 132], [152, 144], [146, 152]],
      },
      silhouetteSvg: (
        <g fill="#2FE4BD" fillOpacity="0.12" stroke="#2FE4BD" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
          {/* Peace / V-Sign Silhouette */}
          <path d="M74,25 C66,28 72,42 80,62 L94,98 C88,102 78,114 76,132 C74,152 88,172 108,180 L132,180 C150,172 164,150 160,132 C158,116 148,110 138,114 L132,96 C138,76 144,48 150,25 C156,22 160,32 152,58 L142,94 C136,92 128,94 122,100 C116,94 108,92 102,94 L92,58 C86,38 80,22 74,25 Z" />
        </g>
      ),
    },
    {
      id: "ok",
      name: "UNDERSTOOD / OK",
      emoji: "👌",
      category: "Precision Pinch",
      description: "Index fingertip touches thumb tip to form a circle with remaining three fingers spread upwards.",
      confidence: "95.1%",
      status: "Active",
      islGloss: "CONFIRM_OK_PERFECT",
      triggerAction: "Confirms Understanding / Feedback",
      fingerStates: [
        { name: "Thumb", state: "Touching Index Tip", active: true },
        { name: "Index", state: "Curled to Touch Thumb", active: true },
        { name: "Middle", state: "Extended Upright", active: true },
        { name: "Ring", state: "Extended Upright", active: true },
        { name: "Pinky", state: "Extended Upright", active: true },
      ],
      skeleton: {
        wrist: [120, 185],
        thumb: [[120, 185], [96, 160], [82, 135], [80, 108], [94, 96]],
        index: [[120, 185], [105, 140], [104, 115], [98, 100], [94, 96]],
        middle: [[120, 185], [122, 132], [128, 92], [132, 58], [136, 26]],
        ring: [[120, 185], [136, 138], [144, 100], [150, 68], [154, 38]],
        pinky: [[120, 185], [148, 146], [158, 114], [164, 86], [168, 58]],
      },
      silhouetteSvg: (
        <g fill="#2FE4BD" fillOpacity="0.12" stroke="#2FE4BD" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
          {/* OK Sign Silhouette */}
          <path d="M94,96 C86,96 74,106 74,120 C74,136 86,155 102,174 L120,185 L136,182 C152,174 168,150 166,132 L168,58 C168,48 160,52 158,68 L154,38 C154,28 146,32 144,48 L136,26 C136,16 128,20 126,38 L122,106 C114,96 104,96 94,96 Z" />
          <circle cx="94" cy="104" r="8" fill="#0B1513" stroke="#2FE4BD" strokeWidth="2" />
        </g>
      ),
    },
    {
      id: "hello",
      name: "HELLO / OPEN PALM",
      emoji: "✋",
      category: "Open Hand Pose",
      description: "All five fingers fanned and extended facing camera. Signals greeting, attendance, or pause.",
      confidence: "97.4%",
      status: "Active",
      islGloss: "GREETING_OPEN_PALM",
      triggerAction: "Greets Class / Signals Presence",
      fingerStates: [
        { name: "Thumb", state: "Extended Outward", active: true },
        { name: "Index", state: "Extended Upright", active: true },
        { name: "Middle", state: "Extended Upright", active: true },
        { name: "Ring", state: "Extended Upright", active: true },
        { name: "Pinky", state: "Extended Upright", active: true },
      ],
      skeleton: {
        wrist: [120, 185],
        thumb: [[120, 185], [92, 165], [70, 145], [54, 125], [42, 105]],
        index: [[120, 185], [105, 130], [98, 88], [92, 54], [86, 22]],
        middle: [[120, 185], [120, 126], [120, 80], [120, 44], [120, 15]],
        ring: [[120, 185], [135, 130], [142, 88], [148, 54], [154, 22]],
        pinky: [[120, 185], [148, 140], [162, 104], [174, 74], [184, 46]],
      },
      silhouetteSvg: (
        <g fill="#2FE4BD" fillOpacity="0.12" stroke="#2FE4BD" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
          {/* Full Open Palm Silhouette */}
          <path d="M42,105 C36,105 38,118 52,135 L68,154 L100,185 L140,185 L168,160 C178,148 186,132 184,116 L184,46 C184,36 174,40 170,58 L154,22 C154,12 144,16 142,34 L120,15 C120,5 110,8 110,28 L86,22 C86,12 76,16 78,38 L84,94 C76,96 66,102 58,110 L42,105 Z" />
        </g>
      ),
    },
    {
      id: "important",
      name: "IMPORTANT / FIST",
      emoji: "✊",
      category: "Closed Fist",
      description: "All five fingers tightly curled into a firm solid fist. Instructs system to bookmark topic.",
      confidence: "95.0%",
      status: "Active",
      islGloss: "KEYPOINT_BOOKMARK",
      triggerAction: "Bookmarks Concept for Review",
      fingerStates: [
        { name: "Thumb", state: "Curled Across Fingers", active: false },
        { name: "Index", state: "Curled into Fist", active: false },
        { name: "Middle", state: "Curled into Fist", active: false },
        { name: "Ring", state: "Curled into Fist", active: false },
        { name: "Pinky", state: "Curled into Fist", active: false },
      ],
      skeleton: {
        wrist: [120, 180],
        thumb: [[120, 180], [98, 155], [88, 138], [102, 128], [116, 126]],
        index: [[120, 180], [106, 134], [112, 112], [118, 124], [114, 136]],
        middle: [[120, 180], [120, 134], [126, 114], [132, 126], [126, 138]],
        ring: [[120, 180], [132, 136], [138, 118], [144, 130], [138, 142]],
        pinky: [[120, 180], [144, 140], [150, 124], [156, 136], [150, 146]],
      },
      silhouetteSvg: (
        <g fill="#2FE4BD" fillOpacity="0.12" stroke="#2FE4BD" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
          {/* Fist Silhouette */}
          <path d="M88,138 C80,146 86,166 100,178 L120,180 L140,178 C158,166 166,145 162,126 C158,108 144,106 132,108 C128,104 116,104 110,108 C104,106 94,110 88,122 L88,138 Z" />
        </g>
      ),
    },
    {
      id: "help",
      name: "HELP / ASSIST",
      emoji: "🤲",
      category: "Support Gesture",
      description: "Flat horizontal cupped hand resting forward. Triggers priority student assistance alert.",
      confidence: "91.8%",
      status: "Active",
      islGloss: "URGENT_ASSIST_HELP",
      triggerAction: "Notifies Instructor for Support",
      fingerStates: [
        { name: "Thumb", state: "Aligned with Palm", active: true },
        { name: "Index", state: "Extended Horizontal", active: true },
        { name: "Middle", state: "Extended Horizontal", active: true },
        { name: "Ring", state: "Extended Horizontal", active: true },
        { name: "Pinky", state: "Extended Horizontal", active: true },
      ],
      skeleton: {
        wrist: [60, 140],
        thumb: [[60, 140], [80, 120], [105, 108], [130, 104], [150, 102]],
        index: [[60, 140], [92, 128], [125, 122], [155, 118], [185, 114]],
        middle: [[60, 140], [95, 136], [128, 132], [158, 128], [188, 124]],
        ring: [[60, 140], [96, 144], [126, 140], [154, 136], [182, 132]],
        pinky: [[60, 140], [94, 152], [120, 148], [146, 144], [172, 140]],
      },
      silhouetteSvg: (
        <g fill="#2FE4BD" fillOpacity="0.12" stroke="#2FE4BD" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
          {/* Flat Cupped Hand Silhouette */}
          <path d="M60,140 C56,155 70,165 94,162 L150,154 C174,148 195,138 190,120 C186,108 170,104 150,102 C134,102 110,108 92,116 L60,140 Z" />
        </g>
      ),
    },
  ];

  const current = supportedGestures[selectedGesture];

  return (
    <section className="py-24 border-t border-auralis-border bg-auralis-bg" id="sign-language">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-auralis-accent bg-auralis-highlight border border-auralis-secondary/60 mb-4">
            <Camera className="w-3.5 h-3.5 text-auralis-accent" />
            <span>Computer Vision Innovation</span>
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-auralis-text mb-4">
            Indian Sign Language (ISL) recognition inside the browser.
          </h2>
          <p className="text-base text-auralis-muted leading-relaxed">
            Students who communicate using sign language can express questions, poll answers, and confirmations without needing an intermediary. Our camera pipeline tracks 21 three-dimensional skeletal coordinates in real-time.
          </p>
        </div>

        {/* 2-Column Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Gesture Cards with Visual Sign Icons */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-auralis-muted mb-2 px-1">
              <span>Select Validated Sign Gesture:</span>
              <span className="font-mono text-[11px] text-auralis-accent">{supportedGestures.length} Gestures Model</span>
            </div>

            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {supportedGestures.map((gesture, idx) => {
                const isSelected = selectedGesture === idx;
                return (
                  <div
                    key={gesture.id}
                    onClick={() => setSelectedGesture(idx)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-white border-auralis-accent shadow-tactile ring-2 ring-auralis-accent/15"
                        : "bg-white/60 hover:bg-white border-auralis-border/80 hover:border-auralis-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Visual Hand Emoji & Picture Badge */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform ${
                          isSelected
                            ? "bg-auralis-highlight border-2 border-auralis-accent scale-105 shadow-sm"
                            : "bg-auralis-bg border border-auralis-border"
                        }`}
                      >
                        <span>{gesture.emoji}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-bold text-sm text-auralis-text truncate">
                            {gesture.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-auralis-muted truncate mt-0.5">
                          {gesture.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                        {gesture.confidence}
                      </span>
                      <span className="text-[10px] font-mono text-auralis-muted">
                        {gesture.islGloss}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Visual Hand Gesture Diagram & 21-Landmark Skeleton */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl bg-white border border-auralis-border p-6 sm:p-7 shadow-tactile space-y-6">
              {/* Header with Switcher */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-auralis-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-auralis-dark text-white flex items-center justify-center text-xl shadow-tactile">
                    {current.emoji}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-auralis-accent">
                      {current.category}
                    </span>
                    <h3 className="font-heading font-extrabold text-xl text-auralis-text">
                      {current.name}
                    </h3>
                  </div>
                </div>

                {/* View Switcher: Skeleton vs Silhouette */}
                <div className="flex items-center gap-1 p-1 bg-auralis-bg rounded-xl border border-auralis-border self-stretch sm:self-auto justify-center">
                  <button
                    type="button"
                    onClick={() => setViewMode("skeleton")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewMode === "skeleton"
                        ? "bg-auralis-accent text-white shadow-tactile"
                        : "text-auralis-muted hover:text-auralis-text"
                    }`}
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>21-Landmark Mesh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("silhouette")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewMode === "silhouette"
                        ? "bg-auralis-accent text-white shadow-tactile"
                        : "text-auralis-muted hover:text-auralis-text"
                    }`}
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>Hand Pose Illustration</span>
                  </button>
                </div>
              </div>

              {/* High-Tech Interactive Visual Gesture Canvas */}
              <div className="relative rounded-2xl overflow-hidden bg-[#0B1513] border border-emerald-900/40 shadow-inner flex flex-col items-center justify-center p-6 min-h-[290px]">
                {/* Background Tech Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#176B6022_1px,transparent_1px),linear-gradient(to_bottom,#176B6022_1px,transparent_1px)] bg-[size:20px_20px]" />

                {/* Floating Status Badges */}
                <div className="absolute top-3.5 left-4 z-20 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-semibold backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>MediaPipe Vision Active</span>
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-white/80">
                    21 Joints Tracked
                  </span>
                </div>

                <div className="absolute top-3.5 right-4 z-20">
                  <span className="text-[11px] font-mono font-bold text-[#FFE27A] bg-black/50 px-2.5 py-1 rounded-full border border-[#FFE27A]/30">
                    Confidence: {current.confidence}
                  </span>
                </div>

                {/* Main Dynamic SVG Diagram of Hand Pose */}
                <svg
                  className="w-full max-w-[340px] h-56 relative z-10 filter drop-shadow-[0_0_12px_rgba(47,228,189,0.3)]"
                  viewBox="0 0 240 200"
                >
                  {/* Silhouette layer if selected */}
                  {(viewMode === "silhouette" || viewMode === "skeleton") && current.silhouetteSvg}

                  {/* 21-Landmark Bones & Joints Layer */}
                  {viewMode === "skeleton" && (
                    <g>
                      {/* Palm Base Lines */}
                      <line
                        x1={current.skeleton.wrist[0]}
                        y1={current.skeleton.wrist[1]}
                        x2={current.skeleton.thumb[1][0]}
                        y2={current.skeleton.thumb[1][1]}
                        stroke="#2FE4BD"
                        strokeWidth="2.5"
                        strokeOpacity="0.7"
                      />
                      <line
                        x1={current.skeleton.wrist[0]}
                        y1={current.skeleton.wrist[1]}
                        x2={current.skeleton.index[1][0]}
                        y2={current.skeleton.index[1][1]}
                        stroke="#2FE4BD"
                        strokeWidth="2.5"
                        strokeOpacity="0.7"
                      />
                      <line
                        x1={current.skeleton.wrist[0]}
                        y1={current.skeleton.wrist[1]}
                        x2={current.skeleton.pinky[1][0]}
                        y2={current.skeleton.pinky[1][1]}
                        stroke="#2FE4BD"
                        strokeWidth="2.5"
                        strokeOpacity="0.7"
                      />
                      <line
                        x1={current.skeleton.index[1][0]}
                        y1={current.skeleton.index[1][1]}
                        x2={current.skeleton.pinky[1][0]}
                        y2={current.skeleton.pinky[1][1]}
                        stroke="#2FE4BD"
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                      />

                      {/* Finger Polyline Bones */}
                      {["thumb", "index", "middle", "ring", "pinky"].map((finger) => {
                        const pts = current.skeleton[finger];
                        const pointsString = pts.map((p) => p.join(",")).join(" ");
                        return (
                          <polyline
                            key={finger}
                            points={pointsString}
                            stroke="#2FE4BD"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        );
                      })}

                      {/* Wrist Keypoint (Point 0) */}
                      <circle
                        cx={current.skeleton.wrist[0]}
                        cy={current.skeleton.wrist[1]}
                        r="5"
                        fill="#FFE27A"
                        stroke="#0B1513"
                        strokeWidth="2"
                      />

                      {/* Finger Joint Circles (Points 1 - 20) */}
                      {["thumb", "index", "middle", "ring", "pinky"].map((finger) => {
                        const pts = current.skeleton[finger];
                        return pts.slice(1).map((pt, jIdx) => {
                          const isTip = jIdx === pts.length - 2;
                          return (
                            <circle
                              key={`${finger}-${jIdx}`}
                              cx={pt[0]}
                              cy={pt[1]}
                              r={isTip ? "5" : "3.5"}
                              fill={isTip ? "#FFE27A" : "#2FE4BD"}
                              stroke="#0B1513"
                              strokeWidth="1.5"
                              className={isTip ? "animate-pulse" : ""}
                            />
                          );
                        });
                      })}
                    </g>
                  )}
                </svg>

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-3 inset-x-4 z-20 flex items-center justify-between text-[11px] font-mono text-white/70 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFE27A]" />
                    <span>Pose: <strong>{current.islGloss}</strong></span>
                  </span>
                  <span className="text-emerald-400 font-semibold">{current.triggerAction}</span>
                </div>
              </div>

              {/* Finger Pose State Analysis Matrix */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-auralis-muted mb-2.5">
                  Real-time Finger Kinematics Detected:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {current.fingerStates.map((f) => (
                    <div
                      key={f.name}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        f.active
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200"
                          : "bg-auralis-bg border-auralis-border text-auralis-muted"
                      }`}
                    >
                      <div className="text-[10px] uppercase font-mono font-bold opacity-75">{f.name}</div>
                      <div className={`text-xs font-bold mt-0.5 ${f.active ? "text-emerald-600 dark:text-emerald-400" : "text-auralis-text"}`}>
                        {f.state}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Academic Perception Guarantees */}
              <div className="space-y-3 pt-3 border-t border-auralis-border text-xs text-auralis-muted leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-auralis-success shrink-0 mt-0.5" />
                  <span>
                    <strong>Wrist-Relative Invariance:</strong> Keypoints are translated relative to Keypoint 0 (wrist), so hand position anywhere in the camera frame is tracked accurately.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-auralis-success shrink-0 mt-0.5" />
                  <span>
                    <strong>Scale Normalization:</strong> Landmark distances are divided by the distance between wrist and middle MCP keypoint to accommodate varying distances from the webcam.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-auralis-success shrink-0 mt-0.5" />
                  <span>
                    <strong>Temporal Gesture Stabilization:</strong> Movement signs evaluate coordinate vectors across a sliding FIFO window to eliminate accidental hand twitching.
                  </span>
                </div>
              </div>
            </div>

            {/* Rejection Filter Box */}
            <div className="rounded-2xl bg-auralis-highlight/50 border border-auralis-secondary p-5">
              <div className="flex items-center gap-2.5 text-auralis-accent mb-2">
                <ShieldAlert className="w-5 h-5 text-auralis-accent" />
                <h4 className="font-heading font-bold text-sm text-auralis-dark">
                  Academic Integrity: Strict Confidence Threshold
                </h4>
              </div>
              <p className="text-xs text-auralis-text/80 leading-relaxed">
                If a student scratches their hair or holds a pen, Auralis does <strong>not</strong> invent false predictions. Any landmark score below <strong>78% confidence</strong> triggers an explicit <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono text-auralis-accent font-bold">UNKNOWN_GESTURE</code> state.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
