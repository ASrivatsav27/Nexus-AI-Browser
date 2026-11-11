import type { NextFunction, Request, Response } from "express";
import { getActivePage, navigateTo } from "../services/browser.service";

export async function getPage(_req: Request, res: Response, next: NextFunction) {
  try {
    const page = await getActivePage();
    res.json({ url: page.url(), title: await page.title() });
  } catch (error) {
    next(error);
  }
}

export async function navigate(req: Request, res: Response, next: NextFunction) {
  const inputUrl: unknown = req.body?.url;
  if (typeof inputUrl !== "string") {
    res.status(400).json({ error: "url must be a string" });
    return;
  }

  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch {
    res.status(400).json({ error: "url must be an absolute URL" });
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    res.status(400).json({ error: "only http and https URLs are allowed" });
    return;
  }

  try {
    const page = await navigateTo(url.toString());
    res.json({ url: page.url(), title: await page.title() });
  } catch (error) {
    next(error);
  }
}
