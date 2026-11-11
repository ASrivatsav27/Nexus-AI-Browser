import { Router } from "express";
import { runAgent } from "../controllers/agent.controller";

const router = Router();

router.post("/run", runAgent);

export default router;
