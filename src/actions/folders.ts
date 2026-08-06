"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createFolder(name: string, color: string = "blue") {
  const folder = await db.folder.create({
    data: { name, color },
  });
  revalidatePath("/dashboard");
  return { id: folder.id, name: folder.name, color: folder.color };
}

export async function deleteFolder(id: string) {
  await db.summary.updateMany({
    where: { folderId: id },
    data: { folderId: null },
  });
  await db.folder.delete({ where: { id } });
  revalidatePath("/dashboard");
}

export async function assignToFolder(summaryId: string, folderId: string | null) {
  await db.summary.update({
    where: { id: summaryId },
    data: { folderId },
  });
  revalidatePath("/dashboard");
}

export async function getAllFolders() {
  return db.folder.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { summaries: true } } },
  });
}
