// Type declarations for text file imports with { type: "text" }
declare module "*.template" {
  const content: string
  export default content
}
