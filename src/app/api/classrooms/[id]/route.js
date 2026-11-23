import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
    let isEnrolled = classroom.members.some((m) => m.userId === user.id);

    if (!isTeacher && !isEnrolled) {
      // Auto-enroll authenticated student/attendee into this classroom
      try {
        await prisma.classroomMember.create({
          data: {
            userId: user.id,
            classroomId: classroom.id,
          },
        });
        isEnrolled = true;
      } catch (e) {
        // Ignore unique constraint race condition
      }
    }

    return NextResponse.json(
      { classroom },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("GET Classroom by ID Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch classroom details" },
      { status: 500 }
    );
  }
}

// DELETE /api/classrooms/[id] - Permanently delete a classroom, its lectures, transcripts, and member enrollments
export async function DELETE(req, { params }) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const classroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        _count: {
          select: { members: true, lectures: true },
        },
      },
    });

    if (!classroom) {
      return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
    }

    // Verify user is either teacher of the classroom or an ADMIN
    const isTeacher = classroom.teacherId === user.id;
    const isTeacherRole = (user.role || "").toUpperCase() === "TEACHER";
    const isAdmin = (user.role || "").toUpperCase() === "ADMIN";

    if (!isTeacher && !isAdmin && !isTeacherRole) {
      return NextResponse.json(
        { error: "Forbidden: Only the instructor of this classroom or an administrator can delete it" },
        { status: 403 }
      );
    }

    // Safety Check: Classroom cannot be deleted if there are still lectures inside it
    const lectureCount = await prisma.lecture.count({
      where: { classroomId: id },
    });

    if (lectureCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete classroom: this classroom still contains ${lectureCount} lecture session${
            lectureCount === 1 ? "" : "s"
          }. Please delete all lectures inside this classroom first before deleting the classroom.`,
          lectureCount,
        },
        { status: 400 }
      );
    }

    // Cascade delete all student enrollments (classroom members)
    await prisma.classroomMember.deleteMany({
      where: { classroomId: id },
    });

    // Delete the classroom itself
    await prisma.classroom.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Classroom and all associated resources deleted successfully", id },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("DELETE Classroom Error:", error);
    return NextResponse.json(
      { error: "Failed to delete classroom" },
      { status: 500 }
    );
  }
}
