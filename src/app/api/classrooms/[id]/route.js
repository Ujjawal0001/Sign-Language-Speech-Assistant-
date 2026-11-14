import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: params.id },
      include: {
        teacher: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { joinedAt: "desc" },
        },
        lectures: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            status: true,
            startedAt: true,
            endedAt: true,
            createdAt: true,
            _count: {
              select: { transcripts: true },
            },
          },
        },
        _count: {
          select: { members: true, lectures: true },
        },
      },
    });

    if (!classroom) {
      return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
    }

    // Verify user is either teacher of the classroom or an enrolled student
    const isTeacher = classroom.teacherId === user.id;
    const isEnrolled = classroom.members.some((m) => m.userId === user.id);

    if (!isTeacher && !isEnrolled && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this classroom" },
        { status: 403 }
      );
    }

    return NextResponse.json({ classroom }, { status: 200 });
  } catch (error) {
    console.error("GET Classroom by ID Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch classroom details" },
      { status: 500 }
    );
  }
}
