import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scanLabelRouter from "./scan-label";
import watersRouter from "./waters";
import waterAssistantRouter from "./water-assistant";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scanLabelRouter);
router.use(watersRouter);
router.use(waterAssistantRouter);

export default router;
