import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

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
      const membership = await prisma.classroomMember.findUnique({
        where: {
          userId_classroomId: {
            userId: user.id,
            classroomId: lecture.classroomId,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Forbidden: You are not enrolled in this classroom" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ lecture }, { status: 200 });
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

    // Only teacher of the classroom or admin can update status
    if (lecture.classroom.teacherId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only the class instructor can modify lecture state" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status, title } = body;

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

    return NextResponse.json(
      { message: "Lecture updated successfully", lecture: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH Lecture [id] Error:", error);
    return NextResponse.json({ error: "Failed to update lecture" }, { status: 500 });
  }
}
