import { Router, Request, Response } from "express";

const router = Router();

// GET /api/example
router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Example route works!" });
});

export default router;
