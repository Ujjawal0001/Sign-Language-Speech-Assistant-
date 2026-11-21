import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

const transcriptSchema = z.object({
  lectureId: z.string().min(1, "lectureId is required"),
  text: z.string().min(1, "Caption text cannot be empty"),
  source: z.enum(["SPEECH", "SIGN_LANGUAGE", "MANUAL_CORRECTION"]).default("SPEECH"),
  confidence: z.number().min(0).max(1).default(1.0),
});

// POST /api/transcripts - Save a finalized caption segment
export async function POST(req) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = transcriptSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { lectureId, text, source, confidence } = validation.data;

    // Verify lecture exists and is LIVE
    const lecture = await prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { classroom: true },
    });

    if (!lecture) {
      return NextResponse.json({ error: "Lecture not found" }, { status: 404 });
    }

    // Check membership / teacher status
    const isTeacher = lecture.classroom.teacherId === user.id || (user.role || "").toUpperCase() === "TEACHER";
    const isAdmin = (user.role || "").toUpperCase() === "ADMIN";

    if (lecture.status === "COMPLETED") {
      return NextResponse.json(
        { error: "This lecture has concluded. New captions cannot be appended to a concluded session." },
        { status: 400 }
      );
    }

    if (!isTeacher && !isAdmin) {
      try {
        const membership = await prisma.classroomMember.findUnique({
          where: {
            userId_classroomId: {
              userId: user.id,
              classroomId: lecture.classroomId,
            },
          },
        });

        if (!membership) {
          await prisma.classroomMember.create({
            data: {
              userId: user.id,
              classroomId: lecture.classroomId,
            },
          });
        }
      } catch (enrollErr) {
        // Ignore duplicate key race condition
      }
    }

    const newTranscript = await prisma.transcript.create({
      data: {
        lectureId,
        userId: user.id,
        text: text.trim(),
        source,
        confidence,
      },
      include: {
        speaker: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json(
      { message: "Transcript segment persisted", transcript: newTranscript },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Transcript Error:", error);
    return NextResponse.json({ error: "Failed to save transcript" }, { status: 500 });
  }
}
