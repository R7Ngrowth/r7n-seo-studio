import { profielen } from "@/lib/opslag";
import { ProfielenView } from "./ProfielenView";

export default async function Profielen() {
  return <ProfielenView begin={await profielen()} />;
}
