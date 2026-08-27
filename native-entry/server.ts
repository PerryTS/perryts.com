// Keep the Perry entry point outside the project root so a preceding Next.js
// static build does not make Perry mistake this small Fastify server for a
// Next.js standalone server and recursively compile `.next/server`.
import "../server.ts";
