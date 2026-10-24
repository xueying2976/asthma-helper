import { createFileRoute } from "@tanstack/react-router";
import { PrototypeWorkbench } from "@/components/aeriday/PrototypeWorkbench";

const title = "AeriDay — Today, Trends & History Prototype";
const description =
  "Explore AeriDay’s automatic-data dashboard, personal Trends and optional History entries in English or Chinese. Synthetic demo data only.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <PrototypeWorkbench />;
}
