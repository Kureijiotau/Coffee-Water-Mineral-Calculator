import { motion } from 'framer-motion';
import { AppScreen } from '../AppScreen';

export function Scene1() {
  return <motion.div className="scene" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .99 }} transition={{ duration: .8, ease: [0.16, 1, 0.3, 1] }}><AppScreen view="intro" /></motion.div>;
}