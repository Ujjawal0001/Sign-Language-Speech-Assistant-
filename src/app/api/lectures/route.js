import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// POST /api/lectures - Start / Create a new live lecture
export async function POST(req) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only instructors can start lectures" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { classroomId, title } = body;

    if (!classroomId) {
      return NextResponse.json({ error: "classroomId is required" }, { status: 400 });
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
    }

    if (classroom.teacherId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: You are not the teacher of this classroom" },
        { status: 403 }
      );
    }

    // Set any currently active lectures in this classroom to COMPLETED first
    await prisma.lecture.updateMany({
      where: { classroomId, status: "LIVE" },
      data: { status: "COMPLETED", endedAt: new Date() },
    });

    const lectureTitle = title?.trim() || `${classroom.subject} Lecture – ${new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`;

    const newLecture = await prisma.lecture.create({
      data: {
        title: lectureTitle,
        classroomId,
        status: "LIVE",
        startedAt: new Date(),
      },
      include: {
        classroom: {
          select: { name: true, subject: true, code: true },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Lecture started successfully",
        lecture: newLecture,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Lecture Error:", error);
    return NextResponse.json(
      { error: "Failed to start lecture" },
      { status: 500 }
    );
  }
}

// GET /api/lectures - Retrieve lectures for a classroom or full lecture history for current user
export async function GET(req) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classroomId = searchParams.get("classroomId");

    const whereClause = {};
    if (classroomId) {
      whereClause.classroomId = classroomId;
    } else {
      // Return history based on user role
      if (user.role === "TEACHER") {
        whereClause.classroom = { teacherId: user.id };
      } else if (user.role === "STUDENT") {
        whereClause.classroom = {
          members: {
            some: { userId: user.id },
          },
        };
      }
      // ADMIN sees all lectures without filter
    }

    const lectures = await prisma.lecture.findMany({
      where: whereClause,
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
            subject: true,
            code: true,
            teacher: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { transcripts: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ lectures }, { status: 200 });
  } catch (error) {
    console.error("GET Lectures Error:", error);
    return NextResponse.json({ error: "Failed to fetch lectures" }, { status: 500 });
  }
}
