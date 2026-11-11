import { Router } from "express";
import { getPage, navigate } from "../controllers/browser.controller";

const router = Router();

router.get("/page", getPage);
router.post("/navigate", navigate);

export default router;
