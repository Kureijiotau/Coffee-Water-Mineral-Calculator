import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scanLabelRouter from "./scan-label";
import scanRecipeCardRouter from "./scan-recipe-card";
import watersRouter from "./waters";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scanLabelRouter);
router.use(scanRecipeCardRouter);
router.use(watersRouter);

export default router;
