import { motion } from 'framer-motion';
import { AppScreen } from '../AppScreen';

export function Scene5() {
  return <motion.div className="scene" initial={{ opacity: 0, x: '.7vw' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '-.45vw' }} transition={{ duration: .7, ease: [0.16, 1, 0.3, 1] }}><AppScreen view="concentrate" /></motion.div>;
}