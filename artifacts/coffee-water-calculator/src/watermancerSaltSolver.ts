import { IONS, type IonId, type SaltInfo } from './waterData';

export type CoupledSaltCandidate = {
  saltTargets: Record<string, number>;
  activeSaltIds: string[];
  score: number;
};

type SolveCoupledSaltTargetsInput = {
  allowedSalts: SaltInfo[];
  fixedIonTotals: Partial<Record<IonId, number>>;
  targetIons: Partial<Record<IonId, number>>;
  ionWeights: Partial<Record<IonId, number>>;
  scoreCandidate: (saltTargets: Record<string, number>) => number;
  minimumDosePpmFor?: (saltId: string) => number;
  maxDosePpm?: number;
};

const SOLVER_EPSILON = 1e-8;
const PIVOT_EPSILON = 1e-10;
const SCORE_EPSILON = 1e-7;

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
  const size = vector.length;
  if (size === 0) return [];

  const augmented = matrix.map((row, rowIndex) => [...row, vector[rowIndex]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
        pivot = row;
      }
    }
    if (Math.abs(augmented[pivot][column]) < PIVOT_EPSILON) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];

    const divisor = augmented[column][column];
    for (let index = column; index <= size; index += 1) {
      augmented[column][index] /= divisor;
    }
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      if (Math.abs(factor) < PIVOT_EPSILON) continue;
      for (let index = column; index <= size; index += 1) {
        augmented[row][index] -= factor * augmented[column][index];
      }
    }
  }
  return augmented.map(row => row[size]);
}

function createZeroTargets(allowedSalts: SaltInfo[]): Record<string, number> {
  return Object.fromEntries(allowedSalts.map(salt => [salt.id, 0]));
}

function activeIdsForTargets(
  saltTargets: Record<string, number>,
  allowedSalts: SaltInfo[],
): string[] {
  return allowedSalts
    .filter(salt => (saltTargets[salt.id] ?? 0) > SOLVER_EPSILON)
    .map(salt => salt.id);
}

/**
 * Enumerates feasible active salt sets and solves their coupled ion system.
 *
 * The caller owns the chemistry-aware objective. This module owns the
 * numerical candidate generation, non-negative active-set boundary, and
 * deterministic tie-breaking.
 */
export function solveBoundedCoupledSaltTargets({
  allowedSalts,
  fixedIonTotals,
  targetIons,
  ionWeights,
  scoreCandidate,
  minimumDosePpmFor = () => 0,
  maxDosePpm = 5000,
}: SolveCoupledSaltTargetsInput): CoupledSaltCandidate | null {
  if (allowedSalts.length > 15) return null;

  const columns = allowedSalts.map(salt => IONS.map(ion => (
    salt.ions.find(item => item.ionId === ion.id)?.fraction ?? 0
  )));
  const weights = IONS.map(ion => {
    const weight = Number(ionWeights[ion.id] ?? 1);
    return Number.isFinite(weight) && weight > 0 ? weight : 1;
  });
  const targetVector = IONS.map(ion => (
    (targetIons[ion.id] ?? 0) - (fixedIonTotals[ion.id] ?? 0)
  ));

  let best: CoupledSaltCandidate | null = null;
  const consider = (saltTargets: Record<string, number>, mask: number): void => {
    const normalized = Object.fromEntries(
      allowedSalts.map((salt, index) => {
        const raw = Number(saltTargets[salt.id] ?? 0);
        if (!Number.isFinite(raw) || raw <= SOLVER_EPSILON) return [salt.id, 0];
        const minimum = Math.max(0, Number(minimumDosePpmFor(salt.id)) || 0);
        return [salt.id, Number(Math.min(maxDosePpm, Math.max(raw, minimum)).toFixed(6))];
      }),
    ) as Record<string, number>;
    const score = scoreCandidate(normalized);
    if (!Number.isFinite(score)) return;

    const candidate: CoupledSaltCandidate = {
      saltTargets: normalized,
      activeSaltIds: activeIdsForTargets(normalized, allowedSalts),
      score,
    };
    if (
      !best
      || score < best.score - SCORE_EPSILON
      || (
        Math.abs(score - best.score) <= SCORE_EPSILON
        && (
          candidate.activeSaltIds.length < best.activeSaltIds.length
          || (
            candidate.activeSaltIds.length === best.activeSaltIds.length
            && mask < allowedSalts.reduce(
              (value, salt, index) => value + (best!.saltTargets[salt.id] > SOLVER_EPSILON ? (1 << index) : 0),
              0,
            )
          )
        )
      )
    ) {
      best = candidate;
    }
  };

  for (let mask = 0; mask < (1 << allowedSalts.length); mask += 1) {
    const activeIndexes = allowedSalts
      .map((_, index) => index)
      .filter(index => (mask & (1 << index)) !== 0);
    const candidateTargets = createZeroTargets(allowedSalts);

    if (activeIndexes.length > 0) {
      const normal = activeIndexes.map(leftIndex => activeIndexes.map(rightIndex => (
        columns[leftIndex].reduce(
          (sum, value, ionIndex) => (
            sum + weights[ionIndex] * value * columns[rightIndex][ionIndex]
          ),
          0,
        )
      )));
      const rhs = activeIndexes.map(leftIndex => columns[leftIndex].reduce(
        (sum, value, ionIndex) => sum + weights[ionIndex] * value * targetVector[ionIndex],
        0,
      ));

      // A tiny ridge makes rank-deficient active sets deterministic without
      // materially changing the least-squares answer.
      normal.forEach((row, index) => { row[index] += 1e-9; });
      const solution = solveLinearSystem(normal, rhs);
      if (!solution || solution.some(value => !Number.isFinite(value) || value < -SOLVER_EPSILON || value > maxDosePpm)) {
        continue;
      }
      activeIndexes.forEach((saltIndex, index) => {
        candidateTargets[allowedSalts[saltIndex].id] = Math.max(solution[index], 0);
      });
    }

    // A solution below a practical dose competes against the omitted-salt
    // candidate through the shared score; it is not forced into the recipe.
    consider(candidateTargets, mask);
  }

  return best;
}