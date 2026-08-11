// The fixed certification scale from PRD §13 / database-design.md §6. Deliberately hardcoded, not
// a DB-editable lookup table — the PRD is explicit that this scale "must not be editable outside
// an approved change process."
export interface CertificationBand {
  mark: 'A' | 'B' | 'C' | 'D' | 'E';
  gpa: number;
  performanceDescription: string;
  outcome: 'certified' | 'repeat_module';
}

// PRD's table starts at 50; anything below 50 is treated as the same Unsatisfactory/repeat band
// rather than left undefined — a deliberate extension of the source table, not a deviation from it.
export function applyCertificationScale(totalScore: number): CertificationBand {
  if (totalScore >= 90) return { mark: 'A', gpa: 4, performanceDescription: 'Excellent', outcome: 'certified' };
  if (totalScore >= 80) return { mark: 'B', gpa: 3, performanceDescription: 'Very Good', outcome: 'certified' };
  if (totalScore >= 70) return { mark: 'C', gpa: 2, performanceDescription: 'Good', outcome: 'certified' };
  if (totalScore >= 60) return { mark: 'D', gpa: 1, performanceDescription: 'Satisfactory', outcome: 'certified' };
  return { mark: 'E', gpa: 0, performanceDescription: 'Unsatisfactory', outcome: 'repeat_module' };
}
