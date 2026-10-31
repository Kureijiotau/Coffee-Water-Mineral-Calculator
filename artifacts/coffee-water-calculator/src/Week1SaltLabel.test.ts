import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Week1SaltLabel } from './Week1SaltLabel';
import { getSaltColorTokens, ION_MAP, SALTS } from './waterData';

describe('R. Asami guide salt labels', () => {
  for (const id of ['mgso4', 'mgcl2', 'cacl2', 'nahco3', 'khco3', 'nacl']) {
    it(`uses the shared name and ion palette for ${id}`, () => {
      const salt = SALTS.find(item => item.id === id)!;
      const html = renderToStaticMarkup(createElement(Week1SaltLabel, { saltId: id }));
      expect(html).toContain(salt.name);
      expect(html).toContain(`color:${getSaltColorTokens(salt).primary}`);
      for (const { ionId } of salt.ions) {
        expect(html).toContain(ION_MAP[ionId].formula);
        expect(html).toContain(`color:${ION_MAP[ionId].color.foreground}`);
      }
    });
  }
});
