import content from "../../OS-CONCEPT-ARCHITECTURE.md?raw";

export async function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8"
    }
  });
}
