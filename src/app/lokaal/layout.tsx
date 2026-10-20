import { Hero } from "@/components/ui";
import { vereisSetup } from "@/lib/vereist";
import { LokaalTabs } from "./LokaalTabs";

export default async function LokaalLayout({ children }: LayoutProps<"/lokaal">) {
  await vereisSetup();
  return (
    <>
      <Hero nummer="VII" label="Lokaal" title="Lokaal" lines={["Hoe staan je Google Bedrijfsprofielen ervoor, en wat levert het meeste op?"]} />
      <LokaalTabs />
      {children}
    </>
  );
}
