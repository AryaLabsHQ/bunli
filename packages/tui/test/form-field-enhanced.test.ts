import { describe, expect, test } from "bun:test";

describe("@bunli/tui form-field enhanced", () => {
  test("FormFieldProps includes new props", () => {
    const props: import("../src/components/form-field.js").FormFieldProps = {
      label: "Name",
      name: "name",
      prompt: "> ",
      charLimit: 100,
      showCharCount: true,
      width: 40,
    };
    expect(props.prompt).toBe("> ");
    expect(props.charLimit).toBe(100);
    expect(props.showCharCount).toBe(true);
    expect(props.width).toBe(40);
  });

  test("existing props still work", () => {
    const props: import("../src/components/form-field.js").FormFieldProps = {
      label: "Email",
      name: "email",
      placeholder: "user@example.com",
      required: true,
      description: "Enter your email",
    };
    expect(props.label).toBe("Email");
    expect(props.required).toBe(true);
  });
});
