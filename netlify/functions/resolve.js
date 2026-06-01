import fs from "node:fs";
import { resolveAccountability } from "../../assets/resolve-core.js";

const dataPath = new URL("../../data/accountability.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { description = "", location = "" } = await req.json();
    if (!description.trim() || !location.trim()) {
      return Response.json({ error: "Description and location are required." }, { status: 400 });
    }

    return Response.json(resolveAccountability(data, description, location), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return Response.json({ error: "Could not resolve accountability." }, { status: 500 });
  }
};

export const config = {
  path: "/api/resolve",
  method: ["POST"]
};
