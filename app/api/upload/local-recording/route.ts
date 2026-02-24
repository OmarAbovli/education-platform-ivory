import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const roomName = formData.get("roomName") as string | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create uploads directory if keeping locally
        const uploadDir = join(process.cwd(), "public/uploads/recordings");
        await mkdir(uploadDir, { recursive: true });

        const fileName = `${roomName || randomUUID()}-${Date.now()}.webm`;
        const filePath = join(uploadDir, fileName);

        await writeFile(filePath, buffer);

        const publicUrl = `/uploads/recordings/${fileName}`;

        return NextResponse.json({ success: true, url: publicUrl });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
