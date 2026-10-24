import { createFileRoute } from "@tanstack/react-router";
import { PrototypeWorkbench } from "@/components/aeriday/PrototypeWorkbench";

const title = "Asthma Helper — Interactive Personal Change Demo";
const description =
  "Explore a 35-day synthetic Cambridge timeline, edit example records, view simulated Swift-engine changes and print a doctor-visit summary. No real health or location data.";

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
