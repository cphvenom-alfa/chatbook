import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/server/better-auth/config";
import { headers } from "next/headers";

const f = createUploadthing();

export const ourFileRouter = {
  chatFile: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
    pdf:   { maxFileSize: "16MB", maxFileCount: 1 },
    "application/msword":       { maxFileSize: "16MB" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "16MB" },
    "text/plain": { maxFileSize: "1MB" },
  })
    .middleware(async () => {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => ({ url: file.url, name: file.name, size: file.size, type: file.type })),

  userAvatar: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => ({ url: file.url })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

