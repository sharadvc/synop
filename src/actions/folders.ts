"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { currentUserId, userScope } from "@/lib/user";

export async function createFolder(name: string, color: string = "blue") {
  const folder = await db.folder.create({
    data: { name, color, userId: await currentUserId() },
  });
  revalidatePath("/dashboard");
  return { id: folder.id, name: folder.name, color: folder.color };
}

export async function deleteFolder(id: string) {
  const uid = await currentUserId();
  await db.summary.updateMany({
    where: { folderId: id, ...(await userScope(uid)) },
    data: { folderId: null },
  });
  await db.folder.delete({ where: { id, ...(await userScope(uid)) } });
  revalidatePath("/dashboard");
}

export async function assignToFolder(summaryId: string, folderId: string | null) {
  const uid = await currentUserId();
  await db.summary.update({
    where: { id: summaryId, ...(await userScope(uid)) },
    data: { folderId },
  });
  revalidatePath("/dashboard");
}

export async function getAllFolders() {
  return db.folder.findMany({
    where: await userScope(),
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { summaries: true } } },
  });
}
