export function logWorkbenchEvent(event: string, payload: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      category: "workbench",
      event,
      ...payload,
    })
  );
}
