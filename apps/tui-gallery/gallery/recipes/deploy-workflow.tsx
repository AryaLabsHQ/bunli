import { Form, Input, KeyValueList, Stack } from "@bunli/tui/interactive";
import { useState } from "react";
import { z } from "zod";

import type { GalleryRenderContext } from "../model.js";

const deploymentSchema = z.object({
  app: z.string().min(2, "App name is required"),
  region: z.enum(["iad", "bom", "fra"]),
  confirm: z.coerce.boolean(),
});

export function DeployWorkflowRecipe({ focusToken, previewWidth, stateKey }: GalleryRenderContext) {
  const [status, setStatus] = useState("Configure the deployment recipe and submit the form.");

  const initialValues: Partial<z.infer<typeof deploymentSchema>> =
    stateKey === "production"
      ? { app: "bunli-docs", region: "iad", confirm: true }
      : { app: "bunli-preview", region: "bom", confirm: false };

  return (
    <Stack gap={1}>
      <Form
        title="Deploy Workflow"
        scopeId={`gallery:recipe:form:${focusToken}`}
        schema={deploymentSchema}
        initialValues={initialValues}
        submitHint="Enter/Ctrl+S submit"
        resetHint="Ctrl+R reset"
        onSubmit={(values) => {
          setStatus(
            `Prepared ${values.app} for ${values.region}${values.confirm ? " with confirmation" : ""}.`,
          );
        }}
        onValidationError={() => {
          setStatus("Validation error. Confirm the app name and select a region.");
        }}
        onCancel={() => {
          setStatus("Cancelled deploy workflow.");
        }}
      >
        <Input
          name="app"
          label="Application"
          required
          placeholder="bunli-preview"
          description="Which app should this workflow operate on?"
        />
        <Input
          name="region"
          label="Region"
          required
          placeholder="iad"
          description="Use iad, bom, or fra in this simplified workflow."
        />
        <Input
          name="confirm"
          label="Confirm"
          required
          placeholder="true"
          description="Boolean-compatible input to simulate a guardrail."
        />
      </Form>
      <KeyValueList
        items={[
          { key: "status", value: status },
          { key: "profile", value: stateKey },
        ]}
        maxLineWidth={Math.max(36, previewWidth - 6)}
        fillWidth
      />
    </Stack>
  );
}
