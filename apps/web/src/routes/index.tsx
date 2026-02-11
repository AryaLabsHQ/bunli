import { createFileRoute } from "@tanstack/react-router";
import { WorkbenchPage } from "../components/workbench/workbench-page";

export const Route = createFileRoute("/")({
  ssr: false,
  component: WorkbenchPage,
});
