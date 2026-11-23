import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/lectures/[id] - Fetch detailed lecture data
export async function GET(req, { params }) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const lecture = await prisma.lecture.findUnique({
      where: { id },
      include: {
        classroom: {
          include: {
            teacher: {
              select: { id: true, name: true, email: true },
            },
            _count: {
              select: { members: true },
            },
          },
        },
        _count: {
          select: { transcripts: true },
        },
      },
    });

    if (!lecture) {
      return NextResponse.json({ error: "Lecture not found" }, { status: 404 });
    }

    // Check if user is either the teacher, admin, or an enrolled student
    const isTeacher = lecture.classroom.teacherId === user.id;
    const isAdmin = user.role === "ADMIN";

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

    return NextResponse.json(
      { lecture },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("GET Lecture [id] Error:", error);
    return NextResponse.json({ error: "Failed to fetch lecture details" }, { status: 500 });
  }
}

// PATCH /api/lectures/[id] - Update lecture status (e.g. end lecture)
export async function PATCH(req, { params }) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const lecture = await prisma.lecture.findUnique({
      where: { id },
      include: { classroom: true },
    });

    if (!lecture) {
      return NextResponse.json({ error: "Lecture not found" }, { status: 404 });
    }

    // Allow if user is teacher of the classroom, has TEACHER role, or is ADMIN
    const isClassTeacher = lecture.classroom.teacherId === user.id;
    const isTeacherRole = (user.role || "").toUpperCase() === "TEACHER";
    const isAdmin = (user.role || "").toUpperCase() === "ADMIN";

    if (!isClassTeacher && !isTeacherRole && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only instructors can modify lecture state" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status, title, transcripts = [] } = body;

    // Concluded lectures cannot be restarted!
    if (lecture.status === "COMPLETED" && (status === "LIVE" || status === "SCHEDULED" || status === "PAUSED")) {
      return NextResponse.json(
        { error: "This lecture has already concluded and cannot be restarted. Please create a new lecture for this classroom." },
        { status: 400 }
      );
    }

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (status) {
      updateData.status = status;
      if (status === "COMPLETED") {
        updateData.endedAt = new Date();
      } else if (status === "LIVE" && !lecture.startedAt) {
        updateData.startedAt = new Date();
      }
    }

    const updated = await prisma.lecture.update({
      where: { id },
      data: updateData,
    });

    // If transcripts were provided on conclusion, ensure any missing ones are saved
    if (Array.isArray(transcripts) && transcripts.length > 0) {
      try {
        const existingList = await prisma.transcript.findMany({
          where: { lectureId: id },
          select: { text: true },
        });
        const existingTexts = new Set(existingList.map((e) => (e.text || "").trim()));

        const formatted = transcripts
          .filter((t) => t?.text && !existingTexts.has(t.text.trim()))
          .map((t) => ({
            lectureId: id,
            userId: user.id,
            text: t.text.trim(),
            source: t.source || "SPEECH",
            confidence: t.confidence || 0.95,
            timestamp: t.timestamp ? new Date(t.timestamp) : new Date(),
          }));

        if (formatted.length > 0) {
          await prisma.transcript.createMany({ data: formatted });
        }
      } catch (trErr) {
        console.warn("Failed to save transcripts on lecture conclusion:", trErr);
      }
    }

    return NextResponse.json(
      { message: "Lecture updated successfully", lecture: updated },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("PATCH Lecture [id] Error:", error);
    return NextResponse.json({ error: "Failed to update lecture" }, { status: 500 });
  }
}

// DELETE /api/lectures/[id] - Permanently delete a lecture and its transcripts
export async function DELETE(req, { params }) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const lecture = await prisma.lecture.findUnique({
      where: { id },
      include: { classroom: true },
    });

    if (!lecture) {
      return NextResponse.json({ error: "Lecture not found" }, { status: 404 });
    }

    // Allow if user is teacher of the classroom, has TEACHER role, or is ADMIN
    const isClassTeacher = lecture.classroom?.teacherId === user.id;
    const isTeacherRole = (user.role || "").toUpperCase() === "TEACHER";
    const isAdmin = (user.role || "").toUpperCase() === "ADMIN";

    if (!isClassTeacher && !isAdmin && !isTeacherRole) {
      return NextResponse.json(
        { error: "Forbidden: Only instructors can delete lectures" },
        { status: 403 }
      );
    }

    // Explicitly cascade delete transcripts first to guarantee full cleanup
    await prisma.transcript.deleteMany({
      where: { lectureId: id },
    });

    // Delete the lecture record
    await prisma.lecture.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Lecture deleted successfully", id },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("DELETE Lecture [id] Error:", error);
    return NextResponse.json({ error: "Failed to delete lecture" }, { status: 500 });
  }
}
