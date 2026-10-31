import { getSaltColorTokens, ION_MAP, SALTS } from './waterData';

export function Week1SaltLabel({ saltId }: { saltId: string }) {
  const salt = SALTS.find(item => item.id === saltId);
  if (!salt) return null;
  const colors = getSaltColorTokens(salt);
  return (
    <>
      <strong style={{ color: colors.primary }}>{salt.name}</strong>
      <span aria-label={`Ions in ${salt.name}`}>
        {salt.ions.map(({ ionId }, index) => (
          <span key={ionId} style={{ display: 'inline', color: ION_MAP[ionId].color.foreground }}>
            {index > 0 ? ' + ' : ''}{ION_MAP[ionId].formula}
          </span>
        ))}
      </span>
    </>
  );
}
