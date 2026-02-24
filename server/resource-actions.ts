'use server'

import { sql } from '@/server/db'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

// Helper to check if the current user is the teacher who owns the video associated with a resource
async function canModifyResource(resourceId: string) {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionCookie)
    if (!user || user.role !== 'teacher') {
        return { can: false, error: 'Unauthorized' };
    }

    const [resource] = await sql`
        SELECT v.teacher_id 
        FROM resources r
        JOIN videos v ON r.video_id = v.id
        WHERE r.id = ${resourceId}
    `;

    if (!resource || resource.teacher_id !== user.id) {
        return { can: false, error: 'Forbidden' };
    }

    return { can: true, error: null };
}

// Helper to check if the current user is the teacher who owns the video
async function canModifyVideo(videoId: string) {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionCookie)
    if (!user || user.role !== 'teacher') {
        return { can: false, error: 'Unauthorized' };
    }

    const [video] = await sql`SELECT teacher_id FROM videos WHERE id = ${videoId}`;

    if (!video || video.teacher_id !== user.id) {
        return { can: false, error: 'Forbidden' };
    }

    return { can: true, error: null };
}

export async function createResource(videoId: string, title: string, url: string) {
    const auth = await canModifyVideo(videoId);
    if (!auth.can) {
        throw new Error(auth.error);
    }

    const resourceId = "res_" + randomUUID();
    await sql`
        INSERT INTO resources (id, video_id, title, url)
        VALUES (${resourceId}, ${videoId}, ${title}, ${url});
    `;

    return { success: true, resourceId };
}

export async function updateResource(resourceId: string, title: string, url: string) {
    const auth = await canModifyResource(resourceId);
    if (!auth.can) {
        throw new Error(auth.error);
    }

    await sql`
        UPDATE resources
        SET title = ${title}, url = ${url}
        WHERE id = ${resourceId};
    `;

    return { success: true };
}

export async function deleteResource(resourceId: string) {
    const auth = await canModifyResource(resourceId);
    if (!auth.can) {
        throw new Error(auth.error);
    }

    await sql`
        DELETE FROM resources WHERE id = ${resourceId};
    `;

    return { success: true };
}
