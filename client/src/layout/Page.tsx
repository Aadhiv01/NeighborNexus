import { useEffect, type ReactNode } from "react";
import { motion } from "motion/react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · NeighborNexus`;
  }, [title]);
}

/** Standard page container with a title for the browser tab and a soft entrance. */
export default function Page({
  title, children, wide = false,
}: { title: string; children: ReactNode; wide?: boolean }) {
  usePageTitle(title);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`mx-auto w-full px-5 py-10 ${wide ? "max-w-[1240px]" : "max-w-[1240px]"}`}
    >
      {children}
    </motion.div>
  );
}
